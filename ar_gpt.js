document.addEventListener('DOMContentLoaded', function() {
    // ------ Security Warning ------

    // ------ العناصر الأساسية ------
    const body = document.querySelector("body");
    const sidebar = document.querySelector(".sidebar");
    const modeSwitch = document.querySelector(".toggle-switch");
    const modeText = document.querySelector(".mode-text");
    const questionInput = document.getElementById('analogy-question');
    const optionsInput = document.getElementById('options');
    const sendBtn = document.querySelector('.cta');
    const resultDiv = document.getElementById('result');
    const OPENAI_API_KEY = "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";
    
    

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

    // ------ تنقل محسّن بين الحقول ------
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
        resultDiv.innerHTML = '<div class="loading">جاري معالجة السؤال...</div>';

        try {
            const response = await fetchOpenAI();
            displayResult(response);
        } catch (error) {
            resultDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="bx bx-send icon"></i>';
        }
    }

    async function fetchOpenAI() {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: generatePrompt()
                }],
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        
        return response.json();
    }

    function generatePrompt() {
        return `
                /*وصف المهمة*/
                يتضمن الاستدلال بالتناظر اللفظي تحديد العلاقات بين الكلمات. تعرض المهمة كأسئلة اختيار من متعدد. يبدأ كل سؤال بزوج من الكلمات (أ:ب) تربطهما علاقة معينة.  يلي ذلك مجموعة من الأزواج المرشحة (ج:د) ، ويكون أحد هذه الأزواج هو الأكثر تماثلًا مع العلاقة الأصلية.

                مهمتك هي تحديد الزوج المرشح الذي يعكس العلاقة الأقرب لزوج السؤال.

                يرجى اتباع الخطوات التالية بعناية والتفكير جيدا في كل منها قبل اختيار الإجابة الصحيحة.
                /*الخطوات المتبعة*/
                1. حدد العلاقة بين كلمتي زوج السؤال ،ثم حدد العلاقة لكل من الأزواج المرشحة.
                2. قيّم مدى التشابه بين العلاقة الأصلية وعلاقة كل زوج مرشح باستخدام درجة ثقة تتراوح بين 0 و 1 (حيث يشير 0 إلى عدم وجود تشابه، و1 إلى علاقة متطابقة).
                3. اختر الزوج المرشح الذي يمتلك أعلى درجة تشابه مع زوج السؤال.
                4. قم بتنسيق إجابتك النهائية تماما كما يلي: 
                الإجابة الصحيحة : [ حرف واحد فقط أ، ب، ج، أو د ] 

                *سؤال للإختبار*/
                قم بحل السؤال التالي:
                السؤال: 
                ${questionInput.value.trim()}
                الخيارات: 
                ${optionsInput.value.trim()}`;
    }

    function displayResult(data) {
        const content = data.choices?.[0]?.message?.content || 'No response found';
        resultDiv.innerHTML = `
            <div class="response">
                <pre>${formatText(content)}</pre>
            </div>
        `;
    }

    function formatText(text) {
        return text
            .replace(/الإجابة الصحيحة:/gi, '✅الإجابة الصحيحة: ')
            .replace(/#/gi, '')
            .replace(/##/gi, '')
            .replace(/###/gi, '')
            .replace(/####/gi, '')
            .replace(/#####/gi, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\"(.*?)\"/g, '<strong>$1</strong>')  // تحويل ** إلى علامة strong
            .replace(/✅/g, '✅'); // الحفاظ على الإيموجي
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

    function showError(message) {
        resultDiv.innerHTML = `<div class="error">⚠️ ${message}</div>`;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    }
});