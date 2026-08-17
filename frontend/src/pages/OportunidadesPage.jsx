import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Area, Line, ReferenceLine,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Truck, Shield, Leaf, Download, Filter,
  ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle,
  DollarSign, Sprout, Package, Zap, Map, ListOrdered,
  Wallet, CalendarClock, ShieldCheck, Wheat, SlidersHorizontal,
  ExternalLink, Info, Search, X,
} from 'lucide-react';
import TimelineManejo from '../components/oportunidades/TimelineManejo.jsx';
import MapaCobertura from '../components/oportunidades/MapaCobertura.jsx';

/* ─── Constantes ─────────────────────────────────────────────── */
// Sede real: Rua 5 de Maio, 745, Colônia Vitória — Entre Rios, Guarapuava/PR
const AGRARIA = { lat: -25.5630, lon: -51.4898 };

// Estimativas internas de referência (não há tabela pública de custo de
// produção por hectare específica para cevada cervejeira) — usadas apenas
// para simulação comparativa, ajuste conforme dados reais da sua região.
const CUSTOS_UF = {
  PR: { semente:180, fertilizante:950,  defensivos:450, mecanizacao:420, secagem_ton:65, prod_tha:3.5 },
  SC: { semente:180, fertilizante:980,  defensivos:470, mecanizacao:440, secagem_ton:65, prod_tha:3.2 },
  RS: { semente:175, fertilizante:920,  defensivos:430, mecanizacao:400, secagem_ton:60, prod_tha:3.0 },
  GO: { semente:190, fertilizante:1050, defensivos:520, mecanizacao:460, secagem_ton:70, prod_tha:2.8 },
  MG: { semente:185, fertilizante:1020, defensivos:500, mecanizacao:450, secagem_ton:68, prod_tha:2.6 },
  SP: { semente:190, fertilizante:1030, defensivos:510, mecanizacao:460, secagem_ton:70, prod_tha:2.5 },
  MS: { semente:185, fertilizante:1000, defensivos:490, mecanizacao:440, secagem_ton:66, prod_tha:2.7 },
  MT: { semente:190, fertilizante:1060, defensivos:530, mecanizacao:470, secagem_ton:72, prod_tha:2.6 },
  BA: { semente:195, fertilizante:1080, defensivos:540, mecanizacao:480, secagem_ton:74, prod_tha:2.4 },
  default: { semente:185, fertilizante:1000, defensivos:480, mecanizacao:440, secagem_ton:65, prod_tha:2.8 },
};

// Estados com ZARC cevada cervejeira publicado (Portaria SPA/MAPA + Embrapa
// Trigo 2025) — mesma lista usada na aba Seguro do painel de município.
const UFS_COM_SEGURO = new Set(['PR', 'SC', 'RS', 'SP', 'MG', 'GO', 'DF']);

