
/**
 * 노션 API를 직접 호출하면 CORS 에러가 나므로, 
 * 범용 CORS 프록시를 통해 중계합니다.
 */
const PROXY_BASE = 'https://corsproxy.io/?';

const getHeaders = (token) => {
  let cleanToken = (token || '').trim();
  if (cleanToken.startsWith('Bearer ')) {
    cleanToken = cleanToken.replace('Bearer ', '');
  }

  return {
    'Authorization': `Bearer ${cleanToken}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };
};

export const fetchDatabases = async (token) => {
  const targetUrl = 'https://api.notion.com/v1/search';
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `노션 에러 (${response.status})`);
    }

    return (data.results || [])
      .filter(item => item.object === 'database')
      .map(db => ({
        id: db.id,
        title: db.title[0]?.plain_text || '이름 없음',
        properties: db.properties
      }));
  } catch (error) {
    console.error('fetchDatabases error:', error);
    throw error;
  }
};

export const addBookToNotion = async (book, token, databaseId, propertyMap) => {
  const targetUrl = 'https://api.notion.com/v1/pages';
  
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
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `페이지 생성 실패 (${response.status})`);
    }
    
    return data;
  } catch (error) {
    console.error('addBookToNotion error:', error);
    throw error;
  }
};
