
/**
 * 알라딘 API 호출 서비스
 * Vercel 자체 서버리스 함수(/api/aladdin)를 사용하여 안정성을 극대화합니다.
 */
export const searchBooks = async (query, ttbKey, searchTarget = 'Book') => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // 상대 경로를 사용하여 Vercel 서버리스 함수 호출
  const params = new URLSearchParams({
    ttbkey: ttbKey,
    Query: query,
    SearchTarget: searchTarget,
    _ts: Date.now().toString()
  });

  try {
    // 배포 환경과 로컬 환경 모두 대응하기 위해 상대 경로 사용
    const response = await fetch(`/api/aladdin?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`연결 실패 (상태코드: ${response.status})`);
    }
    
    const data = await response.json();
    
    if (data.errorCode) {
      throw new Error(data.errorMessage || '알라딘 API 키를 확인해 주세요.');
    }

    return (data.item || []).map(item => {
      const secureUrl = (url) => {
        if (!url) return '';
        return url.replace('http://', 'https://');
      };
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        description: item.description,
        cover: secureUrl(item.cover).replace('sum', '500'),
        link: secureUrl(item.link)
      };
    });
  } catch (error) {
    console.error('Aladdin API Error:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw error;
  }
};
