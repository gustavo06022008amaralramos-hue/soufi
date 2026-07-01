import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Brush, Legend,
  AreaChart, BarChart, Bar,
  ScatterChart, Scatter, ZAxis, LabelList,
  Cell, ReferenceLine, LineChart,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react';

/* ─── Regressão linear simples ───────────────────────────────── */
function regressaoLinear(dados, campo) {
  const n = dados.length;
  const xs = dados.map((_, i) => i);
  const ys = dados.map(d => d[campo]);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, predict: (x) => intercept + slope * x };
}

/* ─── Dados históricos (base CEPEA/MAPA/BACEN) ──────────────── */
const PRECO_HISTORICO = [
  { p:'Q1/15', cevada:31.0, dolar:2.87 }, { p:'Q2/15', cevada:32.5, dolar:3.08 },
  { p:'Q3/15', cevada:34.0, dolar:3.60 }, { p:'Q4/15', cevada:33.5, dolar:3.96 },
  { p:'Q1/16', cevada:36.0, dolar:3.99 }, { p:'Q2/16', cevada:38.0, dolar:3.49 },
  { p:'Q3/16', cevada:40.5, dolar:3.22 }, { p:'Q4/16', cevada:42.0, dolar:3.26 },
  { p:'Q1/17', cevada:41.5, dolar:3.13 }, { p:'Q2/17', cevada:43.0, dolar:3.21 },
  { p:'Q3/17', cevada:44.5, dolar:3.13 }, { p:'Q4/17', cevada:45.0, dolar:3.26 },
  { p:'Q1/18', cevada:44.5, dolar:3.24 }, { p:'Q2/18', cevada:47.0, dolar:3.70 },
  { p:'Q3/18', cevada:48.5, dolar:4.07 }, { p:'Q4/18', cevada:50.0, dolar:3.88 },
  { p:'Q1/19', cevada:49.0, dolar:3.76 }, { p:'Q2/19', cevada:51.0, dolar:3.92 },
  { p:'Q3/19', cevada:52.5, dolar:4.13 }, { p:'Q4/19', cevada:53.0, dolar:4.07 },
  { p:'Q1/20', cevada:55.0, dolar:4.48 }, { p:'Q2/20', cevada:58.5, dolar:5.32 },
  { p:'Q3/20', cevada:63.0, dolar:5.38 }, { p:'Q4/20', cevada:65.5, dolar:5.36 },
  { p:'Q1/21', cevada:68.0, dolar:5.53 }, { p:'Q2/21', cevada:73.0, dolar:5.28 },
  { p:'Q3/21', cevada:78.5, dolar:5.30 }, { p:'Q4/21', cevada:82.0, dolar:5.65 },
  { p:'Q1/22', cevada:85.0, dolar:5.19 }, { p:'Q2/22', cevada:91.0, dolar:5.05 },
  { p:'Q3/22', cevada:88.5, dolar:5.22 }, { p:'Q4/22', cevada:84.0, dolar:5.25 },
  { p:'Q1/23', cevada:78.0, dolar:5.22 }, { p:'Q2/23', cevada:80.5, dolar:4.85 },
  { p:'Q3/23', cevada:82.0, dolar:4.93 }, { p:'Q4/23', cevada:85.5, dolar:4.91 },
  { p:'Q1/24', cevada:88.0, dolar:4.98 }, { p:'Q2/24', cevada:93.0, dolar:5.18 },
  { p:'Q3/24', cevada:96.5, dolar:5.45 }, { p:'Q4/24', cevada:92.0, dolar:5.71 },
];

const SINISTROS = [
  { ano:'2015', seca:12.5, geada:9.0,  chuva:5.5  },
  { ano:'2016', seca:8.0,  geada:19.5, chuva:8.5  },
  { ano:'2017', seca:23.0, geada:4.5,  chuva:7.0  },
  { ano:'2018', seca:18.5, geada:11.0, chuva:10.5 },
  { ano:'2019', seca:28.0, geada:7.5,  chuva:8.0  },
  { ano:'2020', seca:32.0, geada:5.5,  chuva:14.0 },
  { ano:'2021', seca:13.5, geada:23.5, chuva:9.5  },
  { ano:'2022', seca:24.5, geada:16.0, chuva:17.5 },
  { ano:'2023', seca:20.0, geada:9.0,  chuva:12.0 },
  { ano:'2024', seca:12.0, geada:14.5, chuva:9.0  },
];

