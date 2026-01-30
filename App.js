
import React, { useState, useEffect, useMemo } from 'react';
import htm from 'htm';
import { searchBooks } from './services/aladdinService.js';
import { fetchDatabases, addBookToNotion } from './services/notionService.js';

const html = htm.bind(React.createElement);

const App = () => {
  const [step, setStep] = useState('search');
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
        const decodedToken = atob(n), decodedAladdin = atob(a);
        const newConfig = { notionToken: decodedToken, notionDatabaseId: d, aladdinTtbKey: decodedAladdin };
        setConfig(newConfig);
        autoInitialize(newConfig);
      } catch (e) { console.error("URL 파라미터 해독 실패"); }
    }
  }, []);

  const autoInitialize = async (conf) => {
    if (!conf.notionToken) return;
    setFetchingDbs(true);
    try {
      const dbs = await fetchDatabases(conf.notionToken);
      setDatabases(dbs);
      setStep('search');
    } catch (err) {
      setStatus({ type: 'error', msg: '연결 실패' });
    } finally { setFetchingDbs(false); }
  };

  useEffect(() => {
    localStorage.setItem('notion_token', config.notionToken);
    localStorage.setItem('notion_db_id', config.notionDatabaseId);
    localStorage.setItem('aladdin_ttb_key', config.aladdinTtbKey);
  }, [config]);

  const propertyStatus = useMemo(() => {
    const selectedDb = databases.find(db => db.id === config.notionDatabaseId);
    if (!selectedDb) return null;
    const props = selectedDb.properties;
    const map = { title: '', author: '', link: '' };
    const titleKey = Object.keys(props).find(key => props[key].type === 'title');
    if (titleKey) map.title = titleKey;
    if (props['작가']?.type === 'rich_text') map.author = '작가';
    if (props['링크']?.type === 'url') map.link = '링크';
    return { map };
  }, [config.notionDatabaseId, databases]);

  const handleFetchDatabases = async () => {
    if (!config.notionToken) { setStatus({ type: 'error', msg: '토큰 누락' }); return; }
    setFetchingDbs(true); setStatus(null);
    try {
      const dbs = await fetchDatabases(config.notionToken);
      setDatabases(dbs);
      setStatus({ type: 'success', msg: `조회 완료` });
    } catch (err) { setStatus({ type: 'error', msg: '조회 에러' }); }
    finally { setFetchingDbs(false); }
  };

  const generateShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const n = btoa(config.notionToken.trim()), a = btoa(config.aladdinTtbKey.trim()), d = config.notionDatabaseId;
    const finalUrl = `${baseUrl}?n=${n}&a=${a}&d=${d}`;
    navigator.clipboard.writeText(finalUrl);
    setStatus({ type: 'success', msg: '복사 완료' });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true); setStatus(null);
    try {
      const books = await searchBooks(query, config.aladdinTtbKey, searchTarget);
      setResults(books);
    } catch (err) { setStatus({ type: 'error', msg: '검색 실패' }); }
    finally { setLoading(false); }
  };

  const handleAddToNotion = async (book) => {
    setAddingId(book.itemId); setStatus(null);
    try {
      await addBookToNotion(book, config.notionToken, config.notionDatabaseId, propertyStatus?.map);
      setStatus({ type: 'success', msg: '저장됨!' });
    } catch (err) { setStatus({ type: 'error', msg: '저장 실패' }); }
    finally { setAddingId(null); }
  };

  return html`
    <div className="mac-browser relative">
      ${fetchingDbs && html`
        <div className="absolute inset-0 bg-white/60 z-50 flex flex-col items-center justify-center backdrop-blur-[1px]">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-0.5"></div>
          <p className="text-[6.5px] text-blue-600 font-bold uppercase">Sync...</p>
        </div>
      `}

      <header className="browser-header">
        <div className="flex justify-between items-center pr-2">
          <div className="traffic-lights">
            <div className="light red"></div>
            <div className="light yellow"></div>
            <div className="light green"></div>
          </div>
        </div>
        
        <div className="tabs-container">
          <div className=${`tab ${step === 'search' ? 'active' : ''}`} onClick=${() => setStep('search')}>
            <i className="fas fa-bookmark text-[5.5px]"></i>
            <span>Library</span>
          </div>
          <div className=${`tab ${step === 'config' ? 'active' : ''}`} onClick=${() => setStep('config')}>
            <i className="fas fa-cog text-[5.5px]"></i>
            <span>Settings</span>
          </div>
        </div>
      </header>

      <div className="url-bar-container">
        <div className="url-bar">
          /${step === 'config' ? 'settings' : 'search'}
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        ${step === 'config' ? html`
          <div className="config-view flex-1 overflow-y-auto custom-scrollbar">
            <div className="config-row">
              <label className="config-label">Notion Secret</label>
              <input type="password" value=${config.notionToken} onChange=${e => setConfig({...config, notionToken: e.target.value})} className="config-input" placeholder="secret_..." />
            </div>
            <div className="config-row">
              <label className="config-label">Aladdin TTB</label>
              <input type="text" value=${config.aladdinTtbKey} onChange=${e => setConfig({...config, aladdinTtbKey: e.target.value})} className="config-input" placeholder="TTB-key" />
            </div>
            <div className="config-row">
              <label className="config-label">Target DB</label>
              <div className="flex gap-1">
                <select value=${config.notionDatabaseId} onChange=${e => setConfig({...config, notionDatabaseId: e.target.value})} className="flex-1 config-input bg-white">
                  <option value="">DB 선택</option>
                  ${databases.map(db => html`<option key=${db.id} value=${db.id}>${db.title}</option>`)}
                </select>
                <button onClick=${handleFetchDatabases} className="px-1 h-5 bg-slate-50 border border-slate-200 text-slate-500 rounded text-[6.5px] font-bold">조회</button>
              </div>
            </div>

            <div className="mt-auto pt-1.5 flex gap-1">
              <button onClick=${() => setStep('search')} className="flex-1 h-5.5 bg-blue-500 text-white rounded font-bold text-[7.5px] hover:bg-blue-600">저장 및 시작</button>
              <button onClick=${generateShareUrl} className="flex-1 h-5.5 bg-white text-blue-500 border border-blue-200 rounded font-bold text-[7.5px] hover:bg-blue-50">링크 복사</button>
            </div>
          </div>
        ` : html`
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="search-container">
              <form onSubmit=${handleSearch} className="search-form">
                <select 
                  value=${searchTarget} 
                  onChange=${e => setSearchTarget(e.target.value)}
                  className="blue-select"
                >
                  <option value="Book">도서</option>
                  <option value="eBook">eBook</option>
                </select>
                <input 
                  type="text" 
                  value=${query} 
                  onChange=${e => setQuery(e.target.value)} 
                  placeholder="검색..." 
                  className="blue-search-input" 
                />
                <button type="submit" className="blue-search-btn">
                  ${loading ? html`<i className="fas fa-spinner fa-spin text-[8px]"></i>` : html`<i className="fas fa-search text-[8px]"></i>`}
                </button>
              </form>
            </div>

            <div className="results-list">
              ${results.length > 0 ? html`
                <div>
                  ${results.map(book => html`
                    <div key=${book.itemId} className="compact-book-card group">
                      <img src=${book.cover} className="w-4.5 h-6.5 object-cover rounded-sm shadow-xs" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[8px] text-slate-700 truncate leading-none">${book.title}</h3>
                        <p className="text-[6px] text-slate-400 truncate mt-0.5">${book.author}</p>
                      </div>
                      <button 
                        onClick=${() => handleAddToNotion(book)} 
                        disabled=${addingId === book.itemId}
                        className="h-4 px-1.5 bg-blue-50 text-blue-500 rounded-sm text-[7px] font-bold hover:bg-blue-500 hover:text-white disabled:opacity-50"
                      >
                        ${addingId === book.itemId ? html`<i className="fas fa-spinner fa-spin"></i>` : '저장'}
                      </button>
                    </div>
                  `)}
                </div>
              ` : html`
                <div className="empty-state">
                  <i className="fas fa-search opacity-10 text-xl mb-0.5"></i>
                  <p className="text-[7.5px] font-bold">도서 검색</p>
                </div>
              `}
            </div>

            ${status && html`
              <div className=${`status-bar ${status.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${status.msg}
              </div>
            `}
          </div>
        `}
      </main>
    </div>
  `;
};

export default App;
