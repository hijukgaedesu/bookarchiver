
/**
 * 알라딘 API 호출 서비스
 * 타임아웃 오류(408) 방지를 위해 더 빠른 프록시(corsproxy.io)를 사용합니다.
 */
const PROXY_BASE = 'https://corsproxy.io/?';

export const searchBooks = async (query, ttbKey, searchTarget = 'Book') => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // HTTPS 강제 및 캐시 방지를 위한 타임스탬프 추가
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=20&start=1&SearchTarget=${searchTarget}&output=js&Version=20131101&_ts=${Date.now()}`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 408) {
        throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
      }
      throw new Error(`알라딘 연결 실패 (상태코드: ${response.status})`);
    }
    
    const data = await response.json();
    
    if (data.errorCode) {
      throw new Error(data.errorMessage || '알라딘 API 키를 확인해 주세요.');
    }

    return (data.item || []).map(item => {
      // 이미지 및 링크 주소를 HTTPS로 변환
      const secureUrl = (url) => {
        if (!url) return '';
        return url.replace('http://', 'https://');
      };
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        description: item.description,
        cover: secureUrl(item.cover).replace('sum', '500'), // 고해상도 이미지 사용
        link: secureUrl(item.link)
      };
    });
  } catch (error) {
    console.error('Aladdin API Error:', error);
    // Failed to fetch 에러 처리
    if (error.message === 'Failed to fetch') {
      throw new Error('프록시 서버 연결 실패. 네트워크 상태를 확인하세요.');
    }
    throw error;
  }
};
