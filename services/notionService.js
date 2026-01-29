
const PROXY_BASE = 'https://corsproxy.io/?';

export const fetchDatabases = async (token) => {
  const apiUrl = 'https://api.notion.com/v1/search';
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100
      })
    });
    const data = await response.json();
    return (data.results || []).map(db => ({
      id: db.id,
      title: db.title[0]?.plain_text || '이름 없음',
      properties: db.properties
    }));
  } catch (error) { throw error; }
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
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: book.description || '책 설명이 없습니다.' } }] } }
    ]
  };

  const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return await response.json();
};