const SCATTER_DATA = [
  { safra:'15/16', prod:2.8, invest:1650, n:85  },
  { safra:'16/17', prod:3.1, invest:1780, n:92  },
  { safra:'17/18', prod:2.9, invest:1820, n:88  },
  { safra:'18/19', prod:3.3, invest:1950, n:105 },
  { safra:'19/20', prod:3.5, invest:2050, n:118 },
  { safra:'20/21', prod:3.2, invest:2180, n:95  },
  { safra:'21/22', prod:3.8, invest:2350, n:135 },
  { safra:'22/23', prod:4.1, invest:2550, n:148 },
  { safra:'23/24', prod:4.3, invest:2680, n:155 },
  { safra:'24/25', prod:4.5, invest:2820, n:162 },
];

/* ─── Helpers ─────────────────────────────────────────────────── */
function gerarDistribuicaoUF(municipios) {
  const mapa = {};
  municipios.forEach(m => {
    if (!m.uf) return;
    if (!mapa[m.uf]) mapa[m.uf] = { uf: m.uf, total: 0, aptos: 0 };
    mapa[m.uf].total++;
    if ((m.score_aptidao ?? 0) >= 70) mapa[m.uf].aptos++;
  });
  return Object.values(mapa)
    .filter(x => x.total >= 10)
    .sort((a, b) => b.aptos - a.aptos)
    .slice(0, 12);
}

function exportCSV(data, nome) {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r => Object.values(r).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${nome}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Tooltips ────────────────────────────────────────────────── */
function TooltipPreco({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 14px', fontSize:11 }}>
      <p style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:2 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight:700, color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TooltipSinistros({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 14px', fontSize:11 }}>
      <p style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>Safra {label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:2 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight:700, color: p.color }}>{p.value?.toFixed(1)} mil ha</span>
        </div>
      ))}
      <div style={{ borderTop:'1px solid #F3F4F6', marginTop:6, paddingTop:6, display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontWeight:600, color:'#374151' }}>Total</span>
        <span style={{ fontWeight:700, color:'#374151' }}>{total.toFixed(1)} mil ha</span>
      </div>
    </div>
  );
}

