import { Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export default function AppLayout({ apiOnline, onRetry }) {
  const { user } = useAuth();
  const [retrying,    setRetrying]    = useState(false);
  const [processados, setProcessados] = useState(null);
  const [latency,     setLatency]     = useState(null);

  useEffect(() => {
    if (!apiOnline) return;
    const buscar = () => {
      const t0 = performance.now();
      fetch(`${API}/coleta/progresso`, { cache: 'no-store' })
        .then(r => { setLatency(Math.round(performance.now() - t0)); return r.json(); })
        .then(d => setProcessados(d.processados ?? null))
        .catch(() => {});
    };
    buscar();
    const id = setInterval(buscar, 20_000);
    return () => clearInterval(id);
  }, [apiOnline]);

  if (!user) return <Navigate to="/login" replace />;

  function handleRetry() {
    setRetrying(true);
    onRetry?.();
    setTimeout(() => setRetrying(false), 2000);
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-deep)' }}>
      <Sidebar />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── Top bar ── */}
        <div style={{
          height: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8, padding: '0 20px',
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          {/* Coleta badge */}
          {processados != null && (
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background:'rgba(45,106,79,0.07)', border:'1px solid rgba(45,106,79,0.18)',
              borderRadius:20, padding:'3px 10px',
            }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#2D6A4F', animation:'pulse 1.8s infinite', display:'inline-block' }} />
              <Database size={10} color="#2D6A4F" />
              <span style={{ fontSize:10, color:'#2D6A4F', fontWeight:500 }}>
                {processados.toLocaleString('pt-BR')} / 5.570 municípios
              </span>
            </div>
          )}

          {/* API status */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            background: apiOnline ? 'rgba(26,122,60,0.07)' : 'rgba(220,38,38,0.07)',
            border:`1px solid ${apiOnline ? 'rgba(26,122,60,0.2)' : 'rgba(220,38,38,0.2)'}`,
            borderRadius:20, padding:'3px 10px',
          }}>
            {apiOnline
              ? <Wifi    size={10} color="#1A7A3C" />
              : <WifiOff size={10} color="#DC2626" />}
            <span style={{ fontSize:10, fontWeight:500, color: apiOnline ? '#1A7A3C' : '#DC2626' }}>
              {apiOnline === null ? 'Verificando...'
               : apiOnline
                 ? `API Online${latency ? ` · ${latency}ms` : ''}`
                 : 'API Offline'}
            </span>
            <span style={{
              width:5, height:5, borderRadius:'50%',
              background: apiOnline ? '#1A7A3C' : apiOnline === null ? '#D4A017' : '#DC2626',
              animation: apiOnline ? 'pulse 2s infinite' : 'none',
            }} />
          </div>

          {/* Reconectar */}
          {!apiOnline && (
            <button onClick={handleRetry} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'4px 10px', borderRadius:20, cursor:'pointer',
              background:'rgba(45,106,79,0.07)', border:'1px solid rgba(45,106,79,0.2)',
              color:'#2D6A4F', fontSize:10, fontWeight:500,
            }}>
              <RefreshCw size={10} style={{ animation: retrying ? 'spin 0.7s linear infinite' : 'none' }} />
              {retrying ? 'Reconectando...' : 'Reconectar'}
            </button>
          )}
        </div>

        <main style={{ flex:1, overflow:'auto', padding:24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
