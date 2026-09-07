const AI_DEFAULT_SYSTEM_PROMPT = [
    'أنت مساعد VENOM NET العربي، متخصص في مكتبة الأفلام والمسلسلات والرياضة والأنمي.',
    'أجب بالعربية الواضحة والمختصرة. لا تخترع عنوانًا أو معلومة غير موجودة في سياق المكتبة.',
    'عند طلب توصية، اشرح سببًا موجزًا. عند عدم كفاية البيانات، اطلب معلومة محددة.',
    'يمكنك مساعدة المستخدم في البحث واقتراح المشاهدة وتنظيم بيانات المكتبة.'
].join(' ');

function aiEndpoint(provider, endpoint) {
    const base = String(endpoint || (provider === 'ollama'
        ? 'http://127.0.0.1:11434'
        : 'https://api.openai.com')).replace(/\/$/, '');
    return provider === 'ollama' ? `${base}/api/chat` : `${base}/v1/chat/completions`;
}

exports.chat = async ({ provider, model, message, context, apiKey, endpoint }) => {
    const requestedProvider = String(provider || '').toLowerCase();
    const resolvedProvider = ['cloud', 'gemini'].includes(requestedProvider) ? requestedProvider : 'ollama';
    const resolvedModel = String(model || (resolvedProvider === 'ollama' ? 'qwen2.5:3b' : resolvedProvider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini')).trim();
    const trimmedMessage = String(message || '').trim();
    const trimmedContext = String(context || '').trim().slice(0, 12000);
    const resolvedEndpoint = aiEndpoint(resolvedProvider, endpoint);

    if (!trimmedMessage) {
        const error = new Error('اكتب رسالة أولًا.');
        error.statusCode = 400;
        throw error;
    }
    if (['cloud', 'gemini'].includes(resolvedProvider) && !String(apiKey || '').trim()) {
        const error = new Error(`أدخل مفتاح API لـ ${resolvedProvider === 'gemini' ? 'Gemini' : 'المزود السحابي'}.`);
        error.statusCode = 400;
        throw error;
    }

    const prompt = trimmedContext ? `${trimmedMessage}\n\nسياق المكتبة الحالي:\n${trimmedContext}` : trimmedMessage;
    const headers = { 'Content-Type': 'application/json' };
    if (resolvedProvider === 'cloud') headers.Authorization = `Bearer ${String(apiKey).trim()}`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        const requestUrl = resolvedProvider === 'gemini'
            ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent?key=${encodeURIComponent(String(apiKey).trim())}`
            : resolvedEndpoint;
        const requestBody = resolvedProvider === 'gemini'
            ? { contents: [{ parts: [{ text: `${AI_DEFAULT_SYSTEM_PROMPT}\n\n${prompt}` }] }], generationConfig: { temperature: 0.4 } }
            : resolvedProvider === 'ollama'
                ? { model: resolvedModel, stream: false, messages: [{ role: 'system', content: AI_DEFAULT_SYSTEM_PROMPT }, { role: 'user', content: prompt }] }
                : { model: resolvedModel, temperature: 0.4, messages: [{ role: 'system', content: AI_DEFAULT_SYSTEM_PROMPT }, { role: 'user', content: prompt }] };
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timer);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data?.error?.message || data?.error || `فشل الاتصال (${response.status})`);
            error.statusCode = response.status;
            throw error;
        }
        const answer = resolvedProvider === 'ollama'
            ? data?.message?.content
            : resolvedProvider === 'gemini'
                ? data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('')
                : data?.choices?.[0]?.message?.content;
        if (!answer) {
            const error = new Error('المزود لم يرجع إجابة.');
            error.statusCode = 502;
            throw error;
        }
        return { success: true, answer, provider: resolvedProvider, model: resolvedModel };
    } catch (error) {
        if (error.name === 'AbortError') {
            const newError = new Error('انتهت مهلة الاتصال بالنموذج.');
            newError.statusCode = 504;
            throw newError;
        }
        const newError = new Error(`تعذر الاتصال بالمساعد: ${error.message}`);
        newError.statusCode = error.statusCode || 502;
        throw newError;
    }
};