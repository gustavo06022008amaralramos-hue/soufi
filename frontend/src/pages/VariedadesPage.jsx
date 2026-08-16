import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Leaf, X, Clock, Thermometer, Droplets, Mountain, CheckCircle, AlertTriangle, Wand2, Calculator, XCircle } from 'lucide-react';
import { CULTIVARES, ZARC_PADRAO } from '../components/simulador/CultivaresAgaria.jsx';

/* ── Verificador de aptidão ──────────────────────────────────
   As 4 cultivares reais compartilham os mesmos critérios ZARC gerais
   (não existe fonte oficial com faixa climática diferente por cultivar
   — ver comentário em CultivaresAgaria.jsx). Por isso este painel não
   finge "pontuar" cada cultivar contra o clima informado — em vez
   disso, checa se as condições atendem ao ZARC (um resultado só, real)
   e ordena as cultivares pelo único diferencial documentado: ciclo. */
function checarAptidao(cond) {
  const z = ZARC_PADRAO;
  const criterios = [
    { label: 'Temperatura', ok: cond.temp >= z.tempMin && cond.temp <= z.tempMax, faixa: `${z.tempMin}–${z.tempMax}°C` },
    { label: 'Precipitação', ok: cond.prec >= z.chuvaMin && cond.prec <= z.chuvaMax, faixa: `${z.chuvaMin}–${z.chuvaMax}mm` },
    { label: 'Altitude', ok: cond.alt >= z.altitude, faixa: `≥${z.altitude}m` },
    { label: 'Risco de geada', ok: cond.geada <= z.maxGeada, faixa: `≤${z.maxGeada}%` },
    { label: 'Teor de argila', ok: cond.argila >= z.argila, faixa: `≥${z.argila}%` },
  ];
  const aprovados = criterios.filter(c => c.ok).length;
  return { criterios, aprovados, total: criterios.length, apto: aprovados === criterios.length };
}

/* Ciclo em dias (emergência→maturação), extraído do texto de c.ciclo real
   ("Grupo II · 80 dias até espigamento, 122 dias até maturação"). */
function diasMaturacao(ciclo) {
  const m = ciclo.match(/(\d+) dias até maturação/);
  return m ? Number(m[1]) : 999;
}

function cultivaresPorCiclo() {
  return Object.entries(CULTIVARES)
    .map(([key, c]) => ({ key, c, dias: diasMaturacao(c.ciclo) }))
    .sort((a, b) => a.dias - b.dias);
}

const FILTROS = ['Todas', 'Grupo I', 'Grupo II', 'Grupo III'];

