// Эта функция будет выполняться на серверах Vercel (Edge Function).
// Она выступает в роли безопасного посредника между вашим сайтом и Google AI API.

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. Получаем данные (промпт) от нашего сайта.
  const { prompt, systemInstruction } = await request.json();

  // 2. Убеждаемся, что у нас есть API-ключ.
  // Vercel позволяет безопасно хранить "секреты" (как API ключи)
  // Вам нужно будет один раз добавить его в настройках вашего проекта на Vercel.
  // Название переменной: GOOGLE_API_KEY
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API-ключ не найден в переменных окружения Vercel.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 3. Формируем тело запроса к Google AI API.
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  try {
    // 4. Отправляем запрос к Google AI.
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('Google AI API Error:', errorBody);
        return new Response(JSON.stringify({ error: `Ошибка от Google AI API: ${apiResponse.statusText}` }), {
            status: apiResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 5. Обрабатываем ответ и извлекаем текст.
    const result = await apiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 6. Отправляем полученный текст обратно на наш сайт.
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Ошибка при вызове Vercel Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
