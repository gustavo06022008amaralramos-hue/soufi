import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from 'react-leaflet';
import { Search, X, MapPin, SlidersHorizontal, Map as MapIcon, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import MunicipioSidebar from '../components/sidebar/MunicipioSidebar.jsx';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

/* ── Tiles (sem satélite) ── */
const TILES = {
  labels: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CartoDB',
    subdomains: 'abcd',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CartoDB',
    subdomains: 'abcd',
  },
};

/* ── Paleta ZARC revisada ── */
const CORES = {
  apto:      '#1A7A3C',
  parcial:   '#D4A017',
  inapto:    '#4A90C4',
  sem_dados: '#D1D5DB',
};
const LABEL_CLASS = {
  apto:'Apto', parcial:'Parcialmente Apto', inapto:'Inapto', sem_dados:'Sem dados',
};
const UFS = [
  'Todos','AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ',
  'RN','RO','RR','RS','SC','SE','SP','TO',
];
const BOUNDS_UF = {
  AC:[[-11.1,-74.0],[-7.1,-66.6]],  AL:[[-10.5,-38.2],[-8.8,-35.1]],
  AM:[[-9.9,-73.8],[2.3,-56.1]],    AP:[[-1.3,-52.0],[4.4,-49.9]],
  BA:[[-18.4,-46.6],[-8.5,-37.3]],  CE:[[-7.8,-41.4],[-2.8,-37.2]],
  DF:[[-16.1,-48.3],[-15.5,-47.3]], ES:[[-21.3,-41.9],[-17.8,-39.7]],
  GO:[[-19.5,-53.3],[-12.4,-45.9]], MA:[[-10.4,-48.7],[-1.0,-41.8]],
  MG:[[-22.9,-51.0],[-14.2,-39.9]], MS:[[-24.1,-57.7],[-17.2,-50.9]],
  MT:[[-18.1,-61.7],[-7.4,-50.2]],  PA:[[-9.9,-58.7],[2.6,-46.0]],
  PB:[[-8.3,-38.8],[-6.0,-34.8]],   PE:[[-9.5,-41.4],[-7.2,-34.9]],
  PI:[[-11.1,-45.9],[-2.8,-40.4]],  PR:[[-26.7,-54.6],[-22.5,-48.0]],
  RJ:[[-23.4,-44.9],[-20.8,-40.9]], RN:[[-6.9,-38.6],[-4.8,-35.0]],
  RO:[[-13.7,-66.8],[-7.9,-59.8]],  RR:[[-1.4,-64.8],[5.3,-59.8]],
  RS:[[-33.8,-57.7],[-27.1,-49.7]], SC:[[-29.4,-53.9],[-25.9,-48.4]],
  SE:[[-11.6,-38.2],[-9.5,-36.4]],  SP:[[-25.3,-53.2],[-19.8,-44.2]],
  TO:[[-13.5,-50.8],[-5.2,-45.7]],
};

function getClassificacao(dados) {
  if (!dados || dados.score_aptidao == null) return 'sem_dados';
  if (dados.score_aptidao >= 70) return 'apto';
  if (dados.score_aptidao >= 40) return 'parcial';
  return 'inapto';
}

function isVisible(props, { filtroUF, filtroClasse, filtroScoreMin }) {
  if (!filtroClasse[props._classe]) return false;
  if (filtroUF !== 'Todos' && props._dados?.uf !== filtroUF) return false;
  if (props._dados?.score_aptidao != null && props._dados.score_aptidao < filtroScoreMin) return false;
  return true;
}

function getEstiloBase(cor, dark) {
  return {
    fillColor: cor,
    fillOpacity: dark ? 0.80 : 0.72,
    weight: dark ? 0.5 : 0.4,
    color: dark ? '#888888' : '#666666AA',
    opacity: 0.8,
  };
}
const ESTILO_HOVER     = { weight: 2, color: '#111111', fillOpacity: 0.93 };
const ESTILO_OCULTO    = { fillOpacity: 0, weight: 0, opacity: 0 };
const ESTILO_SELECIONADO = { weight: 3.5, color: '#FFFFFF', opacity: 1, fillOpacity: 1.0 };

