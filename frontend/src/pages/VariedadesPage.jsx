import { useState } from 'react';
import { Leaf, X, Clock, Thermometer, Droplets, Mountain, CheckCircle, AlertTriangle } from 'lucide-react';
import { CULTIVARES } from '../components/simulador/CultivaresAgaria.jsx';

const FILTROS = ['Todas', 'Ciclo curto', 'Ciclo médio', 'Ciclo tardio'];

const INFO_EXTRA = {
  Princesa: {
    zonas: ['PR', 'SC', 'RS'],
    aptidaoPor: { '≥67': '87%', '≥83': '42%' },
    img: '🌾',
    cor: '#f59e0b',
    caracteristicas: [
      { label: 'Peso hectolítrico', val: '≥ 62 kg/hL', ok: true },
      { label: 'Germinação', val: '≥ 95%', ok: true },
      { label: 'Proteína', val: '9–12%', ok: true },
      { label: 'Resistência a doenças', val: 'Moderada', ok: true },
      { label: 'Tolerância à seca', val: 'Baixa', ok: false },
    ],
  },
  Condessa: {
    zonas: ['PR', 'SC', 'RS', 'GO'],
    aptidaoPor: { '≥67': '82%', '≥83': '38%' },
    img: '👑',
    cor: '#8b5cf6',
    caracteristicas: [
      { label: 'Peso hectolítrico', val: '≥ 61 kg/hL', ok: true },
      { label: 'Germinação', val: '≥ 95%', ok: true },
      { label: 'Proteína', val: '10–13%', ok: true },
      { label: 'Resistência a doenças', val: 'Alta', ok: true },
      { label: 'Tolerância à seca', val: 'Moderada', ok: true },
    ],
  },
  Duquesa: {
    zonas: ['PR', 'SC'],
    aptidaoPor: { '≥67': '72%', '≥83': '55%' },
    img: '💎',
    cor: '#06b6d4',
    caracteristicas: [
      { label: 'Peso hectolítrico', val: '≥ 63 kg/hL', ok: true },
      { label: 'Germinação', val: '≥ 97%', ok: true },
      { label: 'Proteína', val: '9–11%', ok: true },
      { label: 'Resistência a doenças', val: 'Muito Alta', ok: true },
      { label: 'Tolerância à seca', val: 'Baixa', ok: false },
    ],
  },
  Imperatriz: {
    zonas: ['GO', 'MG', 'SP', 'MS', 'MT', 'BA', 'PR', 'RS'],
    aptidaoPor: { '≥67': '94%', '≥83': '28%' },
    img: '🌿',
    cor: '#10b981',
    caracteristicas: [
      { label: 'Peso hectolítrico', val: '≥ 60 kg/hL', ok: true },
      { label: 'Germinação', val: '≥ 95%', ok: true },
      { label: 'Proteína', val: '10–14%', ok: true },
      { label: 'Resistência a doenças', val: 'Alta', ok: true },
      { label: 'Tolerância à seca', val: 'Alta', ok: true },
    ],
  },
};

