import { AlertTriangle } from 'lucide-react';

const MESES_SUL     = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_CERRADO = ['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

const FASES = [
  {
    label: 'Semeio',
    icolS: 1, fcolS: 3,
    icolC: 1, fcolC: 3,
    cor: '#15803d', textCor: '#fff',
  },
  {
    label: 'Perfilhamento',
    icolS: 2, fcolS: 4,
    icolC: 2, fcolC: 4,
    cor: '#0284c7', textCor: '#fff',
  },
  {
    label: 'Espigamento',
    icolS: 3, fcolS: 5,
    icolC: 3, fcolC: 5,
    cor: '#ca8a04', textCor: '#fff',
    aviso: 'Crítico — risco de geada',
    avisoCols: [3],
  },
  {
    label: 'Maturação',
    icolS: 4, fcolS: 6,
    icolC: 4, fcolC: 6,
    cor: '#d97706', textCor: '#fff',
  },
  {
    label: 'Colheita',
    icolS: 5, fcolS: 7,
    icolC: 5, fcolC: 7,
    cor: '#065f46', textCor: '#fff',
    aviso: 'Risco de chuva na colheita',
    avisoCols: [5, 6],
  },
];

const CERRADO_UFS = new Set(['GO', 'MG', 'SP', 'MS', 'MT', 'BA']);

export default function TimelineManejo({ municipio, manejo }) {
  const isCerrado = CERRADO_UFS.has(municipio?.uf ?? '');
  const meses     = isCerrado ? MESES_CERRADO : MESES_SUL;
  const N         = meses.length; // 8 colunas

  const geadaPct  = municipio?.risco_geada_pct ?? 0;
  const colheitaMm = municipio?.chuva_colheita ?? 0;

  const colunaWidth = `${100 / N}%`;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
            Calendário de Cultivo — {municipio?.nome_municipio ?? '—'}/{municipio?.uf ?? '—'}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280' }}>
            {isCerrado ? 'Ciclo cerrado (irrigação complementar recomendada)' : 'Ciclo inverno sul · Jun–Nov'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {geadaPct > 15 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 9px' }}>
              <AlertTriangle size={10} color="#1d4ed8" />
              <span style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 600 }}>Geada {geadaPct.toFixed(0)}%</span>
            </div>
          )}
          {colheitaMm > 200 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 9px' }}>
              <AlertTriangle size={10} color="#dc2626" />
              <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>Chuva colheita {colheitaMm.toFixed(0)}mm</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid do calendário */}
      <div style={{ position: 'relative' }}>
        {/* Cabeçalho dos meses */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N},1fr)`, marginBottom: 10 }}>
          {meses.map((m, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: '#374151', padding: '5px 0',
              borderLeft: i === 0 ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
              borderRight: i === N - 1 ? '1px solid #E5E7EB' : 'none',
              borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
              background: '#F9FAFB',
              borderTopLeftRadius: i === 0 ? 6 : 0,
              borderTopRightRadius: i === N - 1 ? 6 : 0,
            }}>{m}</div>
          ))}
        </div>

        {/* Linhas de fase */}
        {FASES.map((fase, fi) => {
          const iCol = isCerrado ? fase.icolC : fase.icolS;
          const fCol = isCerrado ? fase.fcolC : fase.fcolS;
          const span = fCol - iCol;

          return (
            <div key={fi} style={{
              display: 'grid', gridTemplateColumns: `repeat(${N},1fr)`,
              marginBottom: 6, alignItems: 'center',
            }}>
              {Array.from({ length: N }, (_, col) => {
                const isInRange = col >= iCol && col < fCol;
                const isFirst   = col === iCol;
                const isLast    = col === fCol - 1;
                const isAviso   = fase.avisoCols?.includes(col);

                if (!isInRange) {
                  return (
                    <div key={col} style={{
                      height: 28, borderBottom: '1px solid #F3F4F6',
                      borderLeft: '1px solid #F3F4F6',
                    }} />
                  );
                }

                return (
                  <div key={col} style={{
                    height: 28,
                    background: isAviso
                      ? `repeating-linear-gradient(45deg,${fase.cor},${fase.cor} 4px,${fase.cor}cc 4px,${fase.cor}cc 8px)`
                      : fase.cor,
                    opacity: isAviso ? 1 : 0.85,
                    display: isFirst ? 'flex' : 'block',
                    alignItems: 'center',
                    paddingLeft: isFirst ? 8 : 0,
                    borderRadius: `${isFirst ? 5 : 0}px ${isLast ? 5 : 0}px ${isLast ? 5 : 0}px ${isFirst ? 5 : 0}px`,
                  }}>
                    {isFirst && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: fase.textCor,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: `${span * 80}px`,
                      }}>
                        {fase.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legenda inline de riscos */}
        {FASES.filter(f => f.aviso).map((fase, i) => (
          <div key={i} style={{
            display: 'flex', gap: 5, alignItems: 'center',
            marginTop: 4, paddingLeft: `${(isCerrado ? fase.icolC : fase.icolS) * (100 / N)}%`,
          }}>
            <AlertTriangle size={9} color={fase.cor} />
            <span style={{ fontSize: 9, color: fase.cor, fontWeight: 600 }}>{fase.aviso}</span>
          </div>
        ))}
      </div>

      {/* Rodapé com recomendação */}
      {manejo && (
        <div style={{
          marginTop: 16, background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 9, padding: '10px 14px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px',
        }}>
          <div>
            <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.7 }}>Cultivar recomendada</span>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>{manejo.cultivar}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.7 }}>Janela de semeio</span>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>{manejo.semeio}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.7 }}>Produtividade esperada</span>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>{manejo.expectativa}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.7 }}>Adubação</span>
            <p style={{ fontSize: 11, color: '#374151' }}>{manejo.adubacao}</p>
          </div>
        </div>
      )}
    </div>
  );
}
