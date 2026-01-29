
export interface Book {
  itemId: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  description: string;
  cover: string;
  link: string;
  isbn: string;
  categoryName: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
}

export interface AppConfig {
  notionToken: string;
  notionDatabaseId: string;
  aladdinTtbKey: string;
}
