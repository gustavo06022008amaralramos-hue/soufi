import { useState, useMemo } from 'react';
import { Truck, MapPin, TrendingDown, DollarSign } from 'lucide-react';

// Cooperativa Agrária — Colônia Entre Rios, Guarapuava/PR
const AGRARIA = { lat: -25.530, lon: -51.491 };
const FATOR_ESTRADA = 1.35; // coeficiente reta→rodovia

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function faixaViabilidade(distKm, precoLiqTon) {
  if (distKm <= 200)  return { label: 'Muito viável',   cor: '#16a34a', bg: '#f0fdf4' };
  if (distKm <= 400)  return { label: 'Viável',          cor: '#65a30d', bg: '#f7fee7' };
  if (distKm <= 700)  return { label: 'Considerar',      cor: '#d97706', bg: '#fffbeb' };
  return              { label: 'Distante',               cor: '#dc2626', bg: '#fef2f2' };
}

export default function LogisticaCard({ municipio }) {
  const [precoSaca, setPrecoSaca]   = useState(95);   // R$/saca 60 kg
  const [freteTonKm, setFreteTonKm] = useState(0.32); // R$/ton·km

  const calc = useMemo(() => {
    if (!municipio?.lat || !municipio?.lon) return null;
    const distReta   = haversine(municipio.lat, municipio.lon, AGRARIA.lat, AGRARIA.lon);
    const distEstrada = Math.round(distReta * FATOR_ESTRADA);
    const precoTon   = (precoSaca / 60) * 1000;
    const custFrete  = distEstrada * freteTonKm;
    const liquido    = precoTon - custFrete;
    const liquidoSaca = liquido * 60 / 1000;
    return { distEstrada, precoTon, custFrete, liquido, liquidoSaca };
  }, [municipio, precoSaca, freteTonKm]);

  if (!calc) return null;

  const viab = faixaViabilidade(calc.distEstrada, calc.liquido);

  const labelStyle = { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8 };
  const valueStyle = { fontSize: 13, fontWeight: 700, color: '#111827' };

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '13px 14px' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}>
        <Truck size={12} color="#374151" />
        <p style={{ fontSize: 9, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          Logística — Cooperativa Agrária
        </p>
      </div>

      {/* Destino */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
        background: '#F9FAFB', borderRadius: 7, padding: '7px 10px',
      }}>
        <MapPin size={11} color="#6B7280" />
        <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>
          Entre Rios, Guarapuava / PR
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#374151',
        }}>
          {calc.distEstrada} km
        </span>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 12 }}>
        <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 9px' }}>
          <p style={labelStyle}>Preço bruto</p>
          <p style={valueStyle}>R${Math.round(calc.precoTon)}<span style={{ fontSize: 9, fontWeight: 400, color: '#9CA3AF' }}>/ton</span></p>
        </div>
        <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '8px 9px' }}>
          <p style={labelStyle}>Frete est.</p>
          <p style={{ ...valueStyle, color: '#DC2626' }}>-R${Math.round(calc.custFrete)}<span style={{ fontSize: 9, fontWeight: 400, color: '#FCA5A5' }}>/ton</span></p>
        </div>
        <div style={{ background: viab.bg, borderRadius: 8, padding: '8px 9px', border: `1px solid ${viab.cor}25` }}>
          <p style={labelStyle}>Líquido</p>
          <p style={{ ...valueStyle, color: viab.cor }}>R${Math.round(calc.liquido)}<span style={{ fontSize: 9, fontWeight: 400 }}>/ton</span></p>
        </div>
      </div>

      {/* Saca */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: viab.bg, border: `1px solid ${viab.cor}30`,
        borderRadius: 8, padding: '8px 12px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={11} color={viab.cor} />
          <span style={{ fontSize: 11, color: viab.cor, fontWeight: 600 }}>
            R$ {calc.liquidoSaca.toFixed(2)} / saca (60 kg)
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: viab.cor,
          background: `${viab.cor}15`, borderRadius: 5, padding: '2px 8px',
        }}>
          {viab.label}
        </span>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={labelStyle}>Preço da saca</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>R$ {precoSaca}/saca</span>
          </div>
          <input type="range" min={60} max={150} step={1} value={precoSaca}
            onChange={e => setPrecoSaca(+e.target.value)}
            style={{ width: '100%', accentColor: '#2D6A4F', height: 3 }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={labelStyle}>Frete (R$/ton·km)</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>R$ {freteTonKm.toFixed(2)}</span>
          </div>
          <input type="range" min={0.15} max={0.80} step={0.01} value={freteTonKm}
            onChange={e => setFreteTonKm(+e.target.value)}
            style={{ width: '100%', accentColor: '#DC2626', height: 3 }} />
        </div>
      </div>

      <p style={{ fontSize: 9, color: '#9CA3AF', marginTop: 9, lineHeight: 1.5 }}>
        Distância estimada via fator rodoviário 1,35× sobre linha reta.
        Preço e frete configuráveis para simulação.
      </p>
    </div>
  );
}
