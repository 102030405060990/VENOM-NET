'use strict';

(function setupVenomAssistant() {
    function addMessage(list, text, role) {
        const item = document.createElement('div');
        item.className = `venom-assistant-message ${role}`;
        item.textContent = text;
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    }

    async function getLibraryContext(message) {
        const currentPage = window.current || {};
        const context = [`الصفحة الحالية: ${currentPage.title || 'الرئيسية'}`];
        if (currentPage.path) context.push(`المسار: ${currentPage.path}`);
        if (/بحث|ابحث|دور|موجود/.test(message)) {
            try {
                const result = await apiRequest('/api/search', { query: message, maxResults: 10 }, { timeout: 12000 });
                if (result?.results?.length) {
                    context.push('نتائج البحث في المكتبة:');
                    context.push(result.results.map(item => item.name || item.title).join('، '));
                }
            } catch (_) {}
        }
        return context.join('\n');
    }

    async function runLocalAction(message) {
        const searchMatch = message.match(/^(?:ابحث|بحث|دور)\s*(?:عن)?\s+(.+)/i);
        if (searchMatch && typeof window.searchAllDisks === 'function') {
            const query = searchMatch[1].trim();
            const results = await window.searchAllDisks(query);
            return `تم البحث عن «${query}» ووجدت ${results.length} نتيجة في المكتبة.`;
        }
        if (/^(?:افتح|اعرض|اذهب إلى|اذهب الى)\s*(?:الرئيسية|الصفحة الرئيسية)$/i.test(message)) {
            if (typeof window.home === 'function') await window.home();
            return 'تم فتح الصفحة الرئيسية.';
        }
        return null;
    }

    function createAssistant() {
        const toggle = document.createElement('button');
        toggle.className = 'venom-assistant-toggle';
        toggle.type = 'button';
        toggle.title = 'مساعد Gemini';
        toggle.setAttribute('aria-label', 'فتح مساعد Gemini');
        toggle.textContent = '✦';

        const panel = document.createElement('section');
        panel.className = 'venom-assistant-panel';
        panel.innerHTML = `
            <div class="venom-assistant-head">
                <div><strong>مساعد VENOM NET</strong><small>Gemini AI</small></div>
                <button type="button" class="venom-assistant-close" aria-label="إغلاق">×</button>
            </div>
            <div class="venom-assistant-messages" aria-live="polite"></div>
            <form class="venom-assistant-form">
                <input type="text" maxlength="1000" placeholder="اسأل عن فيلم أو ابحث في المكتبة..." aria-label="رسالة المساعد" autocomplete="off">
                <button type="submit" aria-label="إرسال">إرسال</button>
            </form>
        `;
        document.body.append(toggle, panel);

        const messages = panel.querySelector('.venom-assistant-messages');
        const form = panel.querySelector('.venom-assistant-form');
        const input = form.querySelector('input');
        addMessage(messages, 'مرحبًا، اسألني عن أي فيلم أو مسلسل أو اطلب البحث داخل المكتبة.', 'assistant');

        toggle.addEventListener('click', () => {
            panel.classList.toggle('open');
            if (panel.classList.contains('open')) input.focus();
        });
        panel.querySelector('.venom-assistant-close').addEventListener('click', () => panel.classList.remove('open'));
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const message = input.value.trim();
            if (!message) return;
            input.value = '';
            input.disabled = true;
            addMessage(messages, message, 'user');
            addMessage(messages, 'جاري التفكير...', 'assistant pending');
            const pending = messages.lastElementChild;
            try {
                const localAnswer = await runLocalAction(message);
                if (localAnswer) {
                    pending.remove();
                    addMessage(messages, localAnswer, 'assistant');
                    return;
                }
                const apiKey = localStorage.getItem('venom_metadata_key_gemini') || '';
                const currentTitle = window.current?.title || '';
                const detailsRequest = /تفاصيل|تفصيل|معلومات|قصة|عن الفيلم|عن المسلسل/.test(message);
                const assistantMessage = detailsRequest && currentTitle
                    ? `${message}\nاسم العمل المطلوب: ${currentTitle}\nقدّم التفاصيل المعروفة عنه مباشرة بالعربية، مع التنبيه إذا كانت المعلومة غير مؤكدة.`
                    : message;
                const result = await apiRequest('/api/ai/chat', {
                    provider: 'gemini',
                    model: 'gemini-3.6-flash',
                    apiKey,
                    message: assistantMessage,
                    context: await getLibraryContext(message)
                }, { timeout: 60000 });
                pending.remove();
                addMessage(messages, result.answer || 'لم تصل إجابة من Gemini.', 'assistant');
            } catch (error) {
                pending.textContent = error.message || 'تعذر الاتصال بالمساعد.';
                pending.classList.add('error');
            } finally {
                input.disabled = false;
                input.focus();
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createAssistant);
    else createAssistant();
})();