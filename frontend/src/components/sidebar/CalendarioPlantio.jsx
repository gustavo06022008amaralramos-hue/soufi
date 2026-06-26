import { AlertTriangle, Snowflake, CloudRain, Leaf } from 'lucide-react';

/* ── Regiões → calendário adaptado ── */
const SUL     = new Set(['PR','SC','RS']);
const CERRADO = new Set(['GO','MG','SP','MS','MT','BA','DF']);

function getRegiao(uf) {
  if (SUL.has(uf))     return 'sul';
  if (CERRADO.has(uf)) return 'cerrado';
  return 'nordeste';
}

/* meses visíveis no gráfico (índice 0 = primeiro mês exibido) */
const CONFIG = {
  sul:      { meses:['Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'], label:'Ciclo inverno sul · Jun–Nov', mesInicio:5 },
  cerrado:  { meses:['Abr','Mai','Jun','Jul','Ago','Set','Out','Nov'], label:'Ciclo cerrado · Mai–Out',    mesInicio:4 },
  nordeste: { meses:['Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'], label:'Ciclo altitude · Jun–Nov',   mesInicio:5 },
};

/* Fases: iCol/fCol = índice 0-based dentro do array de meses exibidos */
const FASES = [
  { label:'Semeio',       iCol:1, fCol:3, cor:'#15803d', aviso:null },
  { label:'Perfilhamento',iCol:2, fCol:4, cor:'#0284c7', aviso:null },
  { label:'Espigamento',  iCol:3, fCol:5, cor:'#ca8a04', aviso:'Crítico — risco de geada', avisoCols:[3] },
  { label:'Maturação',    iCol:4, fCol:6, cor:'#d97706', aviso:null },
  { label:'Colheita',     iCol:5, fCol:7, cor:'#065f46', aviso:'Risco de chuva na colheita', avisoCols:[5,6] },
];

/* Cultivar recomendada por perfil */
function cultivarRec(municipio) {
  const score  = municipio?.score_aptidao ?? 0;
  const geada  = municipio?.risco_geada_pct ?? 0;
  const uf     = municipio?.uf ?? '';
  const regiao = getRegiao(uf);

  if (score >= 83) {
    return {
      cultivar: 'BRS Princesa',
      semeio:   'Jun (precoce)',
      prod:     '3,0–4,0 t/ha',
      adubacao: 'N: 20 kg/ha base + 60 kg/ha cobertura V3',
    };
  }
  if (score >= 67 && geada >= 20) {
    return {
      cultivar: 'BRS Cauê',
      semeio:   'Jul (tardio — reduz risco de geada no perfilhamento)',
      prod:     '2,8–3,5 t/ha',
      adubacao: 'N: 15 kg/ha base + 50 kg/ha cobertura V3; atenção ao K',
    };
  }
  if (score >= 67) {
    return {
      cultivar: regiao === 'cerrado' ? 'BRS Elis' : 'BRS Duquesa',
      semeio:   'Jun–Jul',
      prod:     '2,5–3,5 t/ha',
      adubacao: 'N: 15 kg/ha base + 50 kg/ha cobertura V3',
    };
  }
  if (score >= 40) {
    return {
      cultivar: 'BRS Elis',
      semeio:   'Mai–Jul (preferir Jul)',
      prod:     '2,0–3,0 t/ha',
      adubacao: 'N: 10 kg/ha base + 40 kg/ha cobertura; irrigação complementar recomendada',
    };
  }
  return null;
}