function norm(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ── Controllers ── */
function FlyToBoundsController({ bounds }) {
  const map  = useMap();
  const prev = useRef('init');
  useEffect(() => {
    const key = bounds ? JSON.stringify(bounds) : null;
    if (key === prev.current) return;
    const wasInit = prev.current === 'init';
    prev.current  = key;
    if (bounds) map.fitBounds(bounds, { padding:[30,30], animate:true });
    else if (!wasInit) map.flyTo([-15.78,-47.93], 4, { duration:0.9 });
  }, [bounds, map]);
  return null;
}

function FlyToMunController({ centro }) {
  const map  = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!centro) return;
    const key = `${centro[0]},${centro[1]}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(centro, 8, { duration:0.9 });
  }, [centro, map]);
  return null;
}

/* Ctrl+scroll para zoom */
function CtrlScrollZoom() {
  const map = useMap();
  const [hint, setHint] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const container = map.getContainer();
    map.scrollWheelZoom.disable();

    const onWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        map.scrollWheelZoom.enable();
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => map.scrollWheelZoom.disable(), 500);
      } else {
        setHint(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setHint(false), 1800);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [map]);

  if (!hint) return null;
  return (
    <div className="ctrl-scroll-hint visible" style={{ position:'absolute', bottom:50, left:'50%', transform:'translateX(-50%)', zIndex:999 }}>
      Pressione Ctrl + scroll para dar zoom
    </div>
  );
}

/* ── Painel base ── */
function Panel({ children, style={} }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.97)',
      border:'1px solid rgba(0,0,0,0.07)',
      borderRadius:12,
      boxShadow:'0 4px 20px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.05)',
      backdropFilter:'blur(10px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Painel de controles ── */
function ControlPanel({ tipoMapa, setTipoMapa, filtroUF, setFiltroUF, filtroClasse, setFiltroClasse, filtroScoreMin, setFiltroScoreMin }) {
  const lbl = { display:'block', fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:1.2, marginBottom:7 };
  return (
    <Panel style={{ padding:'13px 13px', width:214, display:'flex', flexDirection:'column', gap:13 }}>

      {/* Mapa base */}
      <div>
        <label style={lbl}>Mapa Base</label>
        <div style={{ display:'flex', gap:4 }}>
          {[
            { k:'labels', icon:<MapIcon size={11}/>, label:'Mapa'   },
            { k:'dark',   icon:<Layers  size={11}/>, label:'Escuro' },
          ].map(o => (
            <button key={o.k} onClick={() => setTipoMapa(o.k)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 4px', borderRadius:8, border:'none', cursor:'pointer',
              background: tipoMapa===o.k ? 'rgba(45,106,79,0.12)' : '#F0F7F2',
              color:      tipoMapa===o.k ? '#1B4332' : '#6B7280',
              fontWeight: tipoMapa===o.k ? 700 : 400,
              fontSize:9, transition:'all 0.15s',
            }}>
              {o.icon}{o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Classificação */}
      <div>
        <label style={lbl}>Classificação ZARC</label>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {Object.entries(CORES).map(([k, cor]) => (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={filtroClasse[k]??true}
                onChange={() => setFiltroClasse(f => ({...f,[k]:!f[k]}))}
                style={{ accentColor:cor, width:13, height:13, cursor:'pointer', flexShrink:0 }}
              />
              <span style={{ width:10, height:10, borderRadius:3, background:cor, flexShrink:0, display:'inline-block' }} />
              <span style={{ fontSize:11, color:'#374151' }}>{LABEL_CLASS[k]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div>
        <label style={lbl}>Estado</label>
        <select value={filtroUF} onChange={e => setFiltroUF(e.target.value)} style={{
          width:'100%', background:'#F0F7F2', border:'1px solid #D1D5DB',
          color:'#374151', fontSize:11, padding:'5px 8px',
          borderRadius:7, cursor:'pointer', outline:'none',
        }}>
          {UFS.map(uf => <option key={uf} value={uf}>{uf==='Todos'?'Todos os estados':uf}</option>)}
        </select>
      </div>

      {/* Score mínimo */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
          <label style={lbl}>
            <SlidersHorizontal size={9} style={{ display:'inline', marginRight:4 }} />Score Mínimo
          </label>
          <span style={{ fontSize:14, fontWeight:800, color:'#2D6A4F' }}>{filtroScoreMin}</span>
        </div>
        <input type="range" min={0} max={100} step={1} value={filtroScoreMin}
          onChange={e => setFiltroScoreMin(+e.target.value)}
        />
      </div>
    </Panel>
  );
}

/* ── Legenda ── */
function Legend({ counts }) {
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  return (
    <Panel style={{ padding:'10px 12px' }}>
      <p style={{ fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>
        Legenda · Aptidão ZARC
      </p>
      {Object.entries(CORES).map(([k,cor]) => (
        <div key={k} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
          <div style={{ width:11, height:11, borderRadius:3, background:cor, flexShrink:0 }} />
          <span style={{ flex:1, fontSize:10, color:'#374151' }}>{LABEL_CLASS[k]}</span>
          <span style={{ fontSize:10, fontWeight:600, color:'#6B7280', minWidth:28, textAlign:'right' }}>
            {(counts[k]??0).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
      <div style={{ borderTop:'1px solid #E5E7EB', marginTop:6, paddingTop:6 }}>
        <span style={{ fontSize:9, color:'#6B7280' }}>{total.toLocaleString('pt-BR')} exibidos</span>
      </div>
    </Panel>
  );
}

const LABEL_BUSCA = { apto:'Apto', parcial:'Parc.', inapto:'Inapto', sem_dados:'—' };

/* ── SearchBar melhorada ── */
function SearchBar({ municipios, onSelect }) {
  const [query,  setQuery]  = useState('');
  const [aberto, setAberto] = useState(false);
  const [foco,   setFoco]   = useState(-1);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  /* Atalho / para focar a busca */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const resultados = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return [];
    return municipios
      .filter(m => m.lat && m.lon)
      .filter(m =>
        norm(m.nome_municipio).includes(q) ||
        norm(m.uf).startsWith(q) ||
        (m.codigo_ibge ?? '').startsWith(q)
      )
      .sort((a, b) => {
        const na = norm(a.nome_municipio), nb = norm(b.nome_municipio);
        const sa = na.startsWith(q) ? 0 : 1;
        const sb = nb.startsWith(q) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        /* aptos primeiro */
        const ca = getClassificacao(a) === 'apto' ? 0 : 1;
        const cb = getClassificacao(b) === 'apto' ? 0 : 1;
        if (ca !== cb) return ca - cb;
        return a.nome_municipio.localeCompare(b.nome_municipio);
      })
      .slice(0, 12);
  }, [query, municipios]);

  function selecionar(m) {
    onSelect(m);
    setQuery(`${m.nome_municipio} — ${m.uf}`);
    setAberto(false);
    setFoco(-1);
  }
  function limpar() { setQuery(''); setAberto(false); setFoco(-1); inputRef.current?.focus(); }
  function onKey(e) {
    if (!aberto || !resultados.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFoco(f => Math.min(f + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFoco(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (foco >= 0) selecionar(resultados[foco]);
      else if (resultados.length === 1) selecionar(resultados[0]);
    }
    if (e.key === 'Escape') { setAberto(false); setFoco(-1); }
  }
  useEffect(() => {
    if (foco >= 0 && listRef.current) listRef.current.children[foco]?.scrollIntoView({ block: 'nearest' });
  }, [foco]);

  const semResultado = aberto && query.length >= 2 && resultados.length === 0;

  return (
    <div style={{ position: 'relative', width: 340 }}>
      <Panel style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 12,
        outline: aberto ? '2px solid rgba(45,106,79,0.45)' : 'none', outlineOffset: 1,
      }}>
        <Search size={13} color="#2D6A4F" style={{ flexShrink: 0 }} />
        <input ref={inputRef} value={query}
          onChange={e => { setQuery(e.target.value); setAberto(true); setFoco(-1); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 160)}
          onKeyDown={onKey}
          placeholder="Buscar município, UF ou código IBGE..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#374151' }}
        />
        {query
          ? <button onClick={limpar} style={{ background:'none',border:'none',cursor:'pointer',padding:0,display:'flex' }}>
              <X size={13} color="#6B7280" />
            </button>
          : <kbd style={{ fontSize:9, color:'#9CA3AF', background:'#F3F4F6',
              border:'1px solid #E5E7EB', borderRadius:4, padding:'1px 5px' }}>/</kbd>
        }
      </Panel>

      {(aberto && resultados.length > 0) && (
        <div ref={listRef} style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.14)',
          maxHeight: 340, overflowY: 'auto', zIndex: 2000,
        }}>
          <div style={{ padding:'6px 12px 4px', fontSize:9, color:'#9CA3AF',
            textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid #F3F4F6' }}>
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} · ↑↓ navegar · Enter selecionar
          </div>
          {resultados.map((m, i) => {
            const cl  = getClassificacao(m);
            const cor = CORES[cl];
            const t   = m.temp_media_anual;
            const alt = m.altitude;
            return (
              <button key={m.codigo_ibge} onMouseDown={() => selecionar(m)} onMouseEnter={() => setFoco(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: i === foco ? '#F0F7F2' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: i < resultados.length - 1 ? '1px solid #F9FAFB' : 'none',
                  transition: 'background 0.1s',
                }}>
                {/* Indicador de cor */}
                <div style={{ width:10, height:10, borderRadius:3, background:cor, flexShrink:0 }} />
                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.2 }}>
                    {m.nome_municipio}
                    <span style={{ fontSize:10, fontWeight:400, color:'#9CA3AF', marginLeft:6 }}>{m.uf}</span>
                  </p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                    {t != null ? `${t.toFixed(1)}°C` : '—'}
                    {alt != null ? ` · ${Math.round(alt)}m` : ''}
                    {' · '}IBGE {m.codigo_ibge}
                  </p>
                </div>
                {/* Score + label */}
                {m.score_aptidao != null && (
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:cor, lineHeight:1 }}>{m.score_aptidao}</p>
                    <p style={{ fontSize:8, color:cor, fontWeight:600 }}>{LABEL_BUSCA[cl]}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {semResultado && (
        <Panel style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0,
          padding:'12px 14px', zIndex:2000 }}>
          <p style={{ fontSize:12, color:'#9CA3AF', textAlign:'center' }}>
            Nenhum município encontrado para "<strong>{query}</strong>"
          </p>
        </Panel>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ════════════════════════════════════════════════ */
export default function ZoneamentoPage({ municipios=[], loadingMapa=false }) {
  const [tipoMapa,       setTipoMapa]       = useState('labels');
  const [filtroUF,       setFiltroUF]       = useState('Todos');
  const [filtroClasse,   setFiltroClasse]   = useState({ apto:true, parcial:true, inapto:true, sem_dados:true });
  const [filtroScoreMin, setFiltroScoreMin] = useState(0);
  const [selecionado,    setSelecionado]    = useState(null);
  const [sazonalidade,   setSazonalidade]   = useState(null);
  const [loadingSazon,   setLoadingSazon]   = useState(false);
  const [geojsonData,    setGeojsonData]    = useState(null);
  const [loadingGeo,     setLoadingGeo]     = useState(true);
  const [mapBounds,      setMapBounds]      = useState(null);

  const geojsonRef       = useRef(null);
  const infoRef          = useRef(null);
  const filterRef        = useRef({ filtroUF, filtroClasse, filtroScoreMin });
  const tipoMapaRef      = useRef(tipoMapa);
  const onSelectRef      = useRef(null);
  const selectedLayerRef = useRef(null); // { layer, props }

  useEffect(() => {
    fetch('/geojson/municipios_br.json')
      .then(r=>r.json()).then(d=>{ setGeojsonData(d); setLoadingGeo(false); })
      .catch(()=>setLoadingGeo(false));
  }, []);

  useEffect(() => { filterRef.current = { filtroUF, filtroClasse, filtroScoreMin }; }, [filtroUF, filtroClasse, filtroScoreMin]);
  useEffect(() => { tipoMapaRef.current = tipoMapa; }, [tipoMapa]);
  useEffect(() => { setMapBounds(filtroUF!=='Todos' ? (BOUNDS_UF[filtroUF]??null) : null); }, [filtroUF]);

  /* Atualiza estilos quando filtros mudam */
  useEffect(() => {
    if (!geojsonRef.current) return;
    const dark = tipoMapa === 'dark';
    geojsonRef.current.eachLayer(layer => {
      if (!layer.feature) return;
      const p = layer.feature.properties;
      if (!isVisible(p, { filtroUF, filtroClasse, filtroScoreMin })) {
        layer.setStyle(ESTILO_OCULTO);
      } else if (selectedLayerRef.current?.layer === layer) {
        layer.setStyle({ ...getEstiloBase(CORES[p._classe], dark), ...ESTILO_SELECIONADO });
      } else {
        layer.setStyle(getEstiloBase(CORES[p._classe], dark));
      }
    });
  }, [filtroUF, filtroClasse, filtroScoreMin]);

  /* Atualiza opacidade/borda quando muda entre claro/escuro */
  useEffect(() => {
    if (!geojsonRef.current) return;
    const dark = tipoMapa === 'dark';
    geojsonRef.current.eachLayer(layer => {
      if (!layer.feature) return;
      const p = layer.feature.properties;
      if (!isVisible(p, filterRef.current)) return;
      if (selectedLayerRef.current?.layer === layer) {
        layer.setStyle({ ...getEstiloBase(CORES[p._classe], dark), ...ESTILO_SELECIONADO });
      } else {
        layer.setStyle(getEstiloBase(CORES[p._classe], dark));
      }
    });
  }, [tipoMapa]);

  const onSelect = useCallback((m) => {
    setSelecionado(m); setSazonalidade(null);
    if (!m) return;
    setLoadingSazon(true);
    fetch(`${API}/sazonalidade/${m.codigo_ibge}`)
      .then(r=>r.json()).then(d=>setSazonalidade(d.calendario??[]))
      .catch(()=>setSazonalidade([])).finally(()=>setLoadingSazon(false));
  }, []);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  /* Destaca o layer do município selecionado (clique ou pesquisa) */
  useEffect(() => {
    if (!geojsonRef.current) return;
    // Remove destaque do layer anterior
    if (selectedLayerRef.current) {
      const { layer, props } = selectedLayerRef.current;
      if (isVisible(props, filterRef.current)) {
        layer.setStyle(getEstiloBase(CORES[props._classe], tipoMapaRef.current === 'dark'));
      }
      selectedLayerRef.current = null;
    }
    if (!selecionado) return;
    // Encontra e destaca o layer correspondente
    geojsonRef.current.eachLayer(layer => {
      if (!layer.feature) return;
      const p = layer.feature.properties;
      if (String(p.codarea) === String(selecionado.codigo_ibge)) {
        layer.setStyle({
          ...getEstiloBase(CORES[p._classe], tipoMapaRef.current === 'dark'),
          ...ESTILO_SELECIONADO,
        });
        layer.bringToFront();
        selectedLayerRef.current = { layer, props: p };
      }
    });
  }, [selecionado]);

  const dadosMap = useMemo(() => {
    const m = new Map();
    municipios.forEach(mun => m.set(mun.codigo_ibge, mun));
    return m;
  }, [municipios]);

  const geojsonComDados = useMemo(() => {
    if (!geojsonData) return null;
    return {
      ...geojsonData,
      features: geojsonData.features.map(f => {
        const cod   = String(f.properties?.codarea ?? '');
        const dados = dadosMap.get(cod);
        return { ...f, properties:{ ...f.properties, _dados:dados??null, _classe:getClassificacao(dados) } };
      }),
    };
  }, [geojsonData, dadosMap]);

  /* Contagem para legenda */
  const counts = useMemo(() => {
    const c = { apto:0, parcial:0, inapto:0, sem_dados:0 };
    if (!geojsonComDados) return c;
    const f = { filtroUF, filtroClasse, filtroScoreMin };
    geojsonComDados.features.forEach(ft => {
      if (isVisible(ft.properties, f)) c[ft.properties._classe]++;
    });
    return c;
  }, [geojsonComDados, filtroUF, filtroClasse, filtroScoreMin]);

  /* Stats do estado selecionado (para a info bar) */
  const statsEstado = useMemo(() => {
    if (filtroUF==='Todos' || !municipios.length) return null;
    const muns = municipios.filter(m=>m.uf===filtroUF);
    if (!muns.length) return null;
    return {
      total:   muns.length,
      aptos:   muns.filter(m=>m.score_aptidao>=70).length,
      parciais:muns.filter(m=>m.score_aptidao>=40 && m.score_aptidao<70).length,
      inaptos: muns.filter(m=>m.score_aptidao<40).length,
    };
  }, [municipios, filtroUF]);

  const infoBarDefault = filtroUF!=='Todos' && statsEstado
    ? `${filtroUF} — ${statsEstado.total} municípios · ${statsEstado.aptos} Aptos · ${statsEstado.parciais} Parc. Aptos · ${statsEstado.inaptos} Inaptos`
    : 'SOUFII · Zoneamento de Aptidão para Cevada Cervejeira · Brasil';

  const styleFunc = useCallback((f) => {
    const p = f.properties;
    if (!isVisible(p, filterRef.current)) return ESTILO_OCULTO;
    return getEstiloBase(CORES[p._classe], tipoMapaRef.current==='dark');
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    layer.on({
      mouseover: (e) => {
        if (!isVisible(props, filterRef.current)) return;
        e.target.setStyle(ESTILO_HOVER);
        if (infoRef.current) {
          const d = props._dados;
          infoRef.current.textContent = d
            ? `📍 ${d.nome_municipio} / ${d.uf}  ·  Score ${d.score_aptidao??'—'}/100  ·  ${LABEL_CLASS[props._classe]}`
            : `${props.codarea??'—'}  ·  Sem dados`;
        }
      },
      mouseout: (e) => {
        if (infoRef.current) infoRef.current.textContent = '';
        if (selectedLayerRef.current?.layer === e.target) return; // mantém destaque
        if (isVisible(props, filterRef.current)) {
          e.target.setStyle(getEstiloBase(CORES[props._classe], tipoMapaRef.current==='dark'));
        }
      },
      click: () => {
        if (!isVisible(props, filterRef.current)) return;
        if (props._dados) onSelectRef.current?.(props._dados);
      },
    });
  }, []);

  const tile    = TILES[tipoMapa] ?? TILES.labels;
  const centro  = selecionado?.lat != null ? [selecionado.lat, selecionado.lon] : null;
  const dataKey = `geo-${geojsonComDados?.features?.length??0}-${dadosMap.size}`;

  return (
    <div style={{ display:'flex', height:'100%', margin:-24, overflow:'hidden' }}>

      {/* ══ Mapa ══ */}
      <div style={{ flex:1, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Barra de info */}
        <div style={{
          flexShrink:0, height:33, zIndex:1001,
          background:'#1B4332',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 16px', gap:16,
        }}>
          <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap', letterSpacing:0.3 }}>
            {infoBarDefault}
          </span>
          <span ref={infoRef} style={{ fontSize:10, color:'rgba(183,228,199,0.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }} />
        </div>

        {/* Área do mapa */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          {/* Busca */}
          <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:1000 }}>
            <SearchBar municipios={municipios} onSelect={onSelect} />
          </div>

          {/* Controles */}
          <div style={{ position:'absolute', top:12, left:14, zIndex:1000 }}>
            <ControlPanel
              tipoMapa={tipoMapa}         setTipoMapa={setTipoMapa}
              filtroUF={filtroUF}         setFiltroUF={setFiltroUF}
              filtroClasse={filtroClasse} setFiltroClasse={setFiltroClasse}
              filtroScoreMin={filtroScoreMin} setFiltroScoreMin={setFiltroScoreMin}
            />
          </div>

          {/* Legenda */}
          <div style={{ position:'absolute', bottom:46, left:14, zIndex:1000 }}>
            <Legend counts={counts} />
          </div>

          {/* Loading */}
          {(loadingMapa || loadingGeo) && (
            <div style={{
              position:'absolute', inset:0, zIndex:900,
              background:'rgba(250,250,248,0.9)', backdropFilter:'blur(6px)',
              display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14,
            }}>
              <div style={{
                width:40, height:40, borderRadius:'50%',
                border:'3px solid #D1D5DB', borderTopColor:'#2D6A4F',
                animation:'spin 0.8s linear infinite',
              }} />
              <p style={{ fontSize:13, fontWeight:600, color:'#374151' }}>
                {loadingGeo ? 'Carregando geometrias dos municípios…' : 'Carregando dados…'}
              </p>
            </div>
          )}

          <MapContainer
            center={[-15.78,-47.93]} zoom={4}
            minZoom={4} maxZoom={9}
            maxBounds={[[-36,-75],[6,-28]]}
            zoomControl={false} attributionControl={true}
            scrollWheelZoom={false}
            style={{ width:'100%', height:'100%', background:'#d8e8db' }}
          >
            <TileLayer key={tipoMapa} url={tile.url} attribution={tile.attribution} subdomains={tile.subdomains} maxZoom={19} />
            <ZoomControl position="bottomright" />
            <FlyToBoundsController bounds={mapBounds} />
            <FlyToMunController centro={centro} />
            <CtrlScrollZoom />
            {geojsonComDados && (
              <GeoJSON
                key={dataKey}
                ref={geojsonRef}
                data={geojsonComDados}
                style={styleFunc}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ══ Sidebar ══ */}
      <MunicipioSidebar
        municipio={selecionado}
        sazonalidade={sazonalidade}
        loading={loadingSazon}
        onClose={() => onSelect(null)}
      />
    </div>
  );
}
