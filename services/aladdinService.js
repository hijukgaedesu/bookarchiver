
const PROXY_BASE = 'https://corsproxy.io/?';

export const searchBooks = async (query, ttbKey) => {
  if (!ttbKey) throw new Error('Aladdin TTB Key is required');
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    const data = await response.json();
    if (data.errorCode) throw new Error(data.errorMessage);

    return (data.item || []).map(item => ({
      itemId: item.itemId,
      title: item.title,
      author: item.author,
      description: item.description,
      cover: item.cover.replace('sum', '500'),
      link: item.link
    }));
  } catch (error) { throw error; }
};