function CultivarCard({ cultivarKey, c, extra, onClick }) {
  const Icon = c.icon;
  return (
    <div
      onClick={() => onClick(cultivarKey)}
      style={{
        background: 'var(--bg-card)', border: `1px solid var(--border)`,
        borderRadius: 16, padding: 20, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = c.cor;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px ${c.cor}25`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${c.cor}18`, border: `1px solid ${c.cor}35`, flexShrink: 0,
        }}>
          {extra.img}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: c.cor, marginBottom: 3 }}>{c.nome}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={10} color="var(--text-faint)" />
            <p style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c.ciclo}</p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>{c.desc}</p>

      {/* Parâmetros ZARC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        {[
          { icon: Thermometer, label: 'Temp', val: `${c.zarc.tempMin}–${c.zarc.tempMax}°C`, cor: '#f59e0b' },
          { icon: Droplets,    label: 'Chuva', val: `${c.zarc.chuvaMin}–${c.zarc.chuvaMax}mm`, cor: '#06b6d4' },
          { icon: Mountain,    label: 'Altitude', val: `≥${c.zarc.altitude}m`, cor: '#8b5cf6' },
          { icon: Leaf,        label: 'Argila', val: `≥${c.zarc.argila}%`, cor: '#10b981' },
        ].map(({ icon: Ic, label, val, cor }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-card2)', borderRadius: 7, padding: '6px 8px',
          }}>
            <Ic size={11} color={cor} />
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-faint)' }}>{label}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zonas */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {extra.zonas.map(z => (
          <span key={z} style={{
            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`,
          }}>{z}</span>
        ))}
      </div>
    </div>
  );
}

function Detalhe({ cultivarKey, c, extra, onClose }) {
  const Icon = c.icon;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: `1px solid ${c.cor}50`,
          borderRadius: 20, padding: 28, maxWidth: 560, width: '100%',
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${c.cor}20`,
          animation: 'fadeUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, fontSize: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${c.cor}18`,
            }}>{extra.img}</div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.nome}</p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{c.ciclo}</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-faint)',
            display: 'flex',
          }}><X size={14} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{c.desc}</p>

        {/* Aptidão */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {Object.entries(extra.aptidaoPor).map(([label, pct]) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '12px 8px',
              background: `${c.cor}10`, border: `1px solid ${c.cor}30`, borderRadius: 10,
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: c.cor }}>{pct}</p>
              <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>municípios score {label}</p>
            </div>
          ))}
        </div>

        {/* Características PIQ */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Padrão Industrial (PIQ)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {extra.caracteristicas.map(({ label, val, ok }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {ok ? <CheckCircle size={13} color="#10b981" /> : <AlertTriangle size={13} color="#f59e0b" />}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--text-primary)' : '#f59e0b' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Parâmetros ZARC */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Parâmetros ZARC
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Temperatura', val: `${c.zarc.tempMin}–${c.zarc.tempMax}°C` },
            { label: 'Precipitação', val: `${c.zarc.chuvaMin}–${c.zarc.chuvaMax}mm` },
            { label: 'Altitude mín.', val: `${c.zarc.altitude}m` },
            { label: 'Argila mín.', val: `${c.zarc.argila}%` },
            { label: 'Geada máx.', val: `${c.zarc.maxGeada}%` },
            { label: 'Chuva colheita', val: `≤${c.zarc.maxChuvaColheita}mm` },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VariedadesPage() {
  const [filtro, setFiltro]     = useState('Todas');
  const [detalhe, setDetalhe]   = useState(null);

  const filtrados = Object.entries(CULTIVARES).filter(([key, c]) => {
    if (filtro === 'Todas') return true;
    const ciclo = c.ciclo.toLowerCase();
    if (filtro === 'Ciclo curto'   && ciclo.includes('precoce')) return true;
    if (filtro === 'Ciclo médio'   && ciclo.includes('médio') && !ciclo.includes('tardio')) return true;
    if (filtro === 'Ciclo tardio'  && ciclo.includes('tardio')) return true;
    return false;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Variedades</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Catálogo de cultivares Agrária / Embrapa para cevada cervejeira</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '5px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
              background: filtro === f ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
              color: filtro === f ? 'var(--emerald)' : 'var(--text-faint)',
              border: `1px solid ${filtro === f ? 'rgba(16,185,129,0.3)' : 'var(--border2)'}`,
              transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {filtrados.map(([key, c]) => (
          <CultivarCard
            key={key}
            cultivarKey={key}
            c={c}
            extra={INFO_EXTRA[key]}
            onClick={setDetalhe}
          />
        ))}
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Leaf size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>Nenhuma cultivar encontrada com este filtro.</p>
        </div>
      )}

      {detalhe && (() => {
        const c    = CULTIVARES[detalhe];
        const extra = INFO_EXTRA[detalhe];
        if (!c || !extra) return null;
        return <Detalhe cultivarKey={detalhe} c={c} extra={extra} onClose={() => setDetalhe(null)} />;
      })()}
    </div>
  );
}
