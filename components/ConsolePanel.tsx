import React, { useEffect, useState } from 'react';

interface LogEntry { level: 'log' | 'warn' | 'error'; message: string; time: string }

export const ConsolePanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Initialize global log store
    (window as any).__APP_LOGS__ = (window as any).__APP_LOGS__ || [];

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      try { (window as any).__APP_LOGS__.push({ level: 'log', message: args.map(a=>String(a)).join(' '), time: new Date().toLocaleTimeString() }); } catch(e){}
      originalLog.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      try { (window as any).__APP_LOGS__.push({ level: 'warn', message: args.map(a=>String(a)).join(' '), time: new Date().toLocaleTimeString() }); } catch(e){}
      originalWarn.apply(console, args);
    };
    console.error = (...args: any[]) => {
      try { (window as any).__APP_LOGS__.push({ level: 'error', message: args.map(a=>String(a)).join(' '), time: new Date().toLocaleTimeString() }); } catch(e){}
      originalError.apply(console, args);
    };

    const interval = setInterval(() => {
      const store = (window as any).__APP_LOGS__ || [];
      if (store.length !== logs.length) {
        setLogs([...store].slice(-80));
      }
    }, 500);

    return () => {
      clearInterval(interval);
      // restore originals (optional)
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [logs.length]);

  return (
    <div style={{position:'fixed', right:12, bottom:12, width:420, maxHeight: '40vh', overflow:'auto', zIndex:9999, background:'rgba(2,6,23,0.9)', color:'#cbd5e1', border:'1px solid #0ea5a4', padding:10, borderRadius:8, fontSize:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <strong style={{color:'#06b6d4'}}>App Console</strong>
        <button onClick={() => { (window as any).__APP_LOGS__ = []; setLogs([]); }} style={{background:'#0ea5a4', border:'none', color:'#021026',padding:'4px 8px',borderRadius:4}}>Clear</button>
      </div>
      <div>
        {logs.length === 0 && <div style={{color:'#94a3b8'}}>No logs yet — perform an action (type in autocomplete)</div>}
        {logs.map((l, i) => (
          <div key={i} style={{marginBottom:6, whiteSpace:'pre-wrap'}}>
            <span style={{color:l.level === 'error' ? '#fb7185' : l.level === 'warn' ? '#f59e0b' : '#94a3b8', marginRight:8}}>[{l.time}]</span>
            <span style={{color:'#e6edf3'}}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