// Reação a doenças/acamamento — Tabela 3.1, Embrapa Trigo (2025), ensaios
// Passo Fundo/RS e Guarapuava/PR, 2015–2024. R=resistente, MR=moderadamente
// resistente, MS=moderadamente suscetível, S=suscetível, AS=altamente suscetível.
const INFO_EXTRA = {
  Princesa: {
    zonas: ['PR', 'SC', 'RS'],
    img: '🌾',
    cor: '#f59e0b',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente suscetível', ok: false },
      { label: 'Oídio', val: 'Resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-reticular', val: 'Moderadamente resistente', ok: true },
      { label: 'Giberela', val: 'Moderadamente suscetível', ok: false },
    ],
  },
  'BRS Cauê': {
    zonas: ['RS', 'PR', 'SC'],
    img: '👑',
    cor: '#8b5cf6',
    caracteristicas: [
      { label: 'Altura de planta', val: '72cm (genes de nanismo)', ok: true },
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Altamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
      { label: 'Mancha-reticular', val: 'Moderadamente resistente', ok: true },
    ],
  },
  Duquesa: {
    zonas: ['PR', 'SC'],
    img: '💎',
    cor: '#06b6d4',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-marrom', val: 'Moderadamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
    ],
  },
  Imperatriz: {
    zonas: ['GO', 'MG', 'SP', 'MS', 'MT', 'BA', 'PR', 'RS'],
    img: '🌿',
    cor: '#10b981',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Moderadamente resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-marrom', val: 'Moderadamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
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
  return createPortal(
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

        {/* Zonas indicadas */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
          {extra.zonas.map(z => (
            <span key={z} style={{
              fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`,
            }}>{z}</span>
          ))}
        </div>

        {/* Ciclo e reação a doenças */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Ciclo e reação a doenças — Embrapa Trigo (2025)
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
    </div>,
    document.body
  );
}

export default function VariedadesPage() {
  const [filtro, setFiltro]     = useState('Todas');
  const [detalhe, setDetalhe]   = useState(null);

  /* Recomendador */
  const [recomAtivo, setRecomAtivo] = useState(false);
  const [rcond, setRcond] = useState({ temp: 16, prec: 1200, alt: 800, geada: 20, argila: 25 });
  const aptidao  = useMemo(() => checarAptidao(rcond), [rcond]);
  const porCiclo = useMemo(() => cultivaresPorCiclo(), []);

  /* Calculadora de sementes */
  const [calcAtivo, setCalcAtivo]     = useState(false);
  const [calcArea,  setCalcArea]      = useState(50);
  const [calcDens,  setCalcDens]      = useState(250); // plantas/m²
  const [calcPMG,   setCalcPMG]       = useState(45);  // peso mil grãos (g)
  const [calcPod,   setCalcPod]       = useState(85);  // poder germinativo (%)
  const semKgHa = useMemo(() => {
    // Kg/ha = (densidade[plantas/m²] × PMG[g/1000 sementes]) / PG[%]
    // Verificado numericamente: density=250, PMG=45g, PG=85% -> 132,4 kg/ha,
    // dentro da faixa real de referência para cevada (100-150 kg/ha). A
    // versão anterior dividia por um fator 10 a mais (bug), entregando
    // ~13 kg/ha — sub-dimensionaria a semeadura em 10x.
    const kgHa = (calcDens * calcPMG) / calcPod;
    return { kgHa: kgHa.toFixed(1), total: (kgHa * calcArea).toFixed(0), sacos: Math.ceil(kgHa * calcArea / 50) };
  }, [calcArea, calcDens, calcPMG, calcPod]);

  const filtrados = Object.entries(CULTIVARES).filter(([key, c]) => {
    if (filtro === 'Todas') return true;
    return c.ciclo.startsWith(`${filtro} ·`);
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Variedades</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Catálogo de cultivares Agrária / Embrapa para cevada cervejeira</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Botões de ferramentas */}
          <button onClick={() => { setRecomAtivo(v => !v); setCalcAtivo(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: recomAtivo ? '#1B4332' : 'rgba(27,67,50,0.07)', color: recomAtivo ? '#fff' : '#1B4332',
            border: '1px solid rgba(27,67,50,0.25)', transition: 'all 0.15s',
          }}>
            <Wand2 size={12} /> Recomendador
          </button>
          <button onClick={() => { setCalcAtivo(v => !v); setRecomAtivo(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: calcAtivo ? '#0284c7' : 'rgba(2,132,199,0.07)', color: calcAtivo ? '#fff' : '#0284c7',
            border: '1px solid rgba(2,132,199,0.25)', transition: 'all 0.15s',
          }}>
            <Calculator size={12} /> Calc. Sementes
          </button>
          <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
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

      {/* ── Verificador de Aptidão + Cultivares por Ciclo ── */}
      {recomAtivo && (
        <div style={{ background: '#fff', border: '1px solid rgba(27,67,50,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 16, boxShadow: '0 4px 16px rgba(27,67,50,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Wand2 size={14} color="#1B4332" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1B4332' }}>Verificador de Aptidão</p>
          </div>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16, marginLeft: 22 }}>
            Informe as condições do seu município — os critérios são os mesmos para todas as cultivares
            (não há tabela oficial com faixa climática diferente por cultivar); o que muda entre elas é
            o ciclo e a resistência a doenças, mostrados abaixo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Temp. média (°C)', key:'temp', min:5, max:30, step:0.5, fmt:v=>`${v}°C` },
              { label: 'Precipit. anual (mm)', key:'prec', min:200, max:2500, step:50, fmt:v=>`${v}mm` },
              { label: 'Altitude (m)', key:'alt', min:100, max:1800, step:50, fmt:v=>`${v}m` },
              { label: 'Risco geada (%)', key:'geada', min:0, max:80, step:5, fmt:v=>`${v}%` },
              { label: 'Argila (%)', key:'argila', min:5, max:60, step:5, fmt:v=>`${v}%` },
            ].map(({ label, key, min, max, step, fmt }) => (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'#374151', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#1B4332' }}>{fmt(rcond[key])}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={rcond[key]}
                  onChange={e => setRcond(p => ({ ...p, [key]: Number(e.target.value) }))}
                  style={{ accentColor: '#1B4332' }} />
              </div>
            ))}
          </div>

          {/* Resultado do checklist */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            padding: '12px 16px', borderRadius: 10,
            background: aptidao.apto ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${aptidao.apto ? '#BBF7D0' : '#FDE68A'}`,
          }}>
            {aptidao.apto ? <CheckCircle size={20} color="#16a34a" /> : <AlertTriangle size={20} color="#d97706" />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: aptidao.apto ? '#15803d' : '#92400e' }}>
                {aptidao.apto ? 'Condições dentro do padrão ZARC' : `${aptidao.aprovados} de ${aptidao.total} critérios atendidos`}
              </p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>
                {aptidao.criterios.filter(c => !c.ok).map(c => c.label).join(', ') || 'Todos os critérios agronômicos gerais foram atendidos.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 22 }}>
            {aptidao.criterios.map(c => (
              <div key={c.label} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                borderRadius: 7, background: c.ok ? '#F0FDF4' : '#FEF2F2',
              }}>
                {c.ok ? <CheckCircle size={11} color="#16a34a" /> : <XCircle size={11} color="#dc2626" />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 9, color: '#6B7280' }}>{c.label}</p>
                  <p style={{ fontSize: 9, color: '#9CA3AF' }}>{c.faixa}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cultivares reais, ordenadas por ciclo — sem pontuação fictícia */}
          <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform:'uppercase', letterSpacing: 0.6 }}>
            Cultivares disponíveis, do ciclo mais curto ao mais longo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {porCiclo.map(({ key, c, dias }, i) => {
              const Icon = c.icon;
              return (
                <div key={key} style={{
                  border: `2px solid ${i === 0 ? c.cor : '#E5E7EB'}`,
                  borderRadius: 12, padding: '14px 16px',
                  background: i === 0 ? `${c.cor}06` : '#F9FAFB',
                  position: 'relative',
                }}>
                  {i === 0 && (
                    <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:c.cor, color:'#fff', fontSize:8, fontWeight:800, padding:'2px 8px', borderRadius:10 }}>
                      CICLO MAIS CURTO
                    </span>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <Icon size={16} color={c.cor} />
                    <span style={{ fontSize:12, fontWeight:700, color:c.cor }}>{c.nome}</span>
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, color:'#111827', marginBottom:2 }}>{dias} dias</p>
                  <p style={{ fontSize:9, color:'#9CA3AF', marginBottom:6 }}>até maturação · {c.obtentor}</p>
                  <p style={{ fontSize:10, color:'#6B7280', lineHeight:1.5 }}>
                    {aptidao.criterios.find(cr => cr.label==='Risco de geada' && !cr.ok)
                      ? 'Geada acima do padrão — ciclo mais curto reduz a janela de exposição.'
                      : 'Dentro do padrão de geada informado.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calculadora de Sementes ── */}
      {calcAtivo && (
        <div style={{ background: '#fff', border: '1px solid rgba(2,132,199,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 16, boxShadow: '0 4px 16px rgba(2,132,199,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calculator size={14} color="#0284c7" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>Calculadora de Sementes</p>
            <span style={{ fontSize: 10, color: '#6B7280' }}>— Fórmula agronômica padrão (EMBRAPA)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { label:'Área (ha)', min:1, max:500, step:1, val:calcArea, set:setCalcArea, fmt:v=>`${v} ha` },
              { label:'Densidade (plantas/m²)', min:100, max:450, step:10, val:calcDens, set:setCalcDens, fmt:v=>`${v}/m²` },
              { label:'PMG — peso 1000 grãos (g)', min:30, max:65, step:1, val:calcPMG, set:setCalcPMG, fmt:v=>`${v} g` },
              { label:'Poder germinativo (%)', min:60, max:100, step:1, val:calcPod, set:setCalcPod, fmt:v=>`${v}%` },
            ].map(({ label, min, max, step, val, set, fmt }) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:10, color:'#374151', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#0284c7' }}>{fmt(val)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))}
                  style={{ accentColor: '#0284c7' }} />
              </div>
            ))}
            {/* Resultado */}
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:6, background:'#EFF6FF', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(2,132,199,0.2)' }}>
              <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7 }}>Resultado</p>
              <p style={{ fontSize:18, fontWeight:900, color:'#0284c7', lineHeight:1 }}>{semKgHa.kgHa} kg/ha</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{semKgHa.total} kg total</p>
              <p style={{ fontSize:10, color:'#6B7280' }}>{semKgHa.sacos} sacos × 50 kg</p>
            </div>
          </div>
          <div style={{ marginTop:14, padding:'9px 12px', background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, fontSize:10, color:'#0369a1' }}>
            <strong>Fórmula:</strong> Kg/ha = (Densidade[plantas/m²] × PMG[g/1000 sementes]) ÷ PG[%] —
            fórmula agronômica padrão de taxa de semeadura, comum a cereais de inverno
          </div>
        </div>
      )}

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
