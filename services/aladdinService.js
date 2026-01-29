
const PROXY_BASE = 'https://corsproxy.io/?';

export const searchBooks = async (query, ttbKey) => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // 반드시 https:// 를 사용해야 깃허브 페이지(https)에서 차단되지 않습니다.
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    if (!response.ok) {
      throw new Error(`알라딘 응답 오류: ${response.status} (프록시 문제일 수 있습니다)`);
    }
    const data = await response.json();
    if (data.errorCode) throw new Error(data.errorMessage || '알라딘 API 키를 확인해 주세요.');

    return (data.item || []).map(item => ({
      itemId: item.itemId,
      title: item.title,
      author: item.author,
      description: item.description,
      cover: item.cover.replace('sum', '500'),
      link: item.link
    }));
  } catch (error) {
    console.error('Aladdin Error:', error);
    throw new Error(error.message || '알라딘 연결 중 알 수 없는 오류가 발생했습니다.');
  }
};