export default function CalendarioPlantio({ municipio, calendario }) {
  if (!municipio) return null;

  const uf     = municipio.uf ?? '';
  const regiao = getRegiao(uf);
  const cfg    = CONFIG[regiao];
  const N      = cfg.meses.length;

  const geadaPct   = municipio.risco_geada_pct ?? 0;
  const colheitaMm = municipio.chuva_colheita_mm ?? 0;
  const rec        = cultivarRec(municipio);

  /* dados mensais indexados por mês (1–12) */
  const mapaDados = {};
  (calendario ?? []).forEach(d => { mapaDados[d.mes] = d; });

  /* temperatura média dos meses exibidos (para contexto) */
  const tempsExibidas = cfg.meses.map((_, i) => {
    const mesNum = cfg.mesInicio + i;
    return mapaDados[mesNum]?.temp_media ?? null;
  });

  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 14px 12px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <Leaf size={12} color="#15803d" />
            <p style={{ fontSize:11, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:0.8 }}>
              Calendário de Cultivo
            </p>
          </div>
          <p style={{ fontSize:10, color:'#6B7280' }}>{cfg.label}</p>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {geadaPct >= 15 && (
            <div style={{ display:'flex', gap:4, alignItems:'center',
              background:'#eff6ff', border:'1px solid #bfdbfe',
              borderRadius:6, padding:'3px 8px' }}>
              <Snowflake size={9} color="#1d4ed8" />
              <span style={{ fontSize:9, color:'#1d4ed8', fontWeight:600 }}>Geada {geadaPct.toFixed(0)}%</span>
            </div>
          )}
          {colheitaMm > 350 && (
            <div style={{ display:'flex', gap:4, alignItems:'center',
              background:'#fef2f2', border:'1px solid #fecaca',
              borderRadius:6, padding:'3px 8px' }}>
              <CloudRain size={9} color="#dc2626" />
              <span style={{ fontSize:9, color:'#dc2626', fontWeight:600 }}>{colheitaMm.toFixed(0)}mm colheita</span>
            </div>
          )}
        </div>
      </div>

      {/* Cabeçalho dos meses */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${N},1fr)`, marginBottom:6 }}>
        {cfg.meses.map((m, i) => {
          const temp = tempsExibidas[i];
          return (
            <div key={i} style={{
              textAlign:'center', padding:'4px 0',
              borderLeft: i === 0 ? '1px solid #E5E7EB' : '1px solid #F3F4F6',
              borderRight: i === N-1 ? '1px solid #E5E7EB' : 'none',
              borderTop:'1px solid #E5E7EB', borderBottom:'1px solid #E5E7EB',
              background:'#F9FAFB',
              borderTopLeftRadius: i === 0 ? 5 : 0,
              borderTopRightRadius: i === N-1 ? 5 : 0,
            }}>
              <p style={{ fontSize:9, fontWeight:700, color:'#374151' }}>{m}</p>
              {temp != null && (
                <p style={{ fontSize:8, color: temp >= 10 && temp <= 22 ? '#16a34a' : '#ef4444' }}>
                  {temp.toFixed(0)}°
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Barras de fase */}
      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
        {FASES.map((fase, fi) => (
          <div key={fi} style={{ display:'grid', gridTemplateColumns:`repeat(${N},1fr)` }}>
            {Array.from({ length: N }, (_, col) => {
              const inRange = col >= fase.iCol && col < fase.fCol;
              const isFirst = col === fase.iCol;
              const isLast  = col === fase.fCol - 1;
              const isHatch = fase.avisoCols?.includes(col);

              if (!inRange) {
                return (
                  <div key={col} style={{
                    height:24, borderBottom:'1px solid #F3F4F6',
                    borderLeft:'1px solid #F3F4F6',
                  }} />
                );
              }
              return (
                <div key={col} style={{
                  height:24,
                  background: isHatch
                    ? `repeating-linear-gradient(45deg,${fase.cor},${fase.cor} 4px,${fase.cor}bb 4px,${fase.cor}bb 8px)`
                    : fase.cor,
                  display: isFirst ? 'flex' : 'block',
                  alignItems:'center', paddingLeft: isFirst ? 7 : 0,
                  borderRadius:`${isFirst?4:0}px ${isLast?4:0}px ${isLast?4:0}px ${isFirst?4:0}px`,
                }}>
                  {isFirst && (
                    <span style={{ fontSize:8, fontWeight:700, color:'#fff',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      maxWidth:`${(fase.fCol-fase.iCol)*60}px` }}>
                      {fase.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Avisos inline */}
      {FASES.filter(f => f.aviso).map((fase, i) => (
        <div key={i} style={{
          display:'flex', gap:5, alignItems:'center', marginBottom:3,
          paddingLeft:`${fase.iCol * (100/N)}%`,
        }}>
          <AlertTriangle size={8} color={fase.cor} />
          <span style={{ fontSize:8, color:fase.cor, fontWeight:600 }}>{fase.aviso}</span>
        </div>
      ))}

      {/* Recomendação de cultivar */}
      {rec && (
        <div style={{
          marginTop:10, background:'#F0FDF4', border:'1px solid #BBF7D0',
          borderRadius:9, padding:'10px 12px',
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px',
        }}>
          {[
            { label:'Cultivar recomendada', val:rec.cultivar, cor:'#15803d', bold:true },
            { label:'Janela de semeio',      val:rec.semeio,   cor:'#15803d', bold:false },
            { label:'Produtividade esperada',val:rec.prod,     cor:'#15803d', bold:true },
            { label:'Adubação',              val:rec.adubacao, cor:'#374151', bold:false },
          ].map(r => (
            <div key={r.label}>
              <p style={{ fontSize:8, color:'#6B7280', textTransform:'uppercase', letterSpacing:0.7, marginBottom:2 }}>
                {r.label}
              </p>
              <p style={{ fontSize:10, fontWeight: r.bold ? 700 : 400, color:r.cor, lineHeight:1.4 }}>
                {r.val}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
