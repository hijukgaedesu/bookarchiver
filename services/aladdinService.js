
// allorigins는 GET 요청에 매우 안정적이며 GitHub Pages의 Origin을 잘 허용합니다.
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

export const searchBooks = async (query, ttbKey) => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 입력되지 않았습니다.');
  
  // 반드시 https:// 를 사용
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    
    if (!response.ok) {
      throw new Error(`알라딘 연결 실패 (상태코드: ${response.status})`);
    }
    
    const data = await response.json();
    
    if (data.errorCode) {
      throw new Error(data.errorMessage || '알라딘 API 키 오류');
    }

    return (data.item || []).map(item => ({
      itemId: item.itemId,
      title: item.title,
      author: item.author,
      description: item.description,
      cover: item.cover.replace('sum', '500'),
      link: item.link
    }));
  } catch (error) {
    console.error('Aladdin API 상세 에러:', error);
    throw new Error('알라딘 서버에 접속할 수 없습니다. API 키를 확인하거나 잠시 후 다시 시도해 주세요.');
  }
};
