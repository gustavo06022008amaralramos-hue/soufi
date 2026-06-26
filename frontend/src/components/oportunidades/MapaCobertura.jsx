import { useRef } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Popup, ZoomControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const UFS_COM_SEGURO = new Set(['PR', 'SC', 'RS', 'GO']);

function getCor(m) {
  const score = m.score_aptidao ?? 0;
  if (score < 40) return { fill: '#94a3b8', stroke: '#64748b', categoria: 'inapto' };
  const temSeguro = UFS_COM_SEGURO.has(m.uf) && score >= 70;
  if (temSeguro) return { fill: '#15803d', stroke: '#14532d', categoria: 'apto_seguro' };
  return { fill: '#f97316', stroke: '#c2410c', categoria: 'oportunidade' };
}

const LEGENDA = [
  { cor: '#15803d', stroke: '#14532d', label: 'Apto + Seguro ativo' },
  { cor: '#f97316', stroke: '#c2410c', label: 'Apto ZARC — sem seguro (oportunidade)' },
  { cor: '#94a3b8', stroke: '#64748b', label: 'Inapto / dados insuficientes' },
];

export default function MapaCobertura({ dados = [], onSelect, selected }) {
  const mapRef = useRef(null);

  const contagens = dados.reduce((acc, m) => {
    const c = getCor(m).categoria;
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ position: 'relative' }}>
      {/* Legenda */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.96)', border: '1px solid #E5E7EB',
        borderRadius: 10, padding: '12px 14px', minWidth: 220,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Cobertura de Seguro
        </p>
        {LEGENDA.map(({ cor, stroke, label }, i) => {
          const cat = ['apto_seguro', 'oportunidade', 'inapto'][i];
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: cor, border: `2px solid ${stroke}`, flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: '#374151', flex: 1 }}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>
                {contagens[cat] ?? 0}
              </span>
            </div>
          );
        })}
        <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 8, paddingTop: 8 }}>
          <p style={{ fontSize: 9, color: '#9CA3AF' }}>Clique em um município para detalhes</p>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[-22, -48]}
        zoom={5}
        style={{ height: 520, borderRadius: 14, border: '1px solid #E5E7EB' }}
        zoomControl={false}
        scrollWheelZoom
      >
        <ZoomControl position="bottomleft" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; CartoDB'
          subdomains="abcd"
          maxZoom={19}
        />

        {dados.map(m => {
          if (!m.lat || !m.lon) return null;
          const { fill, stroke } = getCor(m);
          const isSelected = selected?.codigo_ibge === m.codigo_ibge;

          return (
            <CircleMarker
              key={m.codigo_ibge}
              center={[m.lat, m.lon]}
              radius={isSelected ? 8 : 5}
              pathOptions={{
                fillColor: fill,
                fillOpacity: 0.85,
                color: isSelected ? '#1d4ed8' : stroke,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelect?.(m),
              }}
            >
              <Popup>
                <div style={{ padding: '8px 4px', minWidth: 180 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                    {m.nome_municipio} / {m.uf}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Row label="Score ZARC" val={`${m.score_aptidao ?? '—'}/100`} />
                    <Row label="Distância Agrária" val={`${m.dist} km`} />
                    <Row label="Lucro est./ha" val={`R$ ${Math.round(m.lucro_ha ?? 0)}`} />
                    <Row label="ROI" val={`${(m.roi ?? 0).toFixed(0)}%`} />
                    <Row label="Score combinado" val={`${m.scoreComb ?? 0}`} highlight />
                  </div>
                  {getCor(m).categoria === 'oportunidade' && (
                    <div style={{
                      marginTop: 8, background: '#fff7ed', border: '1px solid #fed7aa',
                      borderRadius: 6, padding: '4px 8px',
                    }}>
                      <p style={{ fontSize: 9, color: '#c2410c', fontWeight: 600 }}>
                        Oportunidade de expansão de seguro
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function Row({ label, val, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 10, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: highlight ? 700 : 500, color: highlight ? '#15803d' : '#374151' }}>{val}</span>
    </div>
  );
}
