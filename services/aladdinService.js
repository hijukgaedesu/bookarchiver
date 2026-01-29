
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

export const searchBooks = async (query, ttbKey) => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    if (!response.ok) throw new Error(`알라딘 연결 실패 (${response.status})`);
    
    const data = await response.json();
    if (data.errorCode) throw new Error(data.errorMessage || '알라딘 키 오류');

    return (data.item || []).map(item => {
      // 이미지 주소 HTTPS 강제 변환
      let coverUrl = item.cover || '';
      if (coverUrl.startsWith('http://')) {
        coverUrl = coverUrl.replace('http://', 'https://');
      }
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        description: item.description,
        cover: coverUrl.replace('sum', '500'),
        link: item.link
      };
    });
  } catch (error) {
    console.error('Aladdin API Error:', error);
    throw new Error('알라딘 서버 접속 실패. HTTPS 보안 설정을 확인하세요.');
  }
};
