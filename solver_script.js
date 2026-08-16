document.addEventListener('DOMContentLoaded', function() {
    // ------ العناصر الأساسية ------
    const body = document.querySelector("body");
    const sidebar = document.querySelector(".sidebar");
    const modeSwitch = document.querySelector(".toggle-switch");
    const modeText = document.querySelector(".mode-text");
    const questionInput = document.getElementById('analogy-question');
    const optionsInput = document.getElementById('options');
    const sendBtn = document.querySelector('.cta');
    const resultDiv = document.getElementById('result');
    const DEEPSEEK_API_KEY = "sk-c0ea48210bc1401abcff35336a53a5a0";
    const button = document.querySelector('.deepseek');
    const optionsContainer = document.querySelector('.model-selector');


        // ------ فتح/إغلاق السايدبار عند النقر عليه ------
        sidebar.addEventListener("click", (e) => {
            // منع الإغلاق إذا كان النقر على عناصر داخلية
            if (!e.target.closest('.menu-links')) {
                sidebar.classList.toggle("close");
                body.classList.toggle("sidebar-collapsed");
                localStorage.setItem('sidebarClosed', sidebar.classList.contains("close"));
            }
            });
    
            // ------ إعداد الوضع الليلي مع تحسينات ------
            modeSwitch.addEventListener("click", () => {
            body.classList.toggle("dark");
            const isDarkMode = body.classList.contains("dark");
            modeText.innerText = isDarkMode ? "Light Mode" : "Dark Mode";
            localStorage.setItem('darkMode', isDarkMode);
            });
    
           
 // ------ تهيئة الحالة الأولية ------
            document.addEventListener('DOMContentLoaded', () => {
                // استعادة حالة السايدبار
                if (localStorage.getItem('sidebarClosed') === 'true') {
                    sidebar.classList.add("close");
                    body.classList.add("sidebar-collapsed");
                }

                // استعادة الوضع الليلي
                if (localStorage.getItem('darkMode') === 'true') {
                    body.classList.add("dark");
                    modeText.innerText = "Light Mode";
                };
            });



    // ------ معالجة الإرسال ------
    sendBtn.addEventListener('click', handleAnalogyRequest);

    // ------ التنقل بين الحقول بالإدخال ------
    const inputs = [questionInput, optionsInput];
    let currentIndex = 0;
    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (index === 0) {
                    e.preventDefault();
                    const nextInput = inputs[(index + 1) % inputs.length];
                    nextInput.focus();
                    nextInput.setSelectionRange(0, 0);
                    nextInput.scrollTop = 0;
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (index + 1) % inputs.length;
                inputs[currentIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (index - 1 + inputs.length) % inputs.length;
                inputs[currentIndex].focus();
            }
        });
    });

    // ------ الوظائف الأساسية ------
    async function handleAnalogyRequest() {
        if (!validateInputs()) return;

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
        resultDiv.innerHTML = '<div class="loading">Processing...</div>';

        try {
            const response = await fetchDeepSeek();
            displayResult(response);
        } catch (error) {
            resultDiv.innerHTML = `<div class="error">${error.message}</div>`;
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="bx bx-send icon"></i>';
        }
    }

    function validateInputs() {
        if (!questionInput.value.trim()) {
            showError('Please enter a question!');
            return false;
        }
        if (!optionsInput.value.trim()) {
            showError('Please provide options!');
            return false;
        }
        return true;
    }

    async function fetchDeepSeek() {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{
                    role: "user",
                    content: generatePrompt()
                }],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) throw new Error('Failed to fetch response');
        return response.json();
    }

    function generatePrompt() {
        return `
                /* Task prompt */ 
                Verbal analogical reasoning involves identifying relationships between words. The task is presented as multiple-choice questions. Each question starts with a pair of words (a:b) that are related in a specific way. You are then given several candidate word pairs (c:d), one of which shares a similar relationship to the initial word pair. Your task is to identify the candidate pair whose relationship most closely mirrors that of the original pair.
                Please follow these steps carefully and think through each one before selecting the answer.

                /* Steps to follow */
                1. Define the relation between the two words in the question pair and each of the candidate pairs.
                2. Measure the relational similarity between the relation that you described for the question and each of the candidate pairs using a confidence score between 0 and 1 (0 indicates no similarity and 1 indicates an identical relationship).
                3. Select the candidate pair that has the highest relational similarity to the question pair. 

                Format the final answer EXACTLY as follows:
                Correct answer: [a single letter A, B, C or D]
                /* Test Data */
                Solve the following question step-by-step.
                Question: 
                ${questionInput.value.trim()}
                Candidates:
                ${optionsInput.value.trim()}`;
    }

    function displayResult(data) {
        const response = data.choices?.[0]?.message?.content;
        resultDiv.innerHTML = `
            <div class="response">
                <pre>${formatText(response)}</pre>
            </div>
        `;
    }

    function formatText(text) {
        return text
            .replace(/Correct answer:/gi, '✅ Correct Answer:')
            .replace(/#/gi, '')
            .replace(/##/gi, '')
            .replace(/###/gi, '')
            .replace(/####/gi, '')
            .replace(/#####/gi, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/✅/g, '✅');
    }

    function showError(message) {
        resultDiv.innerHTML = `<div class="error">⚠️ ${message}</div>`;
    }
});