import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppLayout      from './components/layout/AppLayout.jsx';
import LoginPage      from './pages/LoginPage.jsx';
import HomePage       from './pages/HomePage.jsx';
import ZoneamentoPage from './pages/ZoneamentoPage.jsx';
import HistoricosPage from './pages/HistoricosPage.jsx';
import VariedadesPage from './pages/VariedadesPage.jsx';
import NoticiasPage   from './pages/NoticiasPage.jsx';
import ParceirosPage      from './pages/ParceirosPage.jsx';
import OportunidadesPage  from './pages/OportunidadesPage.jsx';
import ManualPage         from './pages/ManualPage.jsx';
import CustosPage         from './pages/CustosPage.jsx';
import CompararPage       from './pages/CompararPage.jsx';

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
      </AuthProvider>
    </BrowserRouter>
  );
}
