import { Sprout, Crown, Star, Gem } from 'lucide-react';

// Perfis reais das cultivares de cevada cervejeira indicadas pela Portaria
// SPA/MAPA ZARC do Paraná (nº 358/2024) e pela publicação "Indicações
// Técnicas para a Produção de Cevada Cervejeira — safras 2025 e 2026"
// (Embrapa Trigo, 2025, Tabela 3.1 — ensaios Passo Fundo/RS e Guarapuava/PR).
//
// IMPORTANTE: não existe, em nenhuma fonte oficial, uma tabela de "faixa
// climática ideal por cultivar" (temperatura/chuva/altitude diferentes por
// cultivar). O que diferencia as cultivares oficialmente é o CICLO (dias até
// espigamento/maturação) e a resistência a doenças — por isso todas usam os
// mesmos critérios agronômicos gerais (os mesmos do restante do app); a
// seleção de cultivar aqui serve para mostrar as características reais de
// cada uma, não para simular uma aptidão climática diferente por cultivar.
export const ZARC_PADRAO = {
  argila: 15, tempMin: 10, tempMax: 22,
  chuvaMin: 400, chuvaMax: 1200, altitude: 800,
  maxGeada: 30, maxChuvaColheita: 250,
};

export const CULTIVARES = {
  Condessa: {
    nome:  'Condessa',
    obtentor: 'Cooperativa Agrária Agroindustrial (FAPA)',
    icon:  Gem,
    cor:   '#c026d3',
    ciclo: '60–65 dias até espigamento, 115–118 dias até maturação',
    desc:  'Lançamento 2025 (linhagem FAPAC 2021088, cruzamento Sissi // Danielle). Altura 60cm, resistente a acamamento. Baixa adaptação em áreas de menor fertilidade/pH.',
    zarc: ZARC_PADRAO,
  },
  Princesa: {
    nome:  'Princesa',
    obtentor: 'Cooperativa Agrária Agroindustrial',
    icon:  Star,
    cor:   '#f59e0b',
    ciclo: 'Grupo II · 80 dias até espigamento, 122 dias até maturação',
    desc:  'Cultivar própria da Agrária. Altura de planta 70cm; resistente a ferrugem, moderadamente resistente a mancha-reticular e mancha-marrom.',
    zarc: ZARC_PADRAO,
  },
  Duquesa: {
    nome:  'Duquesa',
    obtentor: 'Cooperativa Agrária Agroindustrial',
    icon:  Gem,
    cor:   '#06b6d4',
    ciclo: 'Grupo II · 77 dias até espigamento, 120 dias até maturação',
    desc:  'Cultivar própria da Agrária, ciclo mais precoce do portfólio. Altura de planta 72cm; resistente a ferrugem, suscetível a giberela.',
    zarc: ZARC_PADRAO,
  },
  Imperatriz: {
    nome:  'Imperatriz',
    obtentor: 'FAPA (Fundação Agrária de Pesquisa Agropecuária)',
    icon:  Crown,
    cor:   '#10b981',
    ciclo: 'Grupo II · 82 dias até espigamento, 127 dias até maturação',
    desc:  'Cultivar da FAPA (Guarapuava/PR). Altura de planta 73cm; moderadamente resistente à maioria das doenças foliares, suscetível a giberela.',
    zarc: ZARC_PADRAO,
  },
  'BRS Cauê': {
    nome:  'BRS Cauê',
    obtentor: 'Embrapa Trigo',
    icon:  Crown,
    cor:   '#8b5cf6',
    ciclo: 'Grupo II · 90 dias até espigamento, 132 dias até maturação',
    desc:  'Única cultivar Embrapa (Passo Fundo/RS) com genes de nanismo — porte baixo (72cm) reduz acamamento. Altamente suscetível a oídio.',
    zarc: ZARC_PADRAO,
  },
};

export default function CultivaresAgaria({ ativo, onSelect }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Cultivares — Portaria ZARC PR nº 358/2024 e Embrapa Trigo (2025)
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <Icon size={13} color={c.cor} />
              <span style={{ fontSize: 12, fontWeight: 600, color: c.cor }}>{c.nome}</span>
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 5 }}>{c.obtentor} · {c.ciclo}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.desc}</p>
          </div>
        );
      })()}
    </div>
  );
}
