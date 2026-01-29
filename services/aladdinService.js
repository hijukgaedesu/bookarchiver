
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

export const searchBooks = async (query, ttbKey) => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // 캐시 방지를 위해 랜덤 파라미터 추가 및 HTTPS 강제
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101&_=${Date.now()}`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    if (!response.ok) throw new Error(`알라딘 연결 실패 (상태코드: ${response.status})`);
    
    const data = await response.json();
    if (data.errorCode) throw new Error(data.errorMessage || '알라딘 API 키 오류');

    return (data.item || []).map(item => {
      // 모든 http 주소를 https로 변경 (Mixed Content 방지)
      const fixUrl = (url) => (url && url.startsWith('http://') ? url.replace('http://', 'https://') : url);
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        description: item.description,
        cover: fixUrl(item.cover).replace('sum', '500'),
        link: fixUrl(item.link)
      };
    });
  } catch (error) {
    console.error('Aladdin API Error:', error);
    throw new Error(`알라딘 서버 접속 실패: ${error.message}`);
  }
};
