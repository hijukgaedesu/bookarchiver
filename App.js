
import React, { useState, useEffect, useMemo } from 'react';
import htm from 'htm';
import { searchBooks } from './services/aladdinService.js';
import { fetchDatabases, addBookToNotion } from './services/notionService.js';

const html = htm.bind(React.createElement);

const App = () => {
  const [step, setStep] = useState('config');
  const [config, setConfig] = useState({
    notionToken: localStorage.getItem('notion_token') || '',
    notionDatabaseId: localStorage.getItem('notion_db_id') || '',
    aladdinTtbKey: localStorage.getItem('aladdin_ttb_key') || ''
  });

  const [databases, setDatabases] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDbs, setFetchingDbs] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get('n');
    const d = params.get('d');
    const a = params.get('a');

    if (n && d && a) {
      try {
        const decodedToken = atob(n);
        const decodedAladdin = atob(a);
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
      setStatus({ 
        type: 'error', 
        msg: '연결 실패: ' + err.message,
        tip: '토큰과 데이터베이스 연결 설정을 다시 한번 확인해 주세요.'
      });
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
    const typeErrors = [];
    const missing = [];
    const titleKey = Object.keys(props).find(key => props[key].type === 'title');
    if (titleKey) map.title = titleKey; else missing.push('제목');
    if (props['작가']) {
      if (props['작가'].type === 'rich_text') map.author = '작가';
      else typeErrors.push(`'작가' 컬럼을 '텍스트' 타입으로 변경해 주세요.`);
    } else missing.push('작가');
    if (props['링크']) {
      if (props['링크'].type === 'url') map.link = '링크';
      else typeErrors.push(`'링크' 컬럼을 'URL' 타입으로 변경해 주세요.`);
    } else missing.push('링크');
    return { map, missing, typeErrors };
  }, [config.notionDatabaseId, databases]);

  const handleFetchDatabases = async () => {
    if (!config.notionToken) { setStatus({ type: 'error', msg: '토큰을 입력하세요.' }); return; }
    setFetchingDbs(true); setStatus(null);
    try {
      const dbs = await fetchDatabases(config.notionToken);
      setDatabases(dbs);
      setStatus({ type: 'success', msg: `${dbs.length}개의 DB를 찾았습니다!` });
    } catch (err) { 
      setStatus({ 
        type: 'error', 
        msg: '연결 오류: ' + err.message,
        tip: '네트워크 상태가 불안정하거나 프록시 서버가 차단되었을 수 있습니다.'
      }); 
    }
    finally { setFetchingDbs(false); }
  };

  const generateShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const n = btoa(config.notionToken);
    const a = btoa(config.aladdinTtbKey);
    const d = config.notionDatabaseId;
    const finalUrl = `${baseUrl}?n=${n}&a=${a}&d=${d}`;
    setShareUrl(finalUrl);
    navigator.clipboard.writeText(finalUrl);
    setStatus({ type: 'success', msg: '전용 링크 복사 완료! ♡' });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true); setStatus(null);
    try {
      const books = await searchBooks(query, config.aladdinTtbKey);
      setResults(books);
    } catch (err) { setStatus({ type: 'error', msg: '검색 실패: ' + err.message }); }
    finally { setLoading(false); }
  };

  const handleAddToNotion = async (book) => {
    setAddingId(book.itemId); setStatus(null);
    try {
      await addBookToNotion(book, config.notionToken, config.notionDatabaseId, propertyStatus?.map);
      setStatus({ type: 'success', msg: `[${book.title}] 등록 성공!`, tip: "노션에서 확인해 보세요!" });
    } catch (err) { setStatus({ type: 'error', msg: '등록 실패: ' + err.message }); }
    finally { setAddingId(null); }
  };

  return html`
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fcfcfc]">
      <div className="w-full max-w-[480px] pink-window flex flex-col h-[680px] shadow-2xl relative overflow-hidden">
        ${fetchingDbs && html`
          <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#FFDDE5] border-t-[#D67C8C] rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-[#D67C8C] font-bold">보안 연결 시도 중...</p>
            <p className="text-[10px] text-gray-400 mt-2 italic">최적의 경로를 찾는 중입니다</p>
          </div>
        `}
        <div className="pink-header flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#D67C8C] font-bold">
            <i className="fas ${step === 'config' ? 'fa-cog' : 'fa-search'}"></i>
            <span className="text-sm uppercase tracking-wider">${step === 'config' ? 'Config' : 'Search'}</span>
          </div>
          ${step === 'search' && html`<button onClick=${() => setStep('config')} className="text-[10px] px-3 py-1 bg-white border border-[#FFDDE5] rounded-full text-[#D67C8C]">Setting</button>`}
        </div>
        <div className="p-6 flex flex-col flex-1 overflow-hidden">
          ${step === 'config' ? html`
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#D67C8C] mb-1">Book Archiver</h1>
                <p className="text-xs text-gray-400">나만의 소중한 서재를 만들어보세요 ♡</p>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D67C8C] ml-1 uppercase">Notion Token</label>
                  <input type="password" value=${config.notionToken} onChange=${e => setConfig({...config, notionToken: e.target.value})} placeholder="secret_..." className="w-full p-3 text-xs pink-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D67C8C] ml-1 uppercase">Aladdin Key</label>
                  <input type="text" value=${config.aladdinTtbKey} onChange=${e => setConfig({...config, aladdinTtbKey: e.target.value})} placeholder="TTB Key" className="w-full p-3 text-xs pink-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D67C8C] ml-1 uppercase">Select Database</label>
                  <div className="flex gap-2">
                    <select value=${config.notionDatabaseId} onChange=${e => setConfig({...config, notionDatabaseId: e.target.value})} className="flex-1 p-3 text-xs pink-input bg-white appearance-none cursor-pointer">
                      <option value="">DB를 선택하세요</option>
                      ${databases.map(db => html`<option key=${db.id} value=${db.id}>${db.title}</option>`)}
                    </select>
                    <button onClick=${handleFetchDatabases} className="px-4 bg-white border border-[#FFC1CC] text-[#D67C8C] rounded-lg text-xs font-bold">연결</button>
                  </div>
                </div>
                ${status && html`
                  <div className="p-4 rounded-xl border ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}">
                    <p className="text-[11px] font-bold mb-1">${status.msg}</p>
                    ${status.tip && html`<p className="text-[10px] opacity-80 mt-1">💡 ${status.tip}</p>`}
                  </div>
                `}
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <button onClick=${() => setStep('search')} className="w-full py-4 bg-[#D67C8C] text-white rounded-xl font-bold">시작하기</button>
                <button onClick=${generateShareUrl} className="w-full py-3 bg-white text-[#D67C8C] border border-[#FFDDE5] rounded-xl text-xs font-bold">노션 전용 링크 복사</button>
              </div>
            </div>
          ` : html`
            <div className="flex flex-col h-full">
              <form onSubmit=${handleSearch} className="flex gap-3 items-center shrink-0">
                <input type="text" value=${query} onChange=${e => setQuery(e.target.value)} placeholder="검색어 입력..." className="flex-1 p-3 pink-input text-sm shadow-inner" />
                <button type="submit" className="pink-button-square">${loading ? html`<i className="fas fa-spinner fa-spin"></i>` : html`<i className="fas fa-search"></i>`}</button>
              </form>
              <div className="dotted-line shrink-0"></div>
              
              ${status && html`
                <div className="mb-4 p-3 rounded-lg text-[10px] ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">
                  <b>${status.msg}</b>
                </div>
              `}

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                ${results.length > 0 ? html`
                  <div className="grid gap-4 pb-4">
                    ${results.map(book => html`
                      <div key=${book.itemId} className="flex gap-4 p-3 bg-white border border-[#f5f5f5] rounded-2xl group transition-all">
                        <img src=${book.cover} className="w-20 h-28 object-cover rounded-lg shadow-sm" />
                        <div className="flex flex-col justify-between flex-1 py-1">
                          <div>
                            <h3 className="font-bold text-xs line-clamp-2">${book.title}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">${book.author}</p>
                          </div>
                          <button onClick=${() => handleAddToNotion(book)} className="w-full py-2 bg-[#FFF0F3] text-[#D67C8C] rounded-xl text-[10px] font-bold">
                            ${addingId === book.itemId ? html`<i className="fas fa-spinner fa-spin"></i>` : '저장하기'}
                          </button>
                        </div>
                      </div>
                    `)}
                  </div>
                ` : html`<div className="h-full flex flex-col items-center justify-center text-[#e2e2e2] py-20"><i className="fas fa-magic text-5xl mb-4 opacity-20"></i><p>검색 결과가 여기에 나타나요!</p></div>`}
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};

export default App;
