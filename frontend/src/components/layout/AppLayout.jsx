import { Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense } from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Wifi, WifiOff, RefreshCw, Database, Menu } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export default function AppLayout({ apiOnline, onRetry }) {
  const { user } = useAuth();
  const [retrying,    setRetrying]    = useState(false);
  const [processados, setProcessados] = useState(null);
  const [latency,     setLatency]     = useState(null);
  const [menuAberto,  setMenuAberto]  = useState(false);

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
    const id = setInterval(buscar, 120_000); // contador do topo; coleta já concluída
    return () => clearInterval(id);
  }, [apiOnline]);

  if (!user) return <Navigate to="/login" replace />;

  function handleRetry() {
    setRetrying(true);
    onRetry?.();
    setTimeout(() => setRetrying(false), 2000);
  }

  return (
    <div className="app-shell" style={{ display:'flex', overflow:'hidden', background:'var(--bg-deep)' }}>
      <Sidebar aberta={menuAberto} onNavegar={() => setMenuAberto(false)} />
      <div className={`app-backdrop${menuAberto ? ' aberta' : ''}`} onClick={() => setMenuAberto(false)} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* ── Top bar ── */}
        <div style={{
          height: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8, padding: '0 var(--pad-x)',
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          <button className="menu-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu"
            style={{ marginRight:'auto', alignItems:'center', justifyContent:'center', width:32, height:32,
              borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', cursor:'pointer', color:'#1B4332' }}>
            <Menu size={16} />
          </button>

          {/* Coleta badge */}
          {processados != null && (
            <div className="so-desktop" style={{
              display:'flex', alignItems:'center', gap:5,
              background:'rgba(45,106,79,0.07)', border:'1px solid rgba(45,106,79,0.18)',
              borderRadius:20, padding:'3px 10px',
            }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#2D6A4F', animation:'pulse 1.8s infinite', display:'inline-block' }} />
              <Database size={10} color="#2D6A4F" />
              <span style={{ fontSize:10, color:'#2D6A4F', fontWeight:500 }}>
                {processados.toLocaleString('pt-BR')} / 5.571 municípios
              </span>
            </div>
          )}

          {/* API status — 3 estados: conectando (neutro), online, offline */}
          {(() => {
            const est = apiOnline === null
              ? { cor:'#6B7280', fundo:'rgba(107,114,128,0.07)', borda:'rgba(107,114,128,0.2)', texto:'Conectando…', Icone:RefreshCw, girando:true }
              : apiOnline
                ? { cor:'#1A7A3C', fundo:'rgba(26,122,60,0.07)', borda:'rgba(26,122,60,0.2)', texto:`API online${latency ? ` · ${latency} ms` : ''}`, Icone:Wifi }
                : { cor:'#DC2626', fundo:'rgba(220,38,38,0.07)', borda:'rgba(220,38,38,0.2)', texto:'API offline', Icone:WifiOff };
            return (
              <div role="status" aria-live="polite" style={{
                display:'flex', alignItems:'center', gap:5,
                background: est.fundo, border:`1px solid ${est.borda}`,
                borderRadius:20, padding:'3px 10px',
              }}>
                <est.Icone size={10} color={est.cor} style={{ animation: est.girando ? 'spin 1s linear infinite' : 'none' }} />
                <span style={{ fontSize:10, fontWeight:500, color: est.cor }}>{est.texto}</span>
                {apiOnline && <span style={{ width:5, height:5, borderRadius:'50%', background:est.cor, animation:'pulse 2s infinite' }} />}
              </div>
            );
          })()}

          {/* Reconectar — só quando a API está de fato offline */}
          {apiOnline === false && (
            <button onClick={handleRetry} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'4px 10px', borderRadius:20, cursor:'pointer',
              background:'rgba(45,106,79,0.07)', border:'1px solid rgba(45,106,79,0.2)',
              color:'#2D6A4F', fontSize:10, fontWeight:500,
            }}>
              <RefreshCw size={10} style={{ animation: retrying ? 'spin 0.7s linear infinite' : 'none' }} />
              {retrying ? 'Reconectando…' : 'Reconectar'}
            </button>
          )}
        </div>

        <main className="app-main" style={{ flex:1, overflow:'auto' }}>
          <Suspense fallback={<p style={{ padding: 40, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>Carregando…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
