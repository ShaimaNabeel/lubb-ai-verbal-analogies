 // DOM Elements
 const answerOptions = document.querySelector(".answer-options");
 const nextQuestionBtn = document.querySelector(".next-question-btn");
 const currentQuestionNum = document.querySelector(".current-question");
 const totalQuestionNum = document.querySelector(".total-questions");
 const timerDisplay = document.querySelector(".timer-duration");
 const questionText = document.querySelector(".question-text");
 const questionStatus = document.querySelector(".question-status");

 const body = document.querySelector("body");
 const sidebar = document.querySelector(".sidebar");
 const modeSwitch = document.querySelector(".toggle-switch");
 const modeText = document.querySelector(".mode-text");


 // Quiz State
 let selectedDifficulty = "easy";
 let selectedTime = 60;
 let totalQuestions = 5;
 let currentQuestionIndex = 0;
 let score = 0;
 let timerInterval = null;
 let answerSelected = false;
 let currentQuestions = [];
 let previousQuestions = [];

 // API Config
 const DEEPSEEK_API_KEY = "sk-c0ea48210bc1401abcff35336a53a5a0";

 // Loading Screen Elements
 const loadingOverlay = document.getElementById("loadingOverlay");
 const difficultyLabel = document.getElementById("difficultyLabel");
 const questionCountLabel = document.getElementById("questionCountLabel");
 const loadingBar = document.getElementById("loadingBar");

 // Quiz State
 let quizAttempt = 1;
 let gameState = { difficulty: "easy", totalQuestions: 5 };

 
