
// corsproxy.io의 403 에러를 피하기 위해 더 유연한 프록시로 교체합니다.
const PROXY_BASE = 'https://api.codetabs.com/v1/proxy?quest=';

export const fetchDatabases = async (token) => {
  const apiUrl = 'https://api.notion.com/v1/search';
  try {
    // URL 인코딩을 통해 프록시에 전달
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
        // 불필요한 커스텀 헤더는 프록시에서 403을 유발할 수 있으므로 제거함
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100
      })
    });

    if (response.status === 403) {
      throw new Error('프록시 서버가 요청을 거부했습니다(403). 잠시 후 다시 시도하거나 다른 브라우저에서 테스트해 주세요.');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '노션 API 응답 오류');

    return (data.results || [])
      .filter(item => item.object === 'database')
      .map(db => ({
        id: db.id,
        title: db.title[0]?.plain_text || '이름 없음',
        properties: db.properties
      }));
  } catch (error) {
    console.error('Notion Fetch Error:', error);
    throw new Error(error.message.includes('Load failed') || error.message.includes('fetch')
      ? 'CORS 차단 발생: 브라우저 보안 정책으로 인해 요청이 막혔습니다.' 
      : error.message);
  }
};

export const addBookToNotion = async (book, token, databaseId, propertyMap) => {
  const apiUrl = 'https://api.notion.com/v1/pages';
  const properties = {};
  if (propertyMap.title) properties[propertyMap.title] = { title: [{ text: { content: book.title } }] };
  if (propertyMap.author) properties[propertyMap.author] = { rich_text: [{ text: { content: book.author } }] };
  if (propertyMap.link) properties[propertyMap.link] = { url: book.link };

  const body = {
    parent: { database_id: databaseId },
    icon: { type: 'external', external: { url: book.cover } },
    cover: { type: 'external', external: { url: book.cover } },
    properties: properties,
    children: [
      { object: 'block', type: 'image', image: { type: 'external', external: { url: book.cover } } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: book.description || '설명이 없습니다.' } }] } }
    ]
  };

  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '노션 페이지 생성 실패');
    }
    return await response.json();
  } catch (error) {
    console.error('Notion Add Error:', error);
    throw error;
  }
};
