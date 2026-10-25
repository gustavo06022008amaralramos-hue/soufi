import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppLayout      from './components/layout/AppLayout.jsx';
import LoginPage      from './pages/LoginPage.jsx';
// Páginas carregadas sob demanda: o bundle único passava de 1,1 MB (Leaflet,
// Recharts e as páginas grandes iam todos no primeiro carregamento).
const HomePage          = lazy(() => import('./pages/HomePage.jsx'));
const ZoneamentoPage    = lazy(() => import('./pages/ZoneamentoPage.jsx'));
const HistoricosPage    = lazy(() => import('./pages/HistoricosPage.jsx'));
const VariedadesPage    = lazy(() => import('./pages/VariedadesPage.jsx'));
const NoticiasPage      = lazy(() => import('./pages/NoticiasPage.jsx'));
const ParceirosPage     = lazy(() => import('./pages/ParceirosPage.jsx'));
const OportunidadesPage = lazy(() => import('./pages/OportunidadesPage.jsx'));
const ManualPage        = lazy(() => import('./pages/ManualPage.jsx'));
const CustosPage        = lazy(() => import('./pages/CustosPage.jsx'));
const CompararPage      = lazy(() => import('./pages/CompararPage.jsx'));

function CarregandoPagina() {
  return <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>Carregando…</div>;
}

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
const RETRY_OFFLINE = 10_000; // re-tenta a cada 10s quando offline
const RETRY_ONLINE  = 20_000; // re-verifica a cada 20s quando online (coleta ativa)

export default function App() {
  const [municipios,  setMunicipios]  = useState([]);
  const [loadingMapa, setLoadingMapa] = useState(true);
  const [apiOnline,   setApiOnline]   = useState(null);

  const fetchDados = useCallback((silencioso = false) => {
    if (!silencioso) setLoadingMapa(true);
    fetch(`${API}/municipios/mapa`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('status ' + r.status);
        setApiOnline(true);
        return r.json();
      })
      .then(d => {
        setMunicipios(d.municipios ?? []);
        setLoadingMapa(false);
      })
      .catch(() => {
        setApiOnline(false);
        if (!silencioso) setLoadingMapa(false);
        // retry rápido se o fetch inicial falhou (ex: API reiniciando)
        if (!silencioso) setTimeout(() => fetchDados(false), 4_000);
      });
  }, []);

  // Carga inicial
  useEffect(() => { fetchDados(); }, [fetchDados]);

  // Re-tenta automaticamente quando offline; atualiza dados quando online
  useEffect(() => {
    const intervalo = setInterval(
      () => fetchDados(true),
      apiOnline ? RETRY_ONLINE : RETRY_OFFLINE
    );
    return () => clearInterval(intervalo);
  }, [apiOnline, fetchDados]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout apiOnline={apiOnline} onRetry={() => fetchDados()} />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home"       element={<HomePage municipios={municipios} apiOnline={apiOnline} />} />
            <Route path="/zoneamento" element={<ZoneamentoPage municipios={municipios} loadingMapa={loadingMapa} />} />
            <Route path="/historicos" element={<HistoricosPage municipios={municipios} />} />
            <Route path="/variedades" element={<VariedadesPage />} />
            <Route path="/noticias"   element={<NoticiasPage />} />
            <Route path="/parceiros"      element={<ParceirosPage />} />
            <Route path="/oportunidades"  element={<OportunidadesPage municipios={municipios} />} />
            <Route path="/manual"         element={<ManualPage />} />
            <Route path="/custos"         element={<CustosPage />} />
            <Route path="/comparar"       element={<CompararPage municipios={municipios} />} />
            <Route path="*"           element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