// ------ إعداد الوضع الليلي ------
 modeSwitch.addEventListener("click", () => {
     const isDarkMode = body.classList.toggle("dark");
     if (isDarkMode) {

     modeText.innerText = "Light Mode";
     } else {
         modeText.innerText = "Dark Mode";
     }

     // حفظ الحالة في Local Storage
     localStorage.setItem('darkMode', isDarkMode);
 });

 // ------ إغلاق/فتح السايدبار ------
 sidebar.addEventListener("click", () => {
     sidebar.classList.toggle("close");
     body.classList.toggle("sidebar-collapsed");
 });
 // Event Listeners
 document.querySelectorAll('.category-option').forEach(option => {
     option.addEventListener('click', () => {
         document.querySelectorAll('.category-option').forEach(o => o.classList.remove('active'));
         option.classList.add('active');
         selectedDifficulty = option.dataset.difficulty;
         selectedTime = parseInt(option.dataset.time);
         gameState = {
             difficulty: selectedDifficulty,
             totalQuestions: gameState.totalQuestions,
             time: selectedTime // ← إضافة الوقت إلى gameState
         };
     });
 });

 document.querySelectorAll('.question-option').forEach(option => {
     option.addEventListener('click', () => {
         document.querySelectorAll('.question-option').forEach(o => o.classList.remove('active'));
         option.classList.add('active');
         totalQuestions = parseInt(option.textContent);
         gameState.totalQuestions = totalQuestions;
     });
 });

 document.querySelector(".start-quiz-btn").addEventListener('click', startQuiz);
 document.querySelector(".try-again-btn").addEventListener('click', () => {
     quizAttempt++;
     resetQuiz();
 });

 nextQuestionBtn.addEventListener('click', nextQuestionHandler);

 // Core Functions
 function generatePrompt(difficulty, numQuestions, attempt = 1) {
     let prompt = `Generate ${numQuestions} unique verbal analogy questions in JSON format. `;
     const examples = {
         easy: "e.g., 'rainbow: colors' or 'clock: time'",
         medium: "e.g., 'map: territory' or 'menu: restaurant'",
         hard: "e.g., 'metaphor: poetry' or 'algorithm: problem'"
     };
     prompt += `Create NEW relationships that are NOT the same as the examples above. `;
     prompt += `Ensure that none of the generated questions match the examples provided. Use your own knowledge to create fresh and diverse analogies. `;
     prompt += `Attempt number: ${attempt}. `;
     prompt += `
     Required format:
     [
         {
             "question": ["word1", "word2"],
             "options": [
                 ["option1_word1", "option1_word2"],
                 ["option2_word1", "option2_word2"],
                 ["option3_word1", "option3_word2"],
                 ["option4_word1", "option4_word2"]
             ],
             "correctIndex": 0
         }
     ]
     Return ONLY the JSON array with no additional explanations.`;
     return prompt;
 }

 async function fetchDeepSeek(prompt, temperature = 0.9) {
     
         const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
             },
             body: JSON.stringify({
                 model: "deepseek-chat",
                 messages: [{ role: "user", content: prompt }],
                 temperature,
                 max_tokens: 2000
             })
         });
         const data = await response.json();
         const rawJson = data.choices[0].message.content.trim();
         return JSON.parse(rawJson);
     
 }

 function filterUniqueQuestions(questions) {
     const seen = new Set();
     return questions.filter(q => {
         const key = q.question.join(":");
         if (seen.has(key)) return false;
         seen.add(key);
         return true;
     });
 }

 function showLoadingScreen() {
     const loadingContent = `
         <div class="loading-spinner"></div>
         <div class="loading-text">
             Preparing your ${gameState.difficulty} level quiz...<br>
             <small>Generating ${gameState.totalQuestions} unique questions</small>
         </div>
         <div class="loading-progress">
             <div class="loading-progress-bar"></div>
         </div>
     `;
     
     loadingOverlay.innerHTML = loadingContent;
     document.body.appendChild(loadingOverlay);
     loadingOverlay.style.display = 'flex';
 }

 function hideLoadingScreen() {
     loadingOverlay.style.display = 'none';
 }

 function simulateLoadingProgress() {
     const progressBar = loadingOverlay.querySelector('.loading-progress-bar');
     let progress = 0;
     
     const interval = setInterval(() => {
         progress += Math.random() * 15;
         progressBar.style.width = Math.min(progress, 90) + '%';
         
         if (progress >= 90) {
             clearInterval(interval);
         }
     }, 500);
 }

 async function startQuiz() {
 // ← إفراغ المصفوفة عند بدء محاولة جديدة
 previousQuestions = [];

 // تحديث gameState
 gameState.difficulty = document.querySelector('.category-option.active').dataset.difficulty;
 gameState.totalQuestions = parseInt(document.querySelector('.question-option.active').textContent);

 // إظهار شاشة التحميل
 showLoadingScreen();
 simulateLoadingProgress();

 // إخفاء شاشة الإعدادات وعرض شاشة الاختبار
 document.querySelector(".config-popup").classList.remove("active");
 document.querySelector(".quiz-popup").classList.add("active");

 // إنشاء الـ Prompt
 const prompt = generatePrompt(
     gameState.difficulty,
     gameState.totalQuestions,
     quizAttempt
 );

 try {
     currentQuestions = await fetchDeepSeek(prompt);
     
     if (!currentQuestions.length) {
         alert("لم يتم العثور على أسئلة، يرجى المحاولة مرة أخرى.");
         return;
     }

     // تصفية الأسئلة المكررة
     currentQuestions = filterUniqueQuestions(currentQuestions);
     
     // تحديث قائمة الأسئلة السابقة
     previousQuestions = [...previousQuestions, ...currentQuestions];

     // بدء الاختبار
     currentQuestionIndex = 0;
     score = 0;
     showQuestion();

 } finally {
     // إخفاء شاشة التحميل بعد الانتهاء
     hideLoadingScreen();
 }
}

 function showQuestion() {
     const question = currentQuestions[currentQuestionIndex];
     currentQuestionNum.textContent = currentQuestionIndex + 1;
     totalQuestionNum.textContent = currentQuestions.length;
     questionText.textContent = `${question.question[0]} : ${question.question[1]} :: ؟`;
     questionStatus.innerHTML = `Question <span class="current-question">${currentQuestionIndex + 1}</span> of <span class="total-questions">${currentQuestions.length}</span>`;

     answerOptions.innerHTML = '';
     question.options.forEach((option, index) => {
         const li = document.createElement('li');
         li.className = 'answer-option';
         li.textContent = `${option[0]} : ${option[1]}`;
         li.onclick = () => handleAnswer(li, index, question.correctIndex);
         answerOptions.appendChild(li);
     });

     startTimer();
 }

 function handleAnswer(element, selectedIndex, correctIndex) {
     if (answerSelected) return;
     answerSelected = true;
     element.classList.add(selectedIndex === correctIndex ? 'correct' : 'incorrect');
     if (selectedIndex === correctIndex) score++;
     document.querySelectorAll('.answer-option').forEach(opt => opt.style.pointerEvents = 'none');
     setTimeout(nextQuestionHandler, 500);
     clearInterval(timerInterval);
 }

 function startTimer() {
 timeLeft = selectedTime; // ← هنا
 answerSelected = false;
 nextQuestionBtn.disabled = true;
 timerInterval = setInterval(() => {
     timeLeft--;
     timerDisplay.textContent = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
     if (timeLeft <= 0) {
         clearInterval(timerInterval);
         document.querySelectorAll('.answer-option').forEach(opt => opt.style.pointerEvents = 'none');
         nextQuestionBtn.disabled = false;
     }
 });
}

 function nextQuestionHandler() {
     currentQuestionIndex++;
     currentQuestionIndex < currentQuestions.length ? showQuestion() : showResults();
 }

 function showResults() {
     document.querySelector(".quiz-popup").classList.remove("active");
     document.querySelector(".result-popup").classList.add("active");
     const percentage = (score / currentQuestions.length) * 100;
     document.querySelector(".result-message").innerHTML = `
         <h2>${percentage >= 50 ? "Good job!" : "Try again!"}</h2>
         <p>Correct Answers: ${score} of ${currentQuestions.length}</p>
     `;
 }

 function resetQuiz() {
     document.querySelector(".result-popup").classList.remove("active");
     document.querySelector(".config-popup").classList.add("active");
     currentQuestions = [];
 }