import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapContainer, TileLayer, CircleMarker,
  GeoJSON, Popup, ZoomControl, useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TILES = {
  labels: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CartoDB</a>',
    subdomains: 'abcd', maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CartoDB</a>',
    subdomains: 'abcd', maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, DigitalGlobe',
    subdomains: '', maxZoom: 19,
  },
};

/* ── Mapeamentos IBGE ── */
const IBGE_ID_TO_REGIAO = { 1:'Norte', 2:'Nordeste', 3:'Sudeste', 4:'Sul', 5:'Centro-Oeste' };
const IBGE_CODE_TO_UF   = {
  11:'RO', 12:'AC', 13:'AM', 14:'RR', 15:'PA', 16:'AP', 17:'TO',
  21:'MA', 22:'PI', 23:'CE', 24:'RN', 25:'PB', 26:'PE', 27:'AL', 28:'SE', 29:'BA',
  31:'MG', 32:'ES', 33:'RJ', 35:'SP',
  41:'PR', 42:'SC', 43:'RS',
  50:'MS', 51:'MT', 52:'GO', 53:'DF',
};

/* ── Paleta ── */
const CORES_REGIOES = {
  Norte:'#06b6d4', Nordeste:'#f97316',
  'Centro-Oeste':'#8b5cf6', Sudeste:'#3b82f6', Sul:'#10b981',
};

const CORES_UF = {
  AM:'#0369a1', PA:'#0284c7', AC:'#0891b2', RO:'#06b6d4', AP:'#22d3ee', RR:'#67e8f9', TO:'#a5f3fc',
  BA:'#b45309', MA:'#d97706', PI:'#f59e0b', CE:'#fbbf24', RN:'#78350f', PB:'#c05621', PE:'#ea580c', AL:'#f97316', SE:'#fb923c',
  MT:'#6d28d9', GO:'#7c3aed', MS:'#8b5cf6', DF:'#a78bfa',
  MG:'#1e3a8a', SP:'#1e40af', RJ:'#1d4ed8', ES:'#2563eb',
  PR:'#14532d', RS:'#166534', SC:'#15803d',
};

function scoreColor(s) {
  if (s >= 83) return '#16a34a';
  if (s >= 70) return '#65a30d';
  if (s >= 50) return '#c57e15';
  if (s >= 33) return '#ea6c0a';
  return '#94a3b8';
}

function fid(f) {
  return parseInt(f.id ?? f.properties?.codarea ?? f.properties?.id ?? '0', 10);
}

/* ── Controllers de voo ── */
function FlyToBoundsController({ bounds }) {
  const map  = useMap();
  const prev = useRef('init');
  useEffect(() => {
    const key = bounds ? JSON.stringify(bounds) : null;
    if (key === prev.current) return;
    const wasInit = prev.current === 'init';
    prev.current  = key;
    if (bounds) {
      map.fitBounds(bounds, { padding: [48, 48], animate: true, duration: 0.9 });
    } else if (!wasInit) {
      map.flyTo([-15.5, -52.0], 4, { duration: 1.0 });
    }
  }, [bounds, map]);
  return null;
}

function FlyController({ centro }) {
  const map  = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!centro) return;
    const key = `${centro[0]},${centro[1]}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(centro, 11, { duration: 1.0 });
  }, [centro, map]);
  return null;
}

export default function MapComponent({
  municipios  = [],
  selecionado,
  onSelect,
  tipoMapa    = 'labels',
  filtroScore = 0,
  mapBounds   = null,
  nivel       = 0,
  regiaoSel   = null,
  ufsRegiao   = [],
  geojsonRegioes = null,
  geojsonEstados = null,
  onClickRegiao,
  onClickEstado,
}) {
  const tile     = TILES[tipoMapa] ?? TILES.labels;
  const visiveis = municipios.filter(
    m => m.lat != null && m.lon != null && (m.score_aptidao ?? 0) >= filtroScore
  );
  const centro = selecionado?.lat != null ? [selecionado.lat, selecionado.lon] : null;

  /* Filtra estados da região selecionada */
  const geojsonEstadosFiltrado = useMemo(() => {
    if (!geojsonEstados || !ufsRegiao.length) return null;
    const ufsSet   = new Set(ufsRegiao);
    const features = (geojsonEstados.features ?? []).filter(f => {
      const uf = IBGE_CODE_TO_UF[fid(f)];
      return uf && ufsSet.has(uf);
    });
    return features.length ? { ...geojsonEstados, features } : null;
  }, [geojsonEstados, ufsRegiao]);

  /* ── Estilo e evento: Regiões ── */
  const styleRegiao = useCallback((f) => {
    const cor = CORES_REGIOES[IBGE_ID_TO_REGIAO[fid(f)]] ?? '#94a3b8';
    return { fillColor: cor, fillOpacity: 0.38, color: '#fff', weight: 2 };
  }, []);

  const onEachRegiao = useCallback((f, layer) => {
    const nome = IBGE_ID_TO_REGIAO[fid(f)];
    if (!nome) return;
    layer.on({
      click:     () => onClickRegiao?.(nome),
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.62, weight: 2.5 }); },
      mouseout:  (e) => { e.target.setStyle({ fillOpacity: 0.38, weight: 2 }); },
    });
    layer.bindTooltip(nome, { sticky: true, direction: 'top' });
  }, [onClickRegiao]);

  /* ── Estilo e evento: Estados ── */
  const styleEstado = useCallback((f) => {
    const cor = CORES_UF[IBGE_CODE_TO_UF[fid(f)]] ?? '#94a3b8';
    return { fillColor: cor, fillOpacity: 0.46, color: '#fff', weight: 2 };
  }, []);

  const onEachEstado = useCallback((f, layer) => {
    const uf = IBGE_CODE_TO_UF[fid(f)];
    if (!uf) return;
    layer.on({
      click:     () => onClickEstado?.(uf),
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.70, weight: 2.5 }); },
      mouseout:  (e) => { e.target.setStyle({ fillOpacity: 0.46, weight: 2 }); },
    });
    layer.bindTooltip(uf, { sticky: true, direction: 'top' });
  }, [onClickEstado]);

  return (
    <MapContainer
      center={[-15.5, -52.0]}
      zoom={4}
      minZoom={3}
      maxZoom={18}
      zoomControl={false}
      attributionControl={true}
      style={{ width: '100%', height: '100%', background: '#dde8e0' }}
    >
      <TileLayer
        key={tipoMapa}
        url={tile.url}
        attribution={tile.attribution}
        subdomains={tile.subdomains}
        maxZoom={tile.maxZoom}
      />

      {/* Zoom no canto inferior direito para não colidir com os painéis */}
      <ZoomControl position="bottomright" />

      <FlyToBoundsController bounds={mapBounds} />
      <FlyController centro={centro} />

      {nivel === 0 && geojsonRegioes && (
        <GeoJSON
          key="regioes"
          data={geojsonRegioes}
          style={styleRegiao}
          onEachFeature={onEachRegiao}
        />
      )}

      {nivel === 1 && geojsonEstadosFiltrado && (
        <GeoJSON
          key={`estados-${regiaoSel}`}
          data={geojsonEstadosFiltrado}
          style={styleEstado}
          onEachFeature={onEachEstado}
        />
      )}

      {visiveis.map(m => {
        const cor   = scoreColor(m.score_aptidao ?? 0);
        const isSel = selecionado?.codigo_ibge === m.codigo_ibge;
        return (
          <CircleMarker
            key={m.codigo_ibge}
            center={[m.lat, m.lon]}
            radius={isSel ? 10 : 6}
            pathOptions={{
              fillColor:   cor,
              color:       isSel ? '#fff' : cor,
              weight:      isSel ? 2.5 : 0.5,
              opacity:     1,
              fillOpacity: isSel ? 1 : 0.78,
            }}
            eventHandlers={{ click: () => onSelect(m) }}
          >
            <Popup>
              <div style={{ padding: '14px 16px', minWidth: 180 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
                  {m.nome_municipio}
                  <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 11 }}> — {m.uf}</span>
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 2 }}>SCORE ZARC</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: cor }}>{m.score_aptidao ?? '—'}</p>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-card2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 2 }}>SOLO TIPO</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{m.tipo_solo_zarc ?? '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSelect(m)}
                  style={{
                    width: '100%', background: 'linear-gradient(90deg,#059669,#0891b2)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontSize: 11, fontWeight: 600, padding: '7px 0', cursor: 'pointer',
                    letterSpacing: 0.2,
                  }}
                >
                  Ver análise completa →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
