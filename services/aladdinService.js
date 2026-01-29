
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

export const searchBooks = async (query, ttbKey, searchTarget = 'Book') => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // searchTarget: Book(국내도서), Foreign(외국도서), eBook(전자책), All(전체)
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=20&start=1&SearchTarget=${searchTarget}&output=js&Version=20131101&_=${Date.now()}`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    if (!response.ok) throw new Error(`알라딘 연결 실패 (상태코드: ${response.status})`);
    
    const data = await response.json();
    if (data.errorCode) throw new Error(data.errorMessage || '알라딘 API 키 오류');

    return (data.item || []).map(item => {
      // 모든 http 주소를 https로 강제 변환하여 보안 오류 방지
      const fixUrl = (url) => {
        if (!url) return '';
        return url.replace('http://', 'https://');
      };
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        description: item.description,
        cover: fixUrl(item.cover).replace('sum', '500'), // 고해상도 이미지로 교체
        link: fixUrl(item.link)
      };
    });
  } catch (error) {
    console.error('Aladdin API Error:', error);
    throw new Error(`알라딘 서버 접속 실패: ${error.message}`);
  }
};
