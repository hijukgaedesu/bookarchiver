
/**
 * Vercel 환경인지 확인하고 전용 프록시 또는 공용 프록시를 선택합니다.
 */
const getRequestConfig = (url, token) => {
  // Vercel에서 호스팅 중일 경우 자기 자신의 API Route 사용
  const isVercel = window.location.hostname.includes('vercel.app');
  
  if (isVercel) {
    return {
      fetchUrl: '/api/notion',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'x-target-url': url // 서버리스 함수에게 전달할 실제 노션 API 주소
      }
    };
  }

  // 로컬이나 깃허브 페이지일 경우 (차선책: thingproxy가 POST에 그나마 강함)
  return {
    fetchUrl: `https://thingproxy.freeboard.io/fetch/${url}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  };
};

export const fetchDatabases = async (token) => {
  const apiUrl = 'https://api.notion.com/v1/search';
  const config = getRequestConfig(apiUrl, token);

  try {
    const response = await fetch(config.fetchUrl, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '노션 연결 실패');

    return (data.results || [])
      .filter(item => item.object === 'database')
      .map(db => ({
        id: db.id,
        title: db.title[0]?.plain_text || '이름 없음',
        properties: db.properties
      }));
  } catch (error) {
    console.error('Notion Fetch Error:', error);
    throw error;
  }
};

export const addBookToNotion = async (book, token, databaseId, propertyMap) => {
  const apiUrl = 'https://api.notion.com/v1/pages';
  const config = getRequestConfig(apiUrl, token);
  
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
    const response = await fetch(config.fetchUrl, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '노션 페이지 생성 실패');
    
    return data;
  } catch (error) {
    console.error('Notion Add Error:', error);
    throw error;
  }
};
