
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { ttbkey, Query, SearchTarget, _ts } = req.query;

  if (!ttbkey) {
    return res.status(400).json({ errorMessage: 'TTBKey is required' });
  }

  // 알라딘 API 호출 주소 구성
  const targetUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbkey}&Query=${Query}&QueryType=Keyword&MaxResults=20&start=1&SearchTarget=${SearchTarget || 'Book'}&output=js&Version=20131101&_ts=${_ts || Date.now()}`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).json({ errorMessage: `Aladdin API responded with status ${response.status}` });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Aladdin Proxy Error:', error);
    res.status(500).json({ errorMessage: '알라딘 서버와 통신 중 오류가 발생했습니다.' });
  }
}
