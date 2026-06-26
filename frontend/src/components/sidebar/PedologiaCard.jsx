import { Layers, AlertTriangle } from 'lucide-react';

const TIPO_INFO = {
  1: { label: 'Tipo 1 — Arenoso',       cor: '#ef4444', desc: 'Argila < 15% · Alto risco para cevada. Baixa retenção de água e nutrientes.', recom: 'Não recomendado pelo ZARC.' },
  2: { label: 'Tipo 2 — Textura Média',  cor: '#f59e0b', desc: 'Argila 15–35% · Risco moderado. Aceito pelo ZARC com manejo adequado.', recom: 'Recomendado com ressalvas.' },
  3: { label: 'Tipo 3 — Argiloso',       cor: '#10b981', desc: 'Argila > 35% · Ideal para cevada. Boa retenção hídrica e fertilidade.', recom: 'Plenamente apto pelo ZARC.' },
};

export default function PedologiaCard({ municipio }) {
  const tipo      = municipio?.tipo_solo_zarc;
  const pct       = municipio?.pct_argila;
  const info      = TIPO_INFO[tipo];
  const estimado  = (municipio?.tipo_solo || '').includes('(est.)');

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
          Pedologia — SoilGrids ISRIC
        </p>
        {estimado && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 700, color: '#b45309',
            background: '#fef3c7', border: '1px solid #fcd34d',
            borderRadius: 5, padding: '2px 7px',
          }}>
            <AlertTriangle size={9} />
            ESTIMATIVA
          </span>
        )}
      </div>

      {!tipo || !pct ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 12 }}>Dados de solo ainda não coletados para este município.</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${info.cor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color={info.cor} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: info.cor }}>{info.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.recom}</p>
            </div>
          </div>

          {/* Barra de argila */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Teor de Argila</span>
              <span style={{ color: info.cor, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: info.cor, borderRadius: 3, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>
              <span>0%</span><span style={{ color: '#f59e0b' }}>15%</span><span style={{ color: '#10b981' }}>35%</span><span>100%</span>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>{info.desc}</p>

          {estimado && (
            <p style={{ fontSize: 10, color: '#92400e', background: '#fffbeb', borderRadius: 6, padding: '6px 9px', marginTop: 8, lineHeight: 1.5 }}>
              Dado estimado com base em perfil regional. Será substituído por medição real do SoilGrids ISRIC assim que a coleta processar este município.
            </p>
          )}
        </>
      )}
    </div>
  );
}
