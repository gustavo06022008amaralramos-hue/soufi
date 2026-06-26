import { useState } from 'react';
import { Layers, Satellite, SlidersHorizontal, CheckCircle, Eye } from 'lucide-react';
import MapComponent     from './MapComponent.jsx';
import MunicipioSidebar from '../sidebar/MunicipioSidebar.jsx';

function ToggleBtn({ ativo, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer', fontWeight: 500,
      background: ativo ? 'rgba(6,182,212,0.15)' : 'rgba(20,28,43,0.8)',
      color:      ativo ? 'var(--cyan)'           : 'var(--text-faint)',
      border:     `1px solid ${ativo ? 'rgba(6,182,212,0.4)' : 'var(--border2)'}`,
      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
      boxShadow: ativo ? '0 0 12px rgba(6,182,212,0.15)' : 'none',
    }}>
      {children}
    </button>
  );
}

function FloatPanel({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(5,8,16,0.88)', border: '1px solid var(--border2)',
      borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function MapaTab({ municipios, loadingMapa, selecionado, onSelect, sazonalidade, loadingSazon }) {
  const [tipoMapa,     setTipoMapa]     = useState('dark');
  const [filtroScore,  setFiltroScore]  = useState(0);
  const [somenteAptos, setSomenteAptos] = useState(false);

  const filtroEfetivo = somenteAptos ? 67 : filtroScore;
  const visiveis      = municipios.filter(m => m.lat && m.lon && (m.score_aptidao ?? 0) >= filtroEfetivo);
  const aptos         = municipios.filter(m => m.apto_geral);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Estilo do mapa */}
          <FloatPanel>
            <p style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              <Layers size={9} style={{ display:'inline', marginRight: 4 }} />Visualização
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <ToggleBtn ativo={tipoMapa === 'dark'}      onClick={() => setTipoMapa('dark')}>
                <Layers size={11} />Dark
              </ToggleBtn>
              <ToggleBtn ativo={tipoMapa === 'satellite'} onClick={() => setTipoMapa('satellite')}>
                <Satellite size={11} />Satélite
              </ToggleBtn>
              <ToggleBtn ativo={tipoMapa === 'labels'}    onClick={() => setTipoMapa('labels')}>
                <Eye size={11} />Labels
              </ToggleBtn>
            </div>
          </FloatPanel>

          {/* Filtro score */}
          <FloatPanel style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                <SlidersHorizontal size={9} style={{ display:'inline', marginRight: 4 }} />Score Mínimo
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{filtroEfetivo}</span>
            </div>
            <input type="range" min={0} max={100} step={1} value={filtroEfetivo} disabled={somenteAptos}
              onChange={e => { setSomenteAptos(false); setFiltroScore(+e.target.value); }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <button onClick={() => setSomenteAptos(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, cursor: 'pointer',
                background: somenteAptos ? 'rgba(16,185,129,0.12)' : 'transparent',
                border: `1px solid ${somenteAptos ? 'rgba(16,185,129,0.3)' : 'var(--border2)'}`,
                borderRadius: 6, padding: '3px 8px',
                color: somenteAptos ? 'var(--emerald)' : 'var(--text-faint)',
                transition: 'all 0.2s',
              }}>
                <CheckCircle size={10} />Só Aptos (≥67)
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                {visiveis.length.toLocaleString('pt-BR')} visíveis
              </span>
            </div>
          </FloatPanel>
        </div>

        {/* Legenda */}
        <div style={{ position: 'absolute', bottom: 24, left: 14, zIndex: 1000 }}>
          <FloatPanel style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Score de Aptidão</p>
            {[
              { cor: '#10b981', label: '83–100 · Máxima' },
              { cor: '#84cc16', label: '67–82 · Alta' },
              { cor: '#f59e0b', label: '50–66 · Moderada' },
              { cor: '#f97316', label: '33–49 · Risco' },
              { cor: '#6b7280', label: '0–32 · Inapto' },
            ].map(({ cor, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: cor, boxShadow: `0 0 6px ${cor}60`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </FloatPanel>
        </div>

        {/* Loading overlay */}
        {loadingMapa && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 900,
            background: 'rgba(5,8,16,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid var(--border2)', borderTopColor: 'var(--cyan)',
              animation: 'spin 0.9s linear infinite',
            }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>Carregando municípios...</p>
              <p style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4 }}>Conectando ao backend</p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        <MapComponent
          municipios={municipios}
          selecionado={selecionado}
          onSelect={onSelect}
          tipoMapa={tipoMapa}
          filtroScore={filtroEfetivo}
        />
      </div>

      <MunicipioSidebar
        municipio={selecionado}
        sazonalidade={sazonalidade}
        loading={loadingSazon}
        onClose={() => onSelect(null)}
      />
    </div>
  );
}