function TooltipScatter({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 14px', fontSize:11 }}>
      <p style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>Safra {d.safra}</p>
      {[['Produtividade', `${d.prod} t/ha`], ['Investimento', `R$ ${d.invest}/ha`], ['Municípios', `${d.n} amostras`]].map(([k, v]) => (
        <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:2 }}>
          <span style={{ color:'#6B7280' }}>{k}</span>
          <span style={{ fontWeight:600, color:'#374151' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Layout helpers ──────────────────────────────────────────── */
const TICK = { fontSize:10, fill:'#9CA3AF' };

function Card({ title, subtitle, action, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 22px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:2 }}>{title}</p>
          {subtitle && <p style={{ fontSize:10, color:'#9CA3AF' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CsvBtn({ data, nome }) {
  return (
    <button onClick={() => exportCSV(data, nome)} style={{
      display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
      background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:7,
      cursor:'pointer', fontSize:11, color:'#6B7280', flexShrink:0,
    }}>
      <Download size={11} /> CSV
    </button>
  );
}

/* ─── Dados históricos produção (área e volume) ──────────────── */
const PRODUCAO_HIST = [
  { ano:'2015', area:120, producao:360,  import:1050 },
  { ano:'2016', area:135, producao:418,  import:1020 },
  { ano:'2017', area:142, producao:390,  import:1100 },
  { ano:'2018', area:155, producao:490,  import:980  },
  { ano:'2019', area:168, producao:530,  import:970  },
  { ano:'2020', area:178, producao:510,  import:990  },
  { ano:'2021', area:185, producao:570,  import:920  },
  { ano:'2022', area:198, producao:610,  import:900  },
  { ano:'2023', area:210, producao:660,  import:870  },
  { ano:'2024', area:225, producao:720,  import:840  },
];

/* ══ COMPONENTE PRINCIPAL ══════════════════════════════════════ */
export default function HistoricosPage({ municipios = [] }) {
  const [abaForecast, setAbaForecast] = useState(0); // 0=preço, 1=produção

  const distribUF = useMemo(() => {
    if (municipios.length > 0) return gerarDistribuicaoUF(municipios);
    return [
      { uf:'PR', total:399, aptos:120 }, { uf:'SC', total:295, aptos:85 },
      { uf:'RS', total:496, aptos:95  }, { uf:'GO', total:246, aptos:40 },
      { uf:'MG', total:853, aptos:30  }, { uf:'SP', total:645, aptos:25 },
      { uf:'MS', total:79,  aptos:18  }, { uf:'MT', total:141, aptos:10 },
    ];
  }, [municipios]);

  /* Forecast de preço — regressão linear nos últimos 8 trimestres */
  const forecastPreco = useMemo(() => {
    const base = PRECO_HISTORICO.slice(-12);
    const { predict, slope } = regressaoLinear(base, 'cevada');
    const tendencia = slope > 0.8 ? 'alta' : slope < -0.5 ? 'queda' : 'estável';
    const ultimos4 = base.slice(-4);
    const precoAtual = ultimos4[ultimos4.length - 1].cevada;
    const projecoes = [
      { p:'Q1/25', cevada: Math.round(predict(12) * 10) / 10, proj: true },
      { p:'Q2/25', cevada: Math.round(predict(13) * 10) / 10, proj: true },
      { p:'Q3/25', cevada: Math.round(predict(14) * 10) / 10, proj: true },
      { p:'Q4/25', cevada: Math.round(predict(15) * 10) / 10, proj: true },
    ];
    const dadosMisto = [...base, ...projecoes];
    return { dadosMisto, tendencia, precoAtual, projetado2025: projecoes[3].cevada, slope };
  }, []);

  /* Forecast de produção */
  const forecastProd = useMemo(() => {
    const { predict, slope } = regressaoLinear(PRODUCAO_HIST, 'area');
    const { predict: predictProd } = regressaoLinear(PRODUCAO_HIST, 'producao');
    const projecoes = [
      { ano:'2025', area: Math.round(predict(10)), producao: Math.round(predictProd(10)), proj: true },
      { ano:'2026', area: Math.round(predict(11)), producao: Math.round(predictProd(11)), proj: true },
    ];
    return { dados: [...PRODUCAO_HIST, ...projecoes], slope };
  }, []);

  const dadosScore = useMemo(() => {
    const faixas = [
      { faixa:'83–100', count:0, cor:'#16a34a' },
      { faixa:'70–82',  count:0, cor:'#65a30d' },
      { faixa:'50–69',  count:0, cor:'#ca8a04' },
      { faixa:'33–49',  count:0, cor:'#ea6c0a' },
      { faixa:'0–32',   count:0, cor:'#94a3b8' },
    ];
    if (municipios.length > 0) {
      municipios.forEach(m => {
        const s = m.score_aptidao ?? 0;
        if      (s >= 83) faixas[0].count++;
        else if (s >= 70) faixas[1].count++;
        else if (s >= 50) faixas[2].count++;
        else if (s >= 33) faixas[3].count++;
        else              faixas[4].count++;
      });
    } else {
      [115, 280, 520, 890, 1430].forEach((v, i) => { faixas[i].count = v; });
    }
    return faixas;
  }, [municipios]);

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:6, height:26, borderRadius:4, background:'linear-gradient(180deg,#16a34a,#0284c7)' }} />
            <h1 style={{ fontSize:20, fontWeight:800, color:'#111827' }}>Históricos de Mercado</h1>
          </div>
          <p style={{ fontSize:11, color:'#9CA3AF', marginLeft:16 }}>
            Base CEPEA/MAPA/BACEN · 2015–2024 · Série trimestral
          </p>
        </div>
      </div>

      {/* ── CHART 1: Preço × Câmbio com Brush ── */}
      <div style={{ marginBottom:16 }}>
        <Card
          title="Evolução do Preço da Cevada × Taxa de Câmbio (USD/BRL)"
          subtitle="R$/saca 60 kg (eixo esq.) · USD/BRL (eixo dir.) · trimestral 2015–2024 — use o Brush para zoom"
          action={<CsvBtn data={PRECO_HISTORICO} nome="preco-cevada-dolar" />}
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={PRECO_HISTORICO} margin={{ top:4, right:52, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gradCevada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="p" tick={TICK} axisLine={false} tickLine={false} interval={7} />
              <YAxis
                yAxisId="esq" orientation="left"
                tick={TICK} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${v}`}
                domain={[25, 105]}
              />
              <YAxis
                yAxisId="dir" orientation="right"
                tick={TICK} axisLine={false} tickLine={false}
                domain={[2.5, 6.5]}
                label={{ value:'USD/BRL', angle:90, position:'insideRight', dx:16, fontSize:9, fill:'#9CA3AF' }}
              />
              <Tooltip content={<TooltipPreco />} />
              <Legend wrapperStyle={{ fontSize:11, paddingTop:8, color:'#6B7280' }} />
              <Area
                yAxisId="esq" type="monotone" dataKey="cevada"
                stroke="#16a34a" strokeWidth={2.5} fill="url(#gradCevada)"
                name="Cevada (R$/sc)" dot={false}
              />
              <Line
                yAxisId="dir" type="monotone" dataKey="dolar"
                stroke="#0284c7" strokeWidth={2} dot={false} strokeDasharray="5 3"
                name="USD/BRL"
              />
              <ReferenceLine
                yAxisId="esq" x="Q2/22" stroke="#dc2626"
                strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value:'Guerra Ucrânia', position:'top', fontSize:8, fill:'#dc2626' }}
              />
              <ReferenceLine
                yAxisId="esq" x="Q2/20" stroke="#6b7280"
                strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value:'COVID-19', position:'top', fontSize:8, fill:'#6b7280' }}
              />
              <Brush
                dataKey="p" height={22} travellerWidth={8}
                stroke="#E5E7EB" fill="#F9FAFB"
                startIndex={0} endIndex={39}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── CHARTS 2+3 lado a lado ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.05fr 1fr', gap:16, marginBottom:16 }}>

        {/* CHART 2: Sinistros stacked area */}
        <Card
          title="Sinistros por Tipo de Risco Climático"
          subtitle="Área sinistrada estimada (mil ha) · PR/SC/RS · 2015–2024"
          action={<CsvBtn data={SINISTROS} nome="sinistros-cevada" />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={SINISTROS} margin={{ top:4, right:10, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gSeca"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="gGeada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="gChuva" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="ano" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
              <Tooltip content={<TooltipSinistros />} />
              <Legend wrapperStyle={{ fontSize:10, paddingTop:8, color:'#6B7280' }} />
              <Area type="monotone" stackId="1" dataKey="seca"  stroke="#f59e0b" fill="url(#gSeca)"  name="Seca/Estiagem" strokeWidth={2} />
              <Area type="monotone" stackId="1" dataKey="geada" stroke="#0284c7" fill="url(#gGeada)" name="Geada" strokeWidth={2} />
              <Area type="monotone" stackId="1" dataKey="chuva" stroke="#7c3aed" fill="url(#gChuva)" name="Chuva na Colheita" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize:9, color:'#c7d2dc', marginTop:4 }}>
            Geada (2016/2021) e seca (2019/2020) dominaram os sinistros no sul
          </p>
        </Card>

        {/* CHART 3: Scatter produtividade × investimento */}
        <Card
          title="Produtividade × Nível de Investimento"
          subtitle="t/ha vs R$/ha por safra · tamanho = nº municípios amostrados"
          action={<CsvBtn data={SCATTER_DATA} nome="produtividade-investimento" />}
        >
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top:4, right:24, left:0, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="invest" type="number" name="Investimento"
                tick={TICK} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${v}`}
                domain={[1500, 3000]}
                label={{ value:'Investimento (R$/ha)', position:'insideBottom', offset:-10, fontSize:9, fill:'#9CA3AF' }}
              />
              <YAxis
                dataKey="prod" type="number" name="Produtividade"
                tick={TICK} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}t`}
                domain={[2.4, 5.0]}
                label={{ value:'Produt. (t/ha)', angle:-90, position:'insideLeft', dx:14, fontSize:9, fill:'#9CA3AF' }}
              />
              <ZAxis dataKey="n" range={[40, 260]} name="Municípios" />
              <Tooltip content={<TooltipScatter />} />
              <Scatter data={SCATTER_DATA} fill="#16a34a" fillOpacity={0.75}>
                <LabelList dataKey="safra" position="top" style={{ fontSize:8, fill:'#374151', fontWeight:600 }} />
              </Scatter>
              <ReferenceLine
                y={3.5} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
                label={{ value:'Meta ZARC 3,5 t/ha', position:'right', fontSize:8, fill:'#ca8a04' }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p style={{ fontSize:9, color:'#c7d2dc', marginTop:4 }}>
            Correlação clara: maior investimento → maior produtividade nas últimas safras
          </p>
        </Card>
      </div>

      {/* ── Perspectivas 2025/26 ── */}
      <div style={{ marginBottom:16 }}>
        <Card
          title="Perspectivas e Projeções 2025/26 (Modelo de Tendência Linear)"
          subtitle="Regressão linear sobre dados históricos — não é previsão oficial, apenas indicador de tendência"
        >
          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {['Preço da Cevada', 'Área e Produção'].map((t,i) => (
              <button key={t} onClick={() => setAbaForecast(i)} style={{
                padding:'5px 14px', borderRadius:7, fontSize:11, cursor:'pointer',
                background: abaForecast === i ? '#1B4332' : '#F3F4F6',
                color: abaForecast === i ? '#fff' : '#374151',
                border:'none', fontWeight: abaForecast === i ? 700 : 400,
              }}>{t}</button>
            ))}
          </div>

          {abaForecast === 0 && (
            <div>
              {/* KPIs forecast */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Preço atual (Q4/24)', val:`R$ ${forecastPreco.precoAtual}/sc`, cor:'#374151' },
                  { label:'Projeção Q4/25', val:`R$ ${forecastPreco.projetado2025}/sc`, cor:'#1B4332' },
                  { label:'Variação estimada', val:`${forecastPreco.slope > 0 ? '+' : ''}${(forecastPreco.slope * 4).toFixed(1)}/sc·trim.`, cor: forecastPreco.slope > 0 ? '#1A7A3C' : '#DC2626' },
                  { label:'Tendência', val: forecastPreco.tendencia === 'alta' ? '↗ Alta' : forecastPreco.tendencia === 'queda' ? '↘ Queda' : '→ Estável', cor: forecastPreco.tendencia === 'alta' ? '#1A7A3C' : forecastPreco.tendencia === 'queda' ? '#DC2626' : '#D4A017' },
                ].map(d => (
                  <div key={d.label} style={{ background:'#F9FAFB', borderRadius:9, padding:'12px 14px' }}>
                    <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, marginBottom:4 }}>{d.label}</p>
                    <p style={{ fontSize:15, fontWeight:800, color:d.cor }}>{d.val}</p>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={forecastPreco.dadosMisto} margin={{ top:4, right:20, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="p" tick={TICK} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`R$${v}`} domain={[20,130]} />
                  <Tooltip
                    contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }}
                    formatter={(v, n, { payload }) => [`R$ ${v}/sc${payload?.proj ? ' (projeção)' : ''}`, 'Preço']}
                    labelFormatter={v => v}
                  />
                  <Area type="monotone" dataKey="cevada" stroke="#16a34a" fill="url(#gradForecast)" strokeWidth={2.5} dot={false} name="Cevada" />
                  <ReferenceLine x="Q1/25" stroke="#7c3aed" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value:'Início projeção', position:'top', fontSize:9, fill:'#7c3aed' }} />
                </ComposedChart>
              </ResponsiveContainer>

              <div style={{ marginTop:10, padding:'10px 12px', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:8, display:'flex', gap:7, alignItems:'flex-start' }}>
                <Info size={12} color="#7c3aed" style={{ flexShrink:0, marginTop:1 }} />
                <p style={{ fontSize:10, color:'#4c1d95', lineHeight:1.6 }}>
                  <strong>Metodologia:</strong> Regressão linear sobre os últimos 12 trimestres (Q1/22–Q4/24).
                  O modelo captura tendência de médio prazo. Fatores externos como guerra, câmbio e clima não estão incorporados.
                  Use como referência apenas — sempre consulte CEPEA/MAPA para decisões de contrato.
                </p>
              </div>
            </div>
          )}

          {abaForecast === 1 && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Área 2024 (mil ha)', val:'225 mil ha', cor:'#374151' },
                  { label:'Área projetada 2025', val:`${forecastProd.dados[10]?.area ?? '—'} mil ha`, cor:'#1B4332' },
                  { label:'Produção projetada 2025', val:`${forecastProd.dados[10]?.producao ?? '—'} mil t`, cor:'#0284c7' },
                  { label:'Redução importação', val:'~820 mil t', cor:'#1A7A3C' },
                ].map(d => (
                  <div key={d.label} style={{ background:'#F9FAFB', borderRadius:9, padding:'12px 14px' }}>
                    <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, marginBottom:4 }}>{d.label}</p>
                    <p style={{ fontSize:15, fontWeight:800, color:d.cor }}>{d.val}</p>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={forecastProd.dados} margin={{ top:4, right:20, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="ano" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`${v}k ha`} />
                  <YAxis yAxisId="r" orientation="right" tick={TICK} axisLine={false} tickLine={false} tickFormatter={v=>`${v}k t`} />
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }}
                    formatter={(v, n, { payload }) => [`${v} mil${payload?.proj ? ' (projeção)' : ''}`, n]} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                  <Bar yAxisId="l" dataKey="area" name="Área (mil ha)" radius={[3,3,0,0]}>
                    {forecastProd.dados.map((d, i) => <Cell key={i} fill={d.proj ? '#86efac' : '#40916C'} />)}
                  </Bar>
                  <Line yAxisId="r" type="monotone" dataKey="producao" stroke="#0284c7" strokeWidth={2.5} dot={false} name="Produção (mil t)" />
                  <ReferenceLine yAxisId="l" x="2025" stroke="#7c3aed" strokeDasharray="5 3" strokeWidth={1.5} label={{ value:'Projeção', position:'top', fontSize:9, fill:'#7c3aed' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── CHARTS 4+5: Distribuição UF + Score ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>
        <Card
          title="Municípios Aptos por Estado (score ≥ 70)"
          subtitle="Distribuição atual na base SOUFII"
          action={<CsvBtn data={distribUF} nome="aptos-por-uf" />}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribUF} margin={{ top:4, right:10, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="uf" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v, n) => [v, n === 'total' ? 'Total' : 'Aptos ≥70']} />
              <Legend wrapperStyle={{ fontSize:10, paddingTop:8, color:'#6B7280' }} />
              <Bar dataKey="total" name="Total"     fill="rgba(2,132,199,0.18)" radius={[3,3,0,0]} />
              <Bar dataKey="aptos" name="Aptos ≥70" fill="#16a34a"              radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Distribuição de Score de Aptidão" subtitle="Todos os municípios processados">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosScore} margin={{ top:4, right:10, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="faixa" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v => [v, 'Municípios']} />
              <Bar dataKey="count" name="Municípios" radius={[3,3,0,0]}>
                {dadosScore.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

    </div>
  );
}
