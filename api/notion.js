
// Vercel Serverless Function: 브라우저 대신 노션 API와 통신합니다.
export default async function handler(req, res) {
  // CORS 헤더 설정 (브라우저의 요청을 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Notion-Version'
  );

  // OPTIONS 요청 처리 (Preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, body, headers } = req;
  const targetUrl = headers['x-target-url'] || 'https://api.notion.com/v1/search';

  try {
    const notionResponse = await fetch(targetUrl, {
      method: method,
      headers: {
        'Authorization': headers['authorization'],
        'Notion-Version': headers['notion-version'] || '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    const data = await notionResponse.json();
    res.status(notionResponse.status).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
