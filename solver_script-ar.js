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
    const helloImg = document.getElementById("hello");
    
    
        // دالة لتحديث واجهة المستخدم حسب الوضع الحالي
        function updateModeUI() {
            const isDark = body.classList.contains("dark");
            modeText.innerText = isDark ? "الوضع الفاتح" : "الوضع الداكن";
            helloImg.src = isDark ? "hello-lubb-blue.svg" : "hello-lubb.svg"; // تحديث الصورة
        }
    

        // عند الضغط على زر التبديل
        modeSwitch.addEventListener("click", () => {
            body.classList.toggle("dark");
            updateModeUI();
    
            // حفظ حالة الوضع في localStorage
            if (body.classList.contains("dark")) {
                localStorage.setItem("theme", "dark");
            } else {
                localStorage.setItem("theme", "light");
            }
        });
    
    // ------ إغلاق/فتح السايدبار ------
    sidebar.addEventListener("click", () => {
        sidebar.classList.toggle("close");
        body.classList.toggle("sidebar-collapsed");
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
                    // إذا كان الحقل الحالي هو الأول (questionInput)
                    e.preventDefault(); // منع إضافة سطر جديد

                    // نقل التركيز إلى الحقل التالي (optionsInput)
                    const nextInput = inputs[(index + 1) % inputs.length];
                    nextInput.focus();

                    // ضبط المؤشر في بداية النص
                    nextInput.setSelectionRange(0, 0);
                    nextInput.scrollTop = 0;
                } else {
                    // إذا كان الحقل الحالي هو الثاني (optionsInput)
                    // لا نمنع السلوك الافتراضي لإضافة سطر جديد
                    // سيتم إضافة سطر جديد داخل نفس الحقل
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
        resultDiv.innerHTML = '<div class="loading">جاري معالجة السؤال ...</div>';

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
            showError('ادخل السؤال !!');
            return false;
        }
        if (!optionsInput.value.trim()) {
            showError('ادخل الخيارات !!');
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
                /*وصف المهمة*/
                يتضمن الاستدلال بالتناظر اللفظي تحديد العلاقات بين الكلمات. تعرض المهمة كأسئلة اختيار من متعدد. يبدأ كل سؤال بزوج من الكلمات (أ:ب) تربطهما علاقة معينة.  يلي ذلك مجموعة من الأزواج المرشحة (ج:د) ، ويكون أحد هذه الأزواج هو الأكثر تماثلًا مع العلاقة التي تربط الكلمتان بالسؤال.

                مهمتك هي تحديد الزوج المرشح الذي يعكس العلاقة الأقرب لزوج السؤال.

                يرجى اختيار أ ، ب ، ج أو د ، وقم بعرض إجابتك النهائية تماما كما يلي :
                الإجابة الصحيحة : [ حرف واحد فقط أ، ب، ج، أو د ] 

                /*مثال*/
                **السؤال:**
                صيدلية : دواء
                **الخيارات:**
                أ. ورد : عطر
                ب. صوف : رداء
                ج.  قمح : سنبلة
                د. باب: خشب

                الإجابة الصحيحة : أ


                /*سؤال للإختبار*/
                السؤال: 
                ${questionInput.value.trim()}
                الخيارات: 
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
            .replace(/الإجابة الصحيحة: /gi, '✅الإجابة الصحيحة: ')
            .replace(/#/gi, '')
            .replace(/##/gi, '')
            .replace(/###/gi, '')
            .replace(/####/gi, '')
            .replace(/#####/gi, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // تحويل ** إلى علامة strong
            .replace(/✅/g, '✅'); // الحفاظ على الإيموجي
    }

    function showError(message) {
        resultDiv.innerHTML = `<div class="error">⚠️ ${message}</div>`;
    }
});