/* ─── Helpers ────────────────────────────────────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*toR)*Math.cos(lat2*toR)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function calcLogistica(lat, lon, precoSaca, freteTonKm) {
  if (!lat || !lon) return null;
  const dist = Math.round(haversine(lat, lon, AGRARIA.lat, AGRARIA.lon) * 1.35);
  const precoTon = (precoSaca / 60) * 1000;
  const frete    = dist * freteTonKm;
  const liquido  = precoTon - frete;
  const scoreLog = dist <= 150 ? 100 : dist <= 300 ? 85 : dist <= 500 ? 65 : dist <= 700 ? 40 : 15;
  return { dist, precoTon, frete, liquido, scoreLog };
}

function calcViabilidade(m, precoSaca, freteTonKm) {
  const c   = CUSTOS_UF[m.uf] ?? CUSTOS_UF.default;
  const log = calcLogistica(m.lat, m.lon, precoSaca, freteTonKm);
  if (!log) return null;

  const precoLiqTon  = log.liquido;
  const custo_seca   = c.secagem_ton * c.prod_tha;
  const custo_total  = c.semente + c.fertilizante + c.defensivos + c.mecanizacao + custo_seca;
  const receita_ha   = precoLiqTon * c.prod_tha;
  const lucro_ha     = receita_ha - custo_total;
  const breakeven_tha = custo_total / Math.max(precoLiqTon, 1);
  const roi          = custo_total > 0 ? (lucro_ha / custo_total) * 100 : 0;

  const temSeguro   = UFS_COM_SEGURO.has(m.uf) && (m.score_aptidao ?? 0) >= 70;
  const scoreSeguro = temSeguro ? 30 : (m.score_aptidao ?? 0) >= 40 ? 85 : 0;

  // ── Hard Filter ──────────────────────────────────────────────
  const isInaptoPorClima = (m.score_aptidao ?? 0) < 40;
  const hasHighFrostRisk = (m.risco_geada_pct ?? 0) > 40 && (m.score_aptidao ?? 0) < 70;

  let scoreComb = Math.round(
    (m.score_aptidao ?? 0) * 0.45 +
    log.scoreLog           * 0.30 +
    scoreSeguro            * 0.15 +
    (roi > 0 ? Math.min(roi, 100) * 0.10 : 0)
  );

  if (isInaptoPorClima) scoreComb = 0;
  else if (hasHighFrostRisk) scoreComb = Math.round(scoreComb * 0.60);

  return {
    ...log, ...c,
    custo_total, receita_ha, lucro_ha, breakeven_tha, roi,
    temSeguro, scoreSeguro, scoreComb,
    isInaptoPorClima, hasHighFrostRisk,
  };
}

// Janela de semeio e cultivar indicada — não há tabela oficial de
// produtividade ou adubação por cultivar (nenhuma fonte Embrapa/FAPA publica
// isso), então a recomendação se limita ao que é real e sourced: cultivar
// (Tabela 3.1, Embrapa Trigo 2025) e janela de semeio (ZARC).
function recomendarManejo(m) {
  const g   = m.risco_geada_pct ?? 0;
  const t   = m.temp_media_anual ?? 17;
  const alt = m.altitude ?? 0;
  const uf  = m.uf ?? '';

  if (['GO','MG','SP','MS','MT','BA'].includes(uf)) return {
    cultivar:    'Imperatriz',
    semeio:      'Maio–Jun (ciclo inverno seco)',
    alerta:      'Irrigação complementar pode ser necessária em jun/jul',
  };

  if (g > 30 || t < 13) return {
    cultivar:    'BRS Cauê',
    semeio:      'Jul (tardio — reduz risco de geada no perfilhamento)',
    alerta:      `Geada ${g.toFixed(0)}% — semeio tardio protege espigamento`,
  };

  if (alt >= 900 && t >= 14 && t <= 18) return {
    cultivar:    'Duquesa',
    semeio:      'Jun–Jul (janela ótima em altitude)',
    alerta:      'Condições ideais — monitorar ferrugem em ago/set',
  };

  return {
    cultivar:    'Princesa',
    semeio:      'Jun (janela padrão PR/SC)',
    alerta:      'Verificar previsão de chuva em out/nov para antecipar colheita',
  };
}

/* ─── Sub-componentes ─────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, cor, total }) {
  const pct = total ? Math.min(100, Math.round((Number(value) / total) * 100)) : null;
  return (
    <div style={{
      position:'relative', overflow:'hidden',
      background: '#fff', borderRadius:16, border:'1px solid #E5E7EB',
      padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
      transition:'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 10px 28px ${cor}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; }}
    >
      {/* Ícone-marca d'água */}
      <Icon size={80} color={cor} style={{ position:'absolute', top:-16, right:-16, opacity:0.06 }} />
      <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
        <div style={{ width:42, height:42, borderRadius:11, background:`${cor}16`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={19} color={cor} />
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:10.5, color:'#6B7280', fontWeight:600, marginBottom:2, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</p>
          <p style={{ fontSize:25, fontWeight:800, color:'#111827', lineHeight:1 }}>{value.toLocaleString('pt-BR')}</p>
        </div>
      </div>
      {sub && <p style={{ fontSize:10.5, color:'#9CA3AF', marginTop:8, position:'relative' }}>{sub}</p>}
      {pct != null && (
        <div style={{ marginTop:8, height:4, borderRadius:99, background:'#F3F4F6', overflow:'hidden', position:'relative' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:cor, borderRadius:99, transition:'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score, compact }) {
  const cor  = score >= 75 ? '#16a34a' : score >= 55 ? '#ca8a04' : '#dc2626';
  const bg   = score >= 75 ? '#f0fdf4' : score >= 55 ? '#fefce8' : '#fef2f2';
  const text = score >= 75 ? 'Alta'    : score >= 55 ? 'Média'   : 'Baixa';
  if (compact) {
    return (
      <span style={{
        fontSize:11, fontWeight:700, color:cor, background:bg,
        border:`1px solid ${cor}30`, borderRadius:6, padding:'2px 8px',
      }}>{score} · {text}</span>
    );
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:96 }}>
      <div style={{ flex:1, height:5, borderRadius:99, background:'#F3F4F6', overflow:'hidden' }}>
        <div style={{ width:`${Math.min(100, score)}%`, height:'100%', background:cor, borderRadius:99, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:800, color:cor, minWidth:24, textAlign:'right' }}>{score}</span>
    </div>
  );
}

function BreakevenChart({ custoTotal, precoLiqTon, prodEsperada, breakeven }) {
  const data = useMemo(() => Array.from({ length: 23 }, (_, i) => {
    const prod = +(0.5 + i * 0.25).toFixed(2);
    return { prod, receita: Math.round(prod * Math.max(precoLiqTon, 1)), custo: Math.round(custoTotal) };
  }), [custoTotal, precoLiqTon]);

  const be = breakeven ? +breakeven.toFixed(2) : null;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top:12, right:24, left:0, bottom:14 }}>
        <defs>
          <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="prod" tick={{ fontSize:9, fill:'#9CA3AF' }} axisLine={false} tickLine={false}
          tickFormatter={v => `${v}t`}
          label={{ value:'Produtividade (t/ha)', position:'insideBottom', offset:-6, fontSize:9, fill:'#9CA3AF' }}
        />
        <YAxis
          tick={{ fontSize:9, fill:'#9CA3AF' }} axisLine={false} tickLine={false}
          tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v, n) => [`R$ ${v.toLocaleString('pt-BR')}/ha`, n]}
          contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }}
        />
        <Area type="monotone" dataKey="receita" stroke="#16a34a" fill="url(#gradReceita)" strokeWidth={2.5} name="Receita" dot={false} />
        <Line type="monotone" dataKey="custo" stroke="#dc2626" strokeDasharray="8 4" strokeWidth={2} name="Custo total" dot={false} />
        {be && (
          <ReferenceLine x={be} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
            label={{ value:`Break-even: ${be}t`, position:'insideTopRight', fontSize:9, fill:'#ca8a04' }} />
        )}
        {prodEsperada && (
          <ReferenceLine x={prodEsperada} stroke="#16a34a" strokeDasharray="3 3" strokeWidth={1.5}
            label={{ value:`Esperado: ${prodEsperada}t`, position:'insideTopLeft', fontSize:9, fill:'#15803d' }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const TABS = [
  { label: 'Ranking',            icon: ListOrdered,   desc: 'Municípios ordenados por prioridade de expansão (aptidão + logística + seguro + ROI).' },
  { label: 'Mapa de Cobertura',  icon: Map,            desc: 'Mesma classificação do ranking, em mapa — veja onde os municípios prioritários se concentram.' },
  { label: 'Break-even',         icon: Wallet,         desc: 'Quanto cada município precisa produzir pra cobrir o custo — contexto rápido, não substitui a calculadora completa.' },
  { label: 'Manejos',            icon: CalendarClock,  desc: 'Cultivar indicada e janela de semeio para os municípios mais bem ranqueados.' },
  { label: 'Expansão de Seguro', icon: ShieldCheck,    desc: 'Municípios aptos sem PSR/PROAGRO ativo, priorizando quem já faz fronteira com área segurada.' },
];

/* ─── Componente principal ───────────────────────────────────── */
export default function OportunidadesPage({ municipios = [] }) {
  const navigate = useNavigate();
  const [tab,         setTab]         = useState(0);
  const [ufFiltro,    setUfFiltro]    = useState('Todos');
  const [distMax,     setDistMax]     = useState(1000);
  const [scoreMin,    setScoreMin]    = useState(50);
  const [precoSaca,   setPrecoSaca]   = useState(95);
  const [freteTonKm,  setFreteTonKm]  = useState(0.32);
  const [simAberto,   setSimAberto]   = useState(false);
  const [sortKey,     setSortKey]     = useState('scoreComb');
  const [sortAsc,     setSortAsc]     = useState(false);
  const [detalhe,     setDetalhe]     = useState(null);
  const [manejoSel,   setManejoSel]   = useState(null);
  const [mapaSelected,setMapaSelected]= useState(null);
  const [buscaManejo, setBuscaManejo] = useState('');
  const [manejoAberto,setManejoAberto]= useState(false);

  const ufs = useMemo(() => {
    const s = new Set(municipios.map(m => m.uf).filter(Boolean));
    return ['Todos', ...Array.from(s).sort()];
  }, [municipios]);

  /* Enriquece TODOS os municípios com viabilidade (incl. inaptos) */
  const dados = useMemo(() => {
    return municipios
      .filter(m => m.lat && m.lon)
      .map(m => {
        const v = calcViabilidade(m, precoSaca, freteTonKm);
        if (!v) return null;
        return { ...m, ...v };
      })
      .filter(Boolean);
  }, [municipios, precoSaca, freteTonKm]);

  /* Filtrados para o Ranking */
  const filtrados = useMemo(() => {
    return dados
      .filter(m =>
        (ufFiltro === 'Todos' || m.uf === ufFiltro) &&
        m.dist <= distMax &&
        m.scoreComb >= scoreMin
      )
      .sort((a, b) => {
        const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
        return sortAsc ? va - vb : vb - va;
      });
  }, [dados, ufFiltro, distMax, scoreMin, sortKey, sortAsc]);

  /* Sugestões de busca pro seletor de município da aba Manejos — filtra por
     nome/UF dentro do que já está filtrado no topo (estado/score/distância),
     sem query mostra os melhores ranqueados primeiro. */
  const sugestoesManejo = useMemo(() => {
    const q = buscaManejo.trim().toLowerCase();
    const base = q.length === 0
      ? filtrados
      : filtrados.filter(m => m.nome_municipio?.toLowerCase().includes(q) || m.uf?.toLowerCase() === q);
    return base.slice(0, 8);
  }, [buscaManejo, filtrados]);

  function selecionarManejo(m) {
    setManejoSel(m);
    setBuscaManejo('');
    setManejoAberto(false);
  }

  /* Município é a base de comparação pros KPIs e pra aba de Expansão de
     Seguro — assim os dois acompanham o filtro de Estado do topo da página,
     igual a tabela de Ranking já fazia. */
  const dadosUF = useMemo(() => (
    ufFiltro === 'Todos' ? dados : dados.filter(m => m.uf === ufFiltro)
  ), [dados, ufFiltro]);

  /* KPIs */
  const kpis = useMemo(() => ({
    aptos:   dadosUF.filter(m => (m.score_aptidao ?? 0) >= 70).length,
    semSeg:  dadosUF.filter(m => !m.temSeguro && (m.score_aptidao ?? 0) >= 40).length,
    viaveis: dadosUF.filter(m => m.dist <= 500 && !m.isInaptoPorClima).length,
    prio1:   dadosUF.filter(m => m.scoreComb >= 75).length,
  }), [dadosUF]);

  /* Análise de vizinhança para expansão de seguro. O candidato respeita o
     filtro de Estado (dadosUF); o conjunto "já tem seguro" fica nacional de
     propósito — o vizinho segurado mais próximo pode estar do outro lado da
     divisa estadual, e isso não deveria sumir só porque o filtro é outro. */
  const expansao = useMemo(() => {
    const comSeguro = dados.filter(m => m.temSeguro);
    return dadosUF
      .filter(m => !m.temSeguro && (m.score_aptidao ?? 0) >= 40)
      .map(m => {
        let minDist = Infinity;
        comSeguro.forEach(s => {
          if (!s.lat || !s.lon) return;
          const d = haversine(m.lat, m.lon, s.lat, s.lon);
          if (d < minDist) minDist = d;
        });
        const fronteira = isFinite(minDist) && minDist <= 100;
        return { ...m, distSeguro: isFinite(minDist) ? Math.round(minDist) : null, fronteira };
      })
      .sort((a, b) => {
        if (a.fronteira !== b.fronteira) return (b.fronteira ? 1 : 0) - (a.fronteira ? 1 : 0);
        return b.scoreComb - a.scoreComb;
      })
      .slice(0, 60);
  }, [dados, dadosUF]);

  /* Dados para aba Custos */
  const dadosCusto = useMemo(() => {
    const map = {};
    filtrados.forEach(m => {
      if (!map[m.uf]) map[m.uf] = { uf: m.uf, lucro: 0, n: 0 };
      map[m.uf].lucro += m.lucro_ha;
      map[m.uf].n++;
    });
    return Object.values(map)
      .map(x => ({ ...x, lucro_medio: Math.round(x.lucro / x.n) }))
      .sort((a, b) => b.lucro_medio - a.lucro_medio)
      .slice(0, 10);
  }, [filtrados]);

  /* Radar para detalhe */
  const radarData = detalhe ? [
    { axis:'Solo',       val: detalhe.tipo_solo_zarc >= 2 ? 100 : 20 },
    { axis:'Temperatura',val: detalhe.temp_media_anual >= 10 && detalhe.temp_media_anual <= 22 ? 100 : 30 },
    { axis:'Precipit.',  val: detalhe.precipitacao_acumulada_anual >= 400 && detalhe.precipitacao_acumulada_anual <= 2000 ? 100 : 30 },
    { axis:'Altitude',   val: detalhe.altitude >= 700 ? 100 : 40 },
    { axis:'Geada',      val: (detalhe.risco_geada_pct ?? 100) < 30 ? 100 : 40 },
    { axis:'Logística',  val: detalhe.scoreLog },
  ] : [];

  function exportCSV() {
    const cols = ['nome_municipio','uf','score_aptidao','dist','frete','liquido','lucro_ha','roi','scoreComb'];
    const rows = filtrados.map(m => cols.map(c => {
      const v = m[c];
      return typeof v === 'number' ? v.toFixed(1) : (v ?? '');
    }).join(',')).join('\n');
    const blob = new Blob([cols.join(',') + '\n' + rows], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'oportunidades_cevada.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  const Th = ({ k, children }) => (
    <th onClick={() => toggleSort(k)} style={{
      position:'sticky', top:0, zIndex:1,
      padding:'11px 12px', fontSize:10, fontWeight:700,
      color: sortKey === k ? '#1B4332' : '#6B7280',
      textTransform:'uppercase', letterSpacing:0.8,
      cursor:'pointer', whiteSpace:'nowrap', userSelect:'none',
      borderBottom:'1px solid #E5E7EB', textAlign:'left',
      background: sortKey === k ? '#F0F7F2' : '#F9FAFB',
      transition:'background 0.15s',
    }}>
      {children} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  /* Município selecionado para Timeline */
  const manejoTop = manejoSel ?? filtrados[0] ?? null;
  const manejoRec = manejoTop ? recomendarManejo(manejoTop) : null;

  /* Break-even context para aba Custos */
  const custoCtx = ufFiltro !== 'Todos' ? (CUSTOS_UF[ufFiltro] ?? CUSTOS_UF.default) : CUSTOS_UF.default;
  const precoLiqCtx = (precoSaca / 60 * 1000) - custoCtx.dist * freteTonKm;
  const breakevenCtx = custoCtx.semente + custoCtx.fertilizante + custoCtx.defensivos + custoCtx.mecanizacao + (custoCtx.secagem_ton * custoCtx.prod_tha);
  const precoLiqReal = (precoSaca / 60 * 1000) - (ufFiltro !== 'Todos' && filtrados[0]?.frete ? filtrados[0].frete : 200);

  return (
    <div style={{ maxWidth:1200, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        marginBottom:22, display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:14, padding:'18px 22px', borderRadius:18,
        background:'linear-gradient(120deg,#0f2e1c 0%,#1B4332 55%,#164a33 100%)',
        boxShadow:'0 8px 28px rgba(27,67,50,0.22)', position:'relative', overflow:'hidden',
      }}>
        <Wheat size={140} color="#fff" style={{ position:'absolute', top:-30, right:20, opacity:0.06, transform:'rotate(18deg)' }} />
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:6 }}>
            <div style={{
              width:38, height:38, borderRadius:11, background:'rgba(255,255,255,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              border:'1px solid rgba(255,255,255,0.18)',
            }}>
              <TrendingUp size={18} color="#86efac" />
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:-0.3 }}>Oportunidades de Expansão</h1>
          </div>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginLeft:49 }}>
            Ranking combinado — aptidão ZARC · logística Agrária · viabilidade econômica · seguro agrícola
          </p>
        </div>
        <button onClick={exportCSV} style={{
          display:'flex', alignItems:'center', gap:6, position:'relative',
          padding:'9px 18px', borderRadius:9, cursor:'pointer',
          background:'rgba(255,255,255,0.95)', color:'#1B4332', border:'none', fontSize:12, fontWeight:700,
          boxShadow:'0 2px 10px rgba(0,0,0,0.15)', transition:'transform 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform='none'}
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <KpiCard icon={Leaf}    label="Aptos ZARC"         value={kpis.aptos}   sub={ufFiltro==='Todos' ? 'score ≥ 70' : `score ≥ 70 em ${ufFiltro}`}            cor="#16a34a" total={dadosUF.length} />
        <KpiCard icon={Shield}  label="Oport. de Seguro"   value={kpis.semSeg}  sub={ufFiltro==='Todos' ? 'aptos sem PSR ativo' : `sem PSR em ${ufFiltro}`}   cor="#7c3aed" total={dadosUF.length} />
        <KpiCard icon={Truck}   label="Logística Viável"   value={kpis.viaveis} sub="até 500 km da Agrária" cor="#2563eb" total={dadosUF.length} />
        <KpiCard icon={Star}    label="Prioridade 1"       value={kpis.prio1}   sub="score combinado ≥ 75"  cor="#d97706" total={dadosUF.length} />
      </div>

      {/* ── Barra de filtros (compacta) ── */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, marginBottom:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          {/* UF dropdown em vez de 27 botões */}
          <div>
            <label style={{ display:'block', fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.6, marginBottom:3 }}>Estado</label>
            <select value={ufFiltro} onChange={e => setUfFiltro(e.target.value)} style={{
              padding:'6px 10px', borderRadius:8, fontSize:12, border:'1px solid #E5E7EB',
              color:'#111827', background:'#F9FAFB', cursor:'pointer', outline:'none', fontWeight:600,
            }}>
              {ufs.map(uf => <option key={uf} value={uf}>{uf === 'Todos' ? 'Todos os estados' : uf}</option>)}
            </select>
          </div>

          {/* Score mínimo */}
          <div style={{ minWidth:160 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.6 }}>Score mín. combinado</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#111827' }}>{scoreMin}</span>
            </div>
            <input type="range" min={0} max={90} step={5} value={scoreMin}
              onChange={e => setScoreMin(+e.target.value)}
              style={{ width:'100%', accentColor:'#1B4332', height:4 }} />
          </div>

          {/* Distância máxima */}
          <div style={{ minWidth:160 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.6 }}>Distância máx.</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#111827' }}>{distMax} km</span>
            </div>
            <input type="range" min={100} max={2000} step={50} value={distMax}
              onChange={e => setDistMax(+e.target.value)}
              style={{ width:'100%', accentColor:'#1B4332', height:4 }} />
          </div>

          {/* Toggle simulador de preço/frete */}
          <button onClick={() => setSimAberto(v => !v)} style={{
            display:'flex', alignItems:'center', gap:6, marginLeft:'auto',
            padding:'7px 12px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600,
            background: simAberto ? '#F0F7F2' : '#F9FAFB', color: simAberto ? '#1B4332' : '#6B7280',
            border:`1px solid ${simAberto ? '#1B4332' : '#E5E7EB'}`,
          }}>
            <SlidersHorizontal size={12} /> Preço & frete
            {simAberto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <span style={{ fontSize:11, color:'#6B7280', fontWeight:600 }}>
            {filtrados.length.toLocaleString('pt-BR')} municípios
          </span>
        </div>

        {/* Painel expansível: preço da saca + frete */}
        {simAberto && (
          <div style={{
            padding:'14px 18px', borderTop:'1px solid #F3F4F6', background:'#FAFBFA',
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:20,
          }}>
            {[
              { label:'Preço da saca simulado (R$)', val:precoSaca,  set:setPrecoSaca,  min:60,  max:150, step:1,    fmt:v=>`R$ ${v}` },
              { label:'Frete simulado (R$/ton·km)',  val:freteTonKm, set:setFreteTonKm, min:0.15,max:0.80,step:0.01, fmt:v=>`R$ ${v.toFixed(2)}` },
            ].map(({ label, val, set, min, max, step, fmt }) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:10, color:'#6B7280', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#111827' }}>{fmt(val)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(step < 1 ? +parseFloat(e.target.value).toFixed(2) : +e.target.value)}
                  style={{ width:'100%', accentColor:'#1B4332', height:4 }} />
              </div>
            ))}
            <p style={{ gridColumn:'1 / -1', fontSize:10, color:'#9CA3AF' }}>
              Esses dois valores recalculam frete, lucro e ROI de todos os municípios em tempo real — os demais filtros só reduzem a lista exibida.
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {TABS.map((t, i) => {
          const Ic = t.icon;
          const ativo = tab === i;
          return (
            <button key={t.label} onClick={() => setTab(i)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', fontSize:12, cursor:'pointer', borderRadius:9,
              background: ativo ? '#1B4332' : '#fff',
              border: `1px solid ${ativo ? '#1B4332' : '#E5E7EB'}`,
              fontWeight: ativo ? 700 : 500,
              color: ativo ? '#fff' : '#6B7280',
              boxShadow: ativo ? '0 3px 10px rgba(27,67,50,0.25)' : 'none',
              transition:'all 0.15s',
            }}>
              <Ic size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Descrição da aba ativa ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Info size={12} color="#9CA3AF" />
          <p style={{ fontSize:11.5, color:'#6B7280' }}>{TABS[tab].desc}</p>
        </div>
        {tab === 2 && (
          <button onClick={() => navigate('/custos')} style={{
            display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600,
            color:'#0284c7', background:'none', border:'none', cursor:'pointer', flexShrink:0,
          }}>
            Abrir calculadora completa <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* ══ TAB 0: Ranking ══ */}
      {tab === 0 && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
          {filtrados.length === 0 && (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <AlertTriangle size={20} color="#9CA3AF" style={{ marginBottom:8 }} />
              <p style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>Nenhum município encontrado com esses filtros</p>
              <p style={{ fontSize:11, color:'#9CA3AF' }}>
                {ufFiltro !== 'Todos' ? `Nenhum município em ${ufFiltro} atende score mínimo ${scoreMin} e distância até ${distMax}km — ` : ''}
                tente reduzir o score mínimo ou aumentar a distância máxima.
              </p>
            </div>
          )}
          <div style={{ overflow:'auto', maxHeight:620 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <Th k="nome_municipio">Município</Th>
                  <Th k="score_aptidao">ZARC</Th>
                  <Th k="dist">Distância</Th>
                  <Th k="lucro_ha">Lucro/ha</Th>
                  <Th k="scoreComb">Prioridade</Th>
                  <th style={{ padding:'10px 12px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', position:'sticky', top:0 }} />
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 80).map((m, i) => (
                  <tr key={m.codigo_ibge}
                    onClick={() => setDetalhe(m)}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0F7F2'}
                    onMouseLeave={e => e.currentTarget.style.background = i < 3 ? ['#fffbeb','#f9fafb','#fff7ed'][i] : (i % 2 === 0 ? '#fff' : '#FAFAFA')}
                    style={{
                      background: i < 3 ? ['#fffbeb','#f9fafb','#fff7ed'][i] : (i % 2 === 0 ? '#fff' : '#FAFAFA'),
                      borderBottom:'1px solid #F3F4F6',
                      opacity: m.isInaptoPorClima ? 0.55 : 1,
                      transition:'background 0.1s', cursor:'pointer',
                    }}>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:600, color:'#111827' }}>
                      {i < 3 && <span style={{ marginRight:6 }}>{['🥇','🥈','🥉'][i]}</span>}
                      {m.nome_municipio}
                      <span style={{ fontSize:10, fontWeight:600, color:'#9CA3AF', marginLeft:6 }}>{m.uf}</span>
                      {m.hasHighFrostRisk && <AlertTriangle size={10} color="#ca8a04" style={{ marginLeft:5 }} />}
                    </td>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:700, color: m.score_aptidao >= 70 ? '#16a34a' : '#ca8a04' }}>
                      {m.score_aptidao ?? '—'}
                    </td>
                    <td style={{ padding:'11px 12px', fontSize:12, color:'#374151' }}>{m.dist} km</td>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:700, color: m.lucro_ha > 0 ? '#16a34a' : '#DC2626' }}>
                      R$ {Math.round(m.lucro_ha).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding:'11px 12px' }}>
                      <ScoreBadge score={m.scoreComb} />
                    </td>
                    <td style={{ padding:'11px 12px' }}>
                      <button onClick={e => { e.stopPropagation(); setDetalhe(m); }} style={{
                        fontSize:10, padding:'3px 8px', borderRadius:5, cursor:'pointer',
                        background:'#F3F4F6', border:'1px solid #E5E7EB', color:'#374151',
                      }}>
                        Detalhe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Painel de detalhe — modal, não expande a tabela */}
          {detalhe && (() => {
            const manejo = recomendarManejo(detalhe);
            return createPortal(
            <div onClick={() => setDetalhe(null)} style={{
              position:'fixed', inset:0, zIndex:2000,
              background:'rgba(15,23,17,0.55)', backdropFilter:'blur(3px)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:24,
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                background:'#fff', borderRadius:18, maxWidth:820, width:'100%',
                maxHeight:'85vh', overflow:'auto',
                boxShadow:'0 24px 70px rgba(0,0,0,0.35)',
              }}>
                {/* Header sticky do modal */}
                <div style={{
                  position:'sticky', top:0, zIndex:1, background:'#fff',
                  padding:'18px 22px', borderBottom:'1px solid #E5E7EB',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <div>
                    <p style={{ fontSize:16, fontWeight:800, color:'#111827' }}>
                      {detalhe.nome_municipio} <span style={{ color:'#9CA3AF', fontWeight:500 }}>· {detalhe.uf}</span>
                    </p>
                    <p style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>IBGE {detalhe.codigo_ibge} · {detalhe.dist} km da Agrária</p>
                  </div>
                  <button onClick={() => setDetalhe(null)} style={{
                    background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8,
                    padding:7, cursor:'pointer', color:'#6B7280', display:'flex',
                  }}>✕</button>
                </div>

                <div style={{
                  padding:'20px 22px',
                  display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20,
                }}>
                {/* Radar */}
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:0.8 }}>
                    Perfil de Aptidão
                  </p>
                  {detalhe.isInaptoPorClima && (
                    <div style={{ display:'flex', gap:6, alignItems:'center', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'6px 10px', marginBottom:10 }}>
                      <AlertTriangle size={12} color="#dc2626" />
                      <span style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>Filtro rígido aplicado — Score combinado zerado (Inapto ZARC)</span>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize:9, fill:'#6B7280' }} />
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
                      <Radar dataKey="val" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#6B7280', marginTop:6, padding:'0 4px' }}>
                    <span>Frete: R$ {Math.round(detalhe.frete)}/ton</span>
                    <span>ROI: {detalhe.roi.toFixed(0)}%</span>
                  </div>
                </div>
                {/* Custos */}
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:0.8 }}>Viabilidade Econômica / ha</p>
                  {[
                    { label:'Sementes',      val: detalhe.semente,      cor:'#6B7280' },
                    { label:'Fertilizantes', val: detalhe.fertilizante, cor:'#6B7280' },
                    { label:'Defensivos',    val: detalhe.defensivos,   cor:'#6B7280' },
                    { label:'Mecanização',   val: detalhe.mecanizacao,  cor:'#6B7280' },
                    { label:'Secagem',       val: Math.round(detalhe.secagem_ton * detalhe.prod_tha), cor:'#6B7280' },
                    { label:'Custo total',   val: Math.round(detalhe.custo_total),  cor:'#DC2626', bold:true },
                    { label:'Receita bruta', val: Math.round(detalhe.receita_ha),   cor:'#059669', bold:true },
                    { label:'Lucro líquido', val: Math.round(detalhe.lucro_ha),     cor: detalhe.lucro_ha >= 0 ? '#16a34a' : '#DC2626', bold:true },
                  ].map(({ label, val, cor, bold }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #E5E7EB' }}>
                      <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight: bold ? 700 : 500, color:cor }}>R$ {val?.toLocaleString('pt-BR') ?? '—'}/ha</span>
                    </div>
                  ))}
                  <p style={{ fontSize:10, color:'#9CA3AF', marginTop:6 }}>
                    Prod. estimada: {detalhe.prod_tha} t/ha · Break-even: {detalhe.breakeven_tha?.toFixed(2)} t/ha
                  </p>
                </div>
                {/* Manejo */}
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:0.8 }}>Manejo Recomendado</p>
                  {[
                    { icon:Leaf,       label:'Cultivar',    val:manejo.cultivar },
                    { icon:Sprout,     label:'Semeio',      val:manejo.semeio },
                  ].map(({ icon:Ic, label, val }) => (
                    <div key={label} style={{ display:'flex', gap:8, marginBottom:10, alignItems:'flex-start' }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Ic size={12} color="#16a34a" />
                      </div>
                      <div>
                        <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7 }}>{label}</p>
                        <p style={{ fontSize:11, color:'#374151', fontWeight:500 }}>{val}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ background:'#FEF9C3', border:'1px solid #FDE047', borderRadius:7, padding:'7px 10px', marginTop:4 }}>
                    <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                      <AlertTriangle size={11} color="#ca8a04" style={{ flexShrink:0, marginTop:1 }} />
                      <p style={{ fontSize:10, color:'#92400e' }}>{manejo.alerta}</p>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>,
            document.body
            );
          })()}
        </div>
      )}

      {/* ══ TAB 1: Mapa de Cobertura ══ */}
      {tab === 1 && (
        <div>
          <MapaCobertura
            dados={dados}
            onSelect={m => setMapaSelected(prev => prev?.codigo_ibge === m.codigo_ibge ? null : m)}
            selected={mapaSelected}
          />
          {mapaSelected && (() => {
            const mj = recomendarManejo(mapaSelected);
            return (
              <div style={{
                marginTop:16, background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 24px',
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20,
              }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:12 }}>
                    {mapaSelected.nome_municipio} / {mapaSelected.uf}
                  </p>
                  {[
                    ['Score ZARC', `${mapaSelected.score_aptidao ?? '—'}/100`],
                    ['Altitude',   `${mapaSelected.altitude?.toFixed(0) ?? '—'} m`],
                    ['Temp. média',`${mapaSelected.temp_media_anual?.toFixed(1) ?? '—'}°C`],
                    ['Risco geada',`${mapaSelected.risco_geada_pct?.toFixed(0) ?? '—'}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #F3F4F6' }}>
                      <span style={{ fontSize:11, color:'#6B7280' }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:12, textTransform:'uppercase', letterSpacing:0.8 }}>Logística</p>
                  {[
                    ['Distância Agrária', `${mapaSelected.dist} km`],
                    ['Frete estimado',    `R$ ${Math.round(mapaSelected.frete)}/ton`],
                    ['Preço líq./ton',    `R$ ${Math.round(mapaSelected.liquido)}`],
                    ['Lucro est./ha',     `R$ ${Math.round(mapaSelected.lucro_ha)}`],
                    ['ROI estimado',      `${mapaSelected.roi?.toFixed(0)}%`],
                    ['Score combinado',   `${mapaSelected.scoreComb}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #F3F4F6' }}>
                      <span style={{ fontSize:11, color:'#6B7280' }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:'#374151' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:12, textTransform:'uppercase', letterSpacing:0.8 }}>Manejo</p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#15803d', marginBottom:6 }}>{mj.cultivar}</p>
                  <p style={{ fontSize:11, color:'#374151', marginBottom:6 }}>{mj.semeio}</p>
                  <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:7, padding:'6px 9px', marginTop:8 }}>
                    <p style={{ fontSize:10, color:'#92400e' }}>⚠ {mj.alerta}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ TAB 2: Custos & ROI ══ */}
      {tab === 2 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Lucro por UF */}
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:16 }}>Lucro médio estimado por UF (R$/ha)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dadosCusto} layout="vertical" margin={{ left:10, right:30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <YAxis type="category" dataKey="uf" tick={{ fontSize:11, fill:'#374151', fontWeight:600 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip formatter={v => [`R$ ${Math.round(v)}/ha`, 'Lucro médio']} contentStyle={{ fontSize:11, borderRadius:8 }} />
                <Bar dataKey="lucro_medio" radius={[0,6,6,0]}>
                  {dadosCusto.map((d, i) => <Cell key={i} fill={d.lucro_medio > 0 ? '#16a34a' : '#dc2626'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Break-even chart */}
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:4 }}>Análise de Break-even</p>
            <p style={{ fontSize:11, color:'#6B7280', marginBottom:16 }}>
              Receita vs Custo por produtividade · {ufFiltro !== 'Todos' ? ufFiltro : 'referência nacional'}
              · Frete: R$ {Math.round(filtrados[0]?.frete ?? 100)}/ton
            </p>
            <BreakevenChart
              custoTotal={breakevenCtx}
              precoLiqTon={Math.max(filtrados[0]?.liquido ?? precoLiqReal, 100)}
              prodEsperada={custoCtx.prod_tha}
              breakeven={filtrados[0]?.breakeven_tha ?? (breakevenCtx / Math.max(filtrados[0]?.liquido ?? precoLiqReal, 100))}
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
              {[
                { label:'Custo total/ha', val:`R$ ${breakevenCtx.toLocaleString('pt-BR')}` },
                { label:'Produtividade esperada', val:`${custoCtx.prod_tha} t/ha` },
                { label:'Lucro estimado/ha', val:`R$ ${Math.round((filtrados[0]?.liquido ?? precoLiqReal) * custoCtx.prod_tha - breakevenCtx).toLocaleString('pt-BR')}`, cor: ((filtrados[0]?.liquido ?? precoLiqReal) * custoCtx.prod_tha - breakevenCtx) > 0 ? '#16a34a' : '#dc2626' },
                { label:'Break-even necessário', val:`${(breakevenCtx / Math.max(filtrados[0]?.liquido ?? precoLiqReal, 100)).toFixed(2)} t/ha` },
              ].map(({ label, val, cor }) => (
                <div key={label} style={{ background:'#F9FAFB', borderRadius:8, padding:'10px 12px' }}>
                  <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, marginBottom:3 }}>{label}</p>
                  <p style={{ fontSize:13, fontWeight:700, color: cor ?? '#111827' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown de custos */}
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', gridColumn:'1 / -1' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:4 }}>Estrutura de Custo de Produção</p>
            <p style={{ fontSize:11, color:'#6B7280', marginBottom:16 }}>Referência por hectare · {ufFiltro !== 'Todos' ? ufFiltro : 'média nacional'}</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16 }}>
              {(() => {
                const c = ufFiltro !== 'Todos' ? (CUSTOS_UF[ufFiltro] ?? CUSTOS_UF.default) : CUSTOS_UF.default;
                const itens = [
                  { label:'Sementes',      val:c.semente,      cor:'#6366f1' },
                  { label:'Fertilizantes', val:c.fertilizante, cor:'#0891b2' },
                  { label:'Defensivos',    val:c.defensivos,   cor:'#d97706' },
                  { label:'Mecanização',   val:c.mecanizacao,  cor:'#7c3aed' },
                  { label:'Secagem',       val:Math.round(c.secagem_ton * c.prod_tha), cor:'#16a34a' },
                ];
                const total = itens.reduce((s, i) => s + i.val, 0);
                return itens.map(({ label, val, cor }) => (
                  <div key={label} style={{ background:'#F9FAFB', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ width:28, height:4, borderRadius:2, background:cor, marginBottom:10 }} />
                    <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, marginBottom:4 }}>{label}</p>
                    <p style={{ fontSize:16, fontWeight:800, color:'#111827' }}>R$ {val}</p>
                    <p style={{ fontSize:10, color:'#6B7280', marginTop:2 }}>{(val/total*100).toFixed(0)}% do custo</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 3: Manejos ══ */}
      {tab === 3 && (
        <div>
          {filtrados.length === 0 && (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'32px 20px', textAlign:'center' }}>
              <AlertTriangle size={20} color="#9CA3AF" style={{ marginBottom:8 }} />
              <p style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>Nenhum município para recomendar manejo</p>
              <p style={{ fontSize:11, color:'#9CA3AF' }}>Ajuste o estado, score mínimo ou distância máxima no topo da página.</p>
            </div>
          )}
          {/* Seletor de município — busca por nome, não lista tudo de uma vez */}
          {filtrados.length > 0 && (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#6B7280', fontWeight:600, flexShrink:0 }}>Calendário para:</span>
              <div style={{ position:'relative', width:300 }}>
                <Search size={12} color="#9CA3AF" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} />
                <input
                  value={buscaManejo}
                  onChange={e => { setBuscaManejo(e.target.value); setManejoAberto(true); }}
                  onFocus={() => setManejoAberto(true)}
                  onBlur={() => setTimeout(() => setManejoAberto(false), 150)}
                  placeholder={manejoSel ? `${manejoSel.nome_municipio} / ${manejoSel.uf}` : `${filtrados[0]?.nome_municipio} (melhor ranqueado)`}
                  style={{
                    width:'100%', padding:'7px 28px 7px 28px', borderRadius:8, fontSize:12,
                    border:'1px solid #E5E7EB', color:'#374151', background:'#fff', outline:'none',
                  }}
                />
                {manejoSel && !manejoAberto && (
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setManejoSel(null); setBuscaManejo(''); }}
                    title="Limpar seleção"
                    style={{
                      position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:'#9CA3AF',
                      padding:4, display:'flex',
                    }}>
                    <X size={12} />
                  </button>
                )}
                {manejoAberto && (
                  <div style={{
                    position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                    background:'#fff', border:'1px solid #E5E7EB', borderRadius:8,
                    boxShadow:'0 4px 20px rgba(0,0,0,0.12)', marginTop:3,
                    maxHeight:280, overflowY:'auto',
                  }}>
                    {sugestoesManejo.length === 0 ? (
                      <p style={{ fontSize:11, color:'#9CA3AF', padding:'10px 12px' }}>Nenhum município encontrado com esses filtros.</p>
                    ) : sugestoesManejo.map(m => (
                      <button key={m.codigo_ibge}
                        onClick={() => selecionarManejo(m)}
                        style={{
                          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                          padding:'8px 12px', border:'none', borderBottom:'1px solid #F3F4F6',
                          background: manejoSel?.codigo_ibge === m.codigo_ibge ? '#F0F7F2' : 'transparent',
                          cursor:'pointer', textAlign:'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = manejoSel?.codigo_ibge === m.codigo_ibge ? '#F0F7F2' : 'transparent'}
                      >
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:600, color:'#374151' }}>
                            {m.nome_municipio} <span style={{ color:'#9CA3AF', fontWeight:500 }}>/ {m.uf}</span>
                          </p>
                          <p style={{ fontSize:10, color:'#9CA3AF' }}>{m.dist} km da Agrária · R$ {Math.round(m.lucro_ha).toLocaleString('pt-BR')}/ha</p>
                        </div>
                        <ScoreBadge score={m.scoreComb} compact />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {buscaManejo.length === 0 && (
                <span style={{ fontSize:10, color:'#9CA3AF' }}>{filtrados.length.toLocaleString('pt-BR')} municípios disponíveis — digite pra buscar</span>
              )}
            </div>
          )}

          {/* Timeline component */}
          {manejoTop && manejoRec && (
            <div style={{ marginBottom:16 }}>
              <TimelineManejo municipio={manejoTop} manejo={manejoRec} />
            </div>
          )}

          {/* Grid de cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {filtrados.slice(0, 12).map(m => {
              const mj = recomendarManejo(m);
              return (
                <div key={m.codigo_ibge} style={{
                  background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{m.nome_municipio}</p>
                      <p style={{ fontSize:10, color:'#6B7280' }}>{m.uf} · {m.altitude?.toFixed(0)}m · {m.dist}km Agrária</p>
                    </div>
                    <ScoreBadge score={m.scoreComb} compact />
                  </div>
                  {[
                    { icon:Leaf,       label:'Cultivar',    val:mj.cultivar },
                    { icon:Sprout,     label:'Semeio',      val:mj.semeio },
                    { icon:Zap,        label:'Prod. estimada (ref.)',val:`${m.prod_tha} t/ha` },
                    { icon:DollarSign, label:'Lucro est.',  val:`R$ ${Math.round(m.lucro_ha)}/ha` },
                  ].map(({ icon:Ic, label, val }) => (
                    <div key={label} style={{ display:'flex', gap:8, marginBottom:7, alignItems:'flex-start' }}>
                      <Ic size={11} color="#6B7280" style={{ marginTop:2, flexShrink:0 }} />
                      <div>
                        <span style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7 }}>{label} </span>
                        <span style={{ fontSize:11, color:'#374151', fontWeight:500 }}>{val}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:8, background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:6, padding:'6px 8px' }}>
                    <p style={{ fontSize:9, color:'#92400e' }}>⚠ {mj.alerta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 4: Expansão de Seguro ══ */}
      {tab === 4 && (
        <div>
          <div style={{
            background:'linear-gradient(135deg,#ede9fe,#dbeafe)', border:'1px solid #c4b5fd',
            borderRadius:12, padding:'14px 18px', marginBottom:16,
            display:'flex', gap:12, alignItems:'flex-start',
          }}>
            <Shield size={18} color="#7c3aed" style={{ flexShrink:0, marginTop:2 }} />
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'#4c1d95', marginBottom:3 }}>
                Municípios Aptos ZARC sem Cobertura PSR/PROAGRO
              </p>
              <p style={{ fontSize:11, color:'#5b21b6', lineHeight:1.6 }}>
                Municípios abaixo têm aptidão ZARC confirmada mas sem seguro ativo.
                Os marcados com <strong>★ Fronteira</strong> fazem divisa geoespacial (≤ 100km) com municípios
                que já possuem alta cobertura de seguro — prioridade máxima para expansão PSR.
              </p>
            </div>
          </div>

          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
            {expansao.length === 0 && (
              <div style={{ padding:'32px 20px', textAlign:'center' }}>
                <AlertTriangle size={20} color="#9CA3AF" style={{ marginBottom:8 }} />
                <p style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>
                  {ufFiltro !== 'Todos' ? `Nenhuma oportunidade de expansão de seguro em ${ufFiltro}` : 'Nenhuma oportunidade de expansão de seguro'}
                </p>
                <p style={{ fontSize:11, color:'#9CA3AF' }}>
                  {ufFiltro !== 'Todos' ? 'Troque o estado no filtro do topo ou selecione "Todos os estados".' : 'Sem municípios aptos sem seguro no momento.'}
                </p>
              </div>
            )}
            {expansao.length > 0 && (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F9FAFB' }}>
                  {['Município','UF','Score ZARC','Distância Agrária','Lucro est./ha','ROI','Dist. p/ Seguro','Prioridade'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expansao.map((m, i) => (
                  <tr key={m.codigo_ibge} style={{
                    background: m.fronteira ? 'rgba(250,245,255,0.8)' : (i % 2 ? '#FAFAFA' : '#fff'),
                    borderBottom:'1px solid #F3F4F6',
                  }}>
                    <td style={{ padding:'9px 14px', fontSize:12, fontWeight:600, color:'#111827' }}>
                      {m.nome_municipio}
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ fontSize:10, fontWeight:700, background:'#EFF6FF', color:'#1d4ed8', borderRadius:4, padding:'2px 6px' }}>{m.uf}</span>
                    </td>
                    <td style={{ padding:'9px 14px', fontSize:12, fontWeight:700, color:'#ca8a04' }}>{m.score_aptidao}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color:'#374151' }}>{m.dist} km</td>
                    <td style={{ padding:'9px 14px', fontSize:12, fontWeight:700, color: m.lucro_ha > 0 ? '#16a34a' : '#dc2626' }}>R$ {Math.round(m.lucro_ha)}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color: m.roi > 0 ? '#059669' : '#dc2626' }}>{m.roi.toFixed(0)}%</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color:'#374151' }}>
                      {m.distSeguro != null ? `${m.distSeguro} km` : '—'}
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      {m.fronteira ? (
                        <span style={{
                          fontSize:10, fontWeight:700, borderRadius:6, padding:'3px 9px',
                          background:'#fef3c7', color:'#92400e', border:'1px solid #fde68a',
                        }}>★ Fronteira</span>
                      ) : (
                        <span style={{
                          fontSize:10, fontWeight:600, borderRadius:6, padding:'3px 9px',
                          background:'#f3f4f6', color:'#6B7280', border:'1px solid #e5e7eb',
                        }}>Média</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
