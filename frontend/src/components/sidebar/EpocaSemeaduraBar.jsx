import { useState, useEffect } from 'react';

import { API, getJson } from '../../lib/api.js';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Mesma paleta ZARC do resto do app: 20=melhor risco, 30=moderado, 40=mais
// arriscado (mas ainda indicado pela Portaria), sem registro=não indicado.
function corRisco(nivel) {
  if (nivel === 20) return '#1A7A3C';
  if (nivel === 30) return '#D4A017';
  if (nivel === 40) return '#c2410c';
  return '#E5E7EB';
}
function labelRisco(nivel) {
  if (nivel == null) return 'Não indicado';
  return `Risco ${nivel}%`;
}

/* Barra de época de semeadura — os 36 decêndios do ano (real, ZARC oficial
   por município), não uma "janela preferencial/tolerável" inventada por
   cultivar (nenhuma fonte publica isso por cultivar, só por município/
   decêndio). Generaliza pra qualquer cultura (cevada/trigo/soja), reaproveitável
   em qualquer tela que tenha codigo_ibge + cultura. */
export default function EpocaSemeaduraBar({ codigoIbge, cultura, decendioAtual }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!codigoIbge) return;
    setLoading(true);
    getJson(`${API}/zarc/calendario?codigo_ibge=${codigoIbge}&cultura=${cultura}`)
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [codigoIbge, cultura]);

  if (loading) return null;
  if (!dados || !dados.municipio) return null;

  const cal = dados.calendario ?? [];

  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'11px 14px' }}>
      <p style={{ fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>
        Época de semeadura — ano inteiro (ZARC oficial)
      </p>

      {/* 36 segmentos, agrupados visualmente em 12 meses */}
      <div style={{ display:'flex', gap:1, marginBottom:4 }}>
        {cal.map(p => (
          <div key={p.decendio}
            title={`Decêndio ${p.decendio} — ${labelRisco(p.nivel_risco)}`}
            style={{
              flex:1, height:20, background: corRisco(p.nivel_risco),
              outline: p.decendio === decendioAtual ? '2px solid #111827' : 'none',
              outlineOffset: -2,
              borderRadius: p.decendio % 3 === 1 ? '3px 0 0 3px' : p.decendio % 3 === 0 ? '0 3px 3px 0' : 0,
              marginRight: p.decendio % 3 === 0 && p.decendio !== 36 ? 2 : 0,
            }}
          />
        ))}
      </div>

      {/* Rótulos de mês */}
      <div style={{ display:'flex', marginBottom:8 }}>
        {MESES.map(m => (
          <span key={m} style={{ flex:1, fontSize:8, color:'#6B7280', textAlign:'center' }}>{m}</span>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {[20, 30, 40, null].map(n => (
          <div key={n ?? 'none'} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:corRisco(n), display:'inline-block' }} />
            <span style={{ fontSize:8, color:'#6B7280' }}>{labelRisco(n)}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize:8, color:'#6B7280', marginTop:8, lineHeight:1.4 }}>
        Melhor risco disponível em cada decêndio, entre qualquer grupo de ciclo/solo/manejo —
        Tábua de Risco ZARC, MAPA, safra {dados.safra}.
      </p>
    </div>
  );
}
