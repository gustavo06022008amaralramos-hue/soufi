import { Sprout, Crown, Star, Gem } from 'lucide-react';

// Perfis reais das cultivares Agrária/Embrapa para cevada cervejeira.
// Fontes: Portarias MAPA ZARC, boletins Embrapa Trigo e FAPA.
export const CULTIVARES = {
  Princesa: {
    nome:  'BRS Princesa',
    icon:  Star,
    cor:   '#f59e0b',
    ciclo: 'Ciclo médio (90–95 dias)',
    desc:  'Indicada para regiões tradicionais do Sul. Alta produtividade em solos de textura média a argilosa.',
    zarc: {
      argila:          15,
      tempMin:         10,
      tempMax:         22,
      chuvaMin:        400,
      chuvaMax:        1200,
      altitude:        750,
      maxGeada:        35,
      maxChuvaColheita:270,
    },
  },
  Condessa: {
    nome:  'BRS Condessa',
    icon:  Crown,
    cor:   '#8b5cf6',
    ciclo: 'Ciclo médio-tardio (95–100 dias)',
    desc:  'Maior tolerância a variações climáticas. Boa estabilidade de produção entre safras e regiões.',
    zarc: {
      argila:          15,
      tempMin:         10,
      tempMax:         22,
      chuvaMin:        350,
      chuvaMax:        1300,
      altitude:        700,
      maxGeada:        38,
      maxChuvaColheita:280,
    },
  },
  Duquesa: {
    nome:  'BRS Duquesa',
    icon:  Gem,
    cor:   '#06b6d4',
    ciclo: 'Ciclo precoce (85–90 dias)',
    desc:  'Alta qualidade malteável, stricta exigência de solo. Recomendada para altitudes ≥ 850m com solos argilosos.',
    zarc: {
      argila:          22,
      tempMin:         10,
      tempMax:         21,
      chuvaMin:        450,
      chuvaMax:        1100,
      altitude:        850,
      maxGeada:        25,
      maxChuvaColheita:250,
    },
  },
  Imperatriz: {
    nome:  'BRS Imperatriz',
    icon:  Crown,
    cor:   '#10b981',
    ciclo: 'Ciclo curto–médio (85–92 dias)',
    desc:  'Adaptada ao Cerrado. Tolerante a temperaturas mais altas e menor altitude. Acende as regiões do Cerrado no mapa.',
    zarc: {
      argila:          15,
      tempMin:         13,
      tempMax:         27,
      chuvaMin:        250,
      chuvaMax:        1500,
      altitude:        400,
      maxGeada:        60,
      maxChuvaColheita:320,
    },
  },
};

export default function CultivaresAgaria({ ativo, onSelect }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Perfil de Cultivar — Agrária / Embrapa
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {Object.entries(CULTIVARES).map(([key, c]) => {
          const isAtivo = ativo === key;
          const Icon = c.icon;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              title={`${c.nome} · ${c.ciclo}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${isAtivo ? c.cor : 'var(--border2)'}`,
                background: isAtivo ? `${c.cor}18` : 'var(--bg-card2)',
                color: isAtivo ? c.cor : 'var(--text-muted)',
                transition: 'all 0.2s', textAlign: 'left',
              }}
            >
              <Icon size={14} color={isAtivo ? c.cor : 'var(--text-faint)'} />
              <div>
                <p style={{ fontSize: 12, fontWeight: isAtivo ? 700 : 500, lineHeight: 1.2 }}>{key}</p>
                <p style={{ fontSize: 9, color: isAtivo ? c.cor : 'var(--text-faint)', opacity: 0.8 }}>
                  {c.ciclo.split(' ')[0]} {c.ciclo.split(' ')[1]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Banner do cultivar ativo */}
      {ativo && (() => {
        const c = CULTIVARES[ativo];
        const Icon = c.icon;
        return (
          <div style={{
            marginTop: 10, padding: '10px 12px',
            background: `${c.cor}10`, border: `1px solid ${c.cor}35`,
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <Icon size={13} color={c.cor} />
              <span style={{ fontSize: 12, fontWeight: 600, color: c.cor }}>{c.nome}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.desc}</p>
          </div>
        );
      })()}
    </div>
  );
}
