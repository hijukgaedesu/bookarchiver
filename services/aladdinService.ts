
import { Book } from '../types';

// Using corsproxy.io as it handles headers and redirects more reliably for browser-side requests
const PROXY_BASE = 'https://corsproxy.io/?';

export const searchBooks = async (query: string, ttbKey: string): Promise<Book[]> => {
  if (!ttbKey) throw new Error('Aladdin TTB Key is required');
  
  const apiUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
  
  try {
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(apiUrl)}`);
    
    if (!response.ok) {
      throw new Error(`알라딘 서버 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errorCode) {
      throw new Error(data.errorMessage || 'Aladdin API Error');
    }

    return (data.item || []).map((item: any) => ({
      itemId: item.itemId,
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      pubDate: item.pubDate,
      description: item.description,
      cover: item.cover.replace('sum', '500'), // Get higher resolution cover
      link: item.link,
      isbn: item.isbn,
      categoryName: item.categoryName
    }));
  } catch (error) {
    console.error('Aladdin search error:', error);
    throw error;
  }
};
