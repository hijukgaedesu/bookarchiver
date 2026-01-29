
import { Book } from '../types';

// GitHub Pages(HTTPS)에서 가장 안정적인 GET 전용 프록시 사용
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

export const searchBooks = async (query: string, ttbKey: string): Promise<Book[]> => {
  if (!ttbKey) throw new Error('알라딘 TTB 키가 필요합니다.');
  
  // 1. API 주소를 반드시 https로 설정
  const apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    
    if (!response.ok) {
      throw new Error(`알라딘 서버 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errorCode) {
      throw new Error(data.errorMessage || '알라딘 API 키를 확인해 주세요.');
    }

    return (data.item || []).map((item: any) => {
      // 2. 이미지 주소도 반드시 https로 변환 (중요!)
      let coverUrl = item.cover || '';
      if (coverUrl.startsWith('http://')) {
        coverUrl = coverUrl.replace('http://', 'https://');
      }
      
      return {
        itemId: item.itemId,
        title: item.title,
        author: item.author,
        publisher: item.publisher,
        pubDate: item.pubDate,
        description: item.description,
        cover: coverUrl.replace('sum', '500'), // 고해상도 이미지
        link: item.link,
        isbn: item.isbn,
        categoryName: item.categoryName
      };
    });
  } catch (error: any) {
    console.error('Aladdin Error:', error);
    throw new Error(error.message || '알라딘 연결 실패 (HTTPS 보안 정책 확인 필요)');
  }
};
