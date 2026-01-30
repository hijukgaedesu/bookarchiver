
import React, { useState, useEffect, useMemo } from 'react';
import htm from 'htm';
import { searchBooks } from './services/aladdinService.js';
import { fetchDatabases, addBookToNotion } from './services/notionService.js';

const html = htm.bind(React.createElement);

const App = () => {
  const [activeTab, setActiveTab] = useState('library'); 
  const [config, setConfig] = useState({
    notionToken: localStorage.getItem('notion_token') || '',
    notionDatabaseId: localStorage.getItem('notion_db_id') || '',
    aladdinTtbKey: localStorage.getItem('aladdin_ttb_key') || ''
  });

  const [databases, setDatabases] = useState([]);
  const [query, setQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState('Book');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDbs, setFetchingDbs] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get('n'), d = params.get('d'), a = params.get('a');
    if (n && d && a) {
      try {
        const newConfig = { notionToken: atob(n), notionDatabaseId: d, aladdinTtbKey: atob(a) };
        setConfig(newConfig);
        autoLoadDbs(newConfig);
      } catch (e) { console.error("URL 파라미터 파싱 실패"); }
    }
  }, []);

  const autoLoadDbs = async (conf) => {
    if (!conf.notionToken) return;
    setFetchingDbs(true);
    try {
      const dbs = await fetchDatabases(conf.notionToken);
      setDatabases(dbs);
    } catch (err) { console.error("DB 로드 실패"); }
    finally { setFetchingDbs(false); }
  };

  useEffect(() => {
    localStorage.setItem('notion_token', config.notionToken);
    localStorage.setItem('notion_db_id', config.notionDatabaseId);
    localStorage.setItem('aladdin_ttb_key', config.aladdinTtbKey);
  }, [config]);

  const propertyMap = useMemo(() => {
    const selectedDb = databases.find(db => db.id === config.notionDatabaseId);
    if (!selectedDb) return { title: 'Name', author: '작가', link: '링크' };
    const props = selectedDb.properties;
    const map = { title: '', author: '', link: '' };
    const titleKey = Object.keys(props).find(key => props[key].type === 'title');
    if (titleKey) map.title = titleKey;
    if (props['작가']?.type === 'rich_text') map.author = '작가';
    if (props['링크']?.type === 'url') map.link = '링크';
    return map;
  }, [config.notionDatabaseId, databases]);

  const handleFetchDatabases = async () => {
    if (!config.notionToken) { setStatus({ type: 'error', msg: '토큰을 입력하세요.' }); return; }
    setFetchingDbs(true); setStatus(null);
    try {
      const dbs = await fetchDatabases(config.notionToken);
      setDatabases(dbs);
      setStatus({ type: 'success', msg: '조회 완료' });
    } catch (err) { setStatus({ type: 'error', msg: '조회 실패' }); }
    finally { setFetchingDbs(false); }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query) return;
    setLoading(true); setStatus(null);
    try {
      const books = await searchBooks(query, config.aladdinTtbKey, searchTarget);
      setResults(books);
    } catch (err) { setStatus({ type: 'error', msg: '검색 실패' }); }
    finally { setLoading(false); }
  };

  const handleAddToNotion = async (book) => {
    if (!config.notionDatabaseId) { setStatus({ type: 'error', msg: 'DB를 먼저 설정하세요.' }); return; }
    setAddingId(book.itemId); setStatus(null);
    try {
      await addBookToNotion(book, config.notionToken, config.notionDatabaseId, propertyMap);
      setStatus({ type: 'success', msg: '저장 완료!' });
    } catch (err) { setStatus({ type: 'error', msg: '저장 실패' }); }
    finally { setAddingId(null); }
  };

  const copyWidgetUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const n = btoa(config.notionToken), a = btoa(config.aladdinTtbKey), d = config.notionDatabaseId;
    const finalUrl = `${baseUrl}?n=${n}&a=${a}&d=${d}`;
    navigator.clipboard.writeText(finalUrl);
    setStatus({ type: 'success', msg: '위젯 주소 복사됨' });
  };

  return html`
    <div className="mac-browser relative">
      ${fetchingDbs && html`
        <div className="absolute inset-0 bg-white/60 z-50 flex flex-col items-center justify-center backdrop-blur-[1px]">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-0.5"></div>
          <p className="text-[6.5px] text-blue-600 font-bold uppercase tracking-tighter">Syncing</p>
        </div>
      `}

      <header className="browser-header">
        <div className="traffic-lights">
          <div className="light red"></div>
          <div className="light yellow"></div>
          <div className="light green"></div>
        </div>
        <div className="tabs-container">
          <div className=${`tab ${activeTab === 'library' ? 'active' : ''}`} onClick=${() => setActiveTab('library')}>
            <i className="fas fa-search text-[6px]"></i>
            <span>Library</span>
          </div>
          <div className=${`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick=${() => setActiveTab('settings')}>
            <i className="fas fa-cog text-[6px]"></i>
            <span>Settings</span>
          </div>
        </div>
      </header>

      <div className="url-bar-container">
        <div className="url-bar">
          <i className="fas fa-shield-alt text-[5px] mr-1 text-blue-400"></i>
          notion.so/archiver/${activeTab}
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        ${activeTab === 'library' ? html`
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="search-row-container">
              <form onSubmit=${handleSearch} className="search-input-group">
                <select 
                  value=${searchTarget} 
                  onChange=${e => setSearchTarget(e.target.value)}
                  className="search-select"
                >
                  <option value="Book">국내</option>
                  <option value="eBook">전자</option>
                </select>
                <input 
                  type="text" 
                  value=${query} 
                  onChange=${e => setQuery(e.target.value)} 
                  placeholder="책 제목, 저자 검색..." 
                  className="search-input" 
                />
                <button type="submit" className="search-button">
                  ${loading ? html`<i className="fas fa-spinner fa-spin"></i>` : html`<i className="fas fa-search"></i>`}
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 pt-0">
              ${results.length > 0 ? html`
                <div className="space-y-1 mt-1">
                  ${results.map(book => html`
                    <div key=${book.itemId} className="flex items-center gap-2 p-1 border border-slate-50 rounded hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                      <img src=${book.cover} className="w-4.5 h-6.5 object-cover rounded shadow-xs" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[7.5px] text-slate-700 truncate leading-tight">${book.title}</h3>
                        <p className="text-[5.5px] text-slate-400 truncate">${book.author}</p>
                      </div>
                      <button 
                        onClick=${() => handleAddToNotion(book)} 
                        disabled=${addingId === book.itemId}
                        className="h-4 px-2 bg-blue-50 text-blue-600 rounded text-[6.5px] font-bold hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                      >
                        ${addingId === book.itemId ? html`<i className="fas fa-spinner fa-spin"></i>` : '저장'}
                      </button>
                    </div>
                  `)}
                </div>
              ` : html`
                <div className="h-full flex flex-col items-center justify-center text-slate-200 py-10">
                  <i className="fas fa-book-open text-xl mb-1 opacity-20"></i>
                  <p className="text-[7.5px] font-bold text-slate-300">검색 결과가 없습니다</p>
                </div>
              `}
            </div>
          </div>
        ` : html`
          <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
            <div className="space-y-0.5">
              <label className="text-[6px] font-bold text-slate-400 uppercase">Notion Secret Token</label>
              <input 
                type="password" 
                value=${config.notionToken} 
                onChange=${e => setConfig({...config, notionToken: e.target.value})} 
                className="w-full h-5 border border-slate-200 rounded text-[7.5px] px-2 shadow-sm"
                placeholder="secret_..."
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[6px] font-bold text-slate-400 uppercase">Aladdin TTB Key</label>
              <input 
                type="text" 
                value=${config.aladdinTtbKey} 
                onChange=${e => setConfig({...config, aladdinTtbKey: e.target.value})} 
                className="w-full h-5 border border-slate-200 rounded text-[7.5px] px-2 shadow-sm"
                placeholder="TTB Key"
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[6px] font-bold text-slate-400 uppercase">Notion Database</label>
              <div className="flex gap-1">
                <select 
                  value=${config.notionDatabaseId} 
                  onChange=${e => setConfig({...config, notionDatabaseId: e.target.value})} 
                  className="flex-1 h-5 border border-slate-200 rounded text-[7.5px] px-1 bg-white cursor-pointer shadow-sm"
                >
                  <option value="">DB를 선택하세요</option>
                  ${databases.map(db => html`<option key=${db.id} value=${db.id}>${db.title}</option>`)}
                </select>
                <button onClick=${handleFetchDatabases} className="px-2 h-5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[6.5px] font-bold hover:bg-slate-200">
                   조회
                </button>
              </div>
            </div>
            <div className="mt-auto pt-1 flex gap-1">
              <button onClick=${() => setActiveTab('library')} className="flex-1 h-5.5 bg-blue-600 text-white rounded font-bold text-[7.5px] hover:bg-blue-700 shadow-sm transition-all">설정 완료</button>
              <button onClick=${copyWidgetUrl} className="flex-1 h-5.5 bg-white border border-blue-200 text-blue-600 rounded font-bold text-[7.5px] hover:bg-blue-50 shadow-sm transition-all">URL 복사</button>
            </div>
          </div>
        `}

        ${status && html`
          <div className=${`px-2 py-0.5 text-[6.5px] font-bold text-center border-t border-slate-50 ${status.type === 'success' ? 'text-emerald-500 bg-emerald-50/20' : 'text-rose-500 bg-rose-50/20'}`}>
            ${status.msg}
          </div>
        `}
      </main>
    </div>
  `;
};

export default App;
