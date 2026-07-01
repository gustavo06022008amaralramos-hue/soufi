import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Package, Truck, Sprout, Droplets,
  BarChart2, Calculator, Download, Info,
  Building2, CreditCard, PiggyBank, Percent,
} from 'lucide-react';

/* ── Dados regionais de custo ───────────────────────────── */
const CUSTOS_UF = {
  PR: { semente:180, fertilizante:950,  defensivos:450, mecanizacao:420, secagem:195, admin:120, prod_tha:3.5, label:'Paraná' },
  SC: { semente:180, fertilizante:980,  defensivos:470, mecanizacao:440, secagem:192, admin:120, prod_tha:3.2, label:'Santa Catarina' },
  RS: { semente:175, fertilizante:920,  defensivos:430, mecanizacao:400, secagem:180, admin:115, prod_tha:3.0, label:'Rio Grande do Sul' },
  GO: { semente:190, fertilizante:1050, defensivos:520, mecanizacao:460, secagem:210, admin:130, prod_tha:2.8, label:'Goiás' },
  MG: { semente:185, fertilizante:1020, defensivos:500, mecanizacao:450, secagem:204, admin:125, prod_tha:2.6, label:'Minas Gerais' },
  SP: { semente:190, fertilizante:1030, defensivos:510, mecanizacao:460, secagem:210, admin:130, prod_tha:2.5, label:'São Paulo' },
  MS: { semente:185, fertilizante:1000, defensivos:490, mecanizacao:440, secagem:198, admin:125, prod_tha:2.7, label:'Mato Grosso do Sul' },
  MT: { semente:190, fertilizante:1060, defensivos:530, mecanizacao:470, secagem:216, admin:130, prod_tha:2.6, label:'Mato Grosso' },
  BA: { semente:195, fertilizante:1080, defensivos:540, mecanizacao:480, secagem:222, admin:135, prod_tha:2.4, label:'Bahia' },
};

const UFS = Object.entries(CUSTOS_UF).map(([k, v]) => ({ value: k, label: `${v.label} (${k})` }));

const CENARIOS = [
  { id:'pessimista', label:'Pessimista', cor:'#DC2626', fatorProd:0.80, fatorPreco:0.85, icon:TrendingDown },
  { id:'esperado',   label:'Esperado',  cor:'#2D6A4F', fatorProd:1.00, fatorPreco:1.00, icon:BarChart2   },
  { id:'otimista',   label:'Otimista',  cor:'#1A7A3C', fatorProd:1.15, fatorPreco:1.10, icon:TrendingUp  },
];

const ITENS_CUSTO = [
  { key:'semente',      label:'Sementes',           cor:'#16a34a', icon:Sprout  },
  { key:'fertilizante', label:'Fertilizantes',      cor:'#0284c7', icon:Droplets },
  { key:'defensivos',   label:'Defensivos',         cor:'#d97706', icon:Package  },
  { key:'mecanizacao',  label:'Mecanização',        cor:'#7c3aed', icon:Package  },
  { key:'secagem',      label:'Secagem/Armazenagem',cor:'#0891b2', icon:Package  },
  { key:'admin',        label:'Administração/Outros',cor:'#6b7280', icon:Package  },
];

const FRETE_KM = 0.32; // R$/ton/km padrão

/* ── Helpers ─────────────────────────────────────────── */
function fmt(v, dec=0) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits:dec, maximumFractionDigits:dec });
}
function fmtR(v) {
  return `R$ ${fmt(v, 0)}`;
}

function calcular(uf, area, precoSaca, distKm, prodTha) {
  const c = CUSTOS_UF[uf];
  const custo_ha = c.semente + c.fertilizante + c.defensivos + c.mecanizacao + c.secagem + c.admin;
  const frete_ha = (distKm * FRETE_KM * prodTha * 1000) / 1000; // R$/ha
  const custo_total_ha = custo_ha + frete_ha;
  const custo_total = custo_total_ha * area;

  const receita_ha = (prodTha * 1000 / 60) * precoSaca; // t -> kg -> sacas * preço
  const receita = receita_ha * area;

  const lucro = receita - custo_total;
  const roi   = custo_total > 0 ? (lucro / custo_total) * 100 : 0;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  // Break-even price
  const sacas_ha = (prodTha * 1000) / 60;
  const preco_be = custo_total_ha / sacas_ha;

  // Break-even yield (t/ha)
  const prod_be = (custo_total_ha * 60) / (precoSaca * 1000);

  const breakdown = ITENS_CUSTO.map(it => ({
    ...it,
    valor_ha: it.key === 'frete' ? frete_ha : c[it.key],
    valor_total: (it.key === 'frete' ? frete_ha : c[it.key]) * area,
    pct: ((it.key === 'frete' ? frete_ha : c[it.key]) / custo_total_ha * 100),
  }));

  return { custo_ha, frete_ha, custo_total_ha, custo_total, receita_ha, receita, lucro, roi, margem, preco_be, prod_be, breakdown };
}

/* ── Linhas de crédito rural disponíveis ────────────── */
const LINHAS_CREDITO = [
  { nome:'Pronaf Custeio',   taxa:3.0,  prazo:12, publico:'Agricultor familiar',   limite:'R$ 250 mil', fonte:'BNDES/Tesouro' },
  { nome:'Pronamp',          taxa:6.0,  prazo:12, publico:'Médio produtor',         limite:'R$ 1,5 mi',  fonte:'BNDES' },
  { nome:'BCB Rural Custeio',taxa:7.0,  prazo:12, publico:'Produtor rural (geral)', limite:'R$ 2 mi',    fonte:'Banco do Brasil' },
  { nome:'Programa ABC+',    taxa:8.5,  prazo:60, publico:'Sustentabilidade',       limite:'R$ 5 mi',    fonte:'BNDES' },
  { nome:'FNO/FNE/FCO',     taxa:6.5,  prazo:36, publico:'Regiões específicas',    limite:'R$ 3 mi',    fonte:'BNB/BB/BCB' },
];

/* ── Helpers financeiros ─────────────────────────── */
function calcPricePMT(pv, taxaAnual, meses) {
  if (pv <= 0 || meses <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return pv / meses;
  return pv * (i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1);
}

function gerarAmortizacao(pv, taxaAnual, meses, nRows = 8) {
  const i = taxaAnual / 100 / 12;
  const pmt = calcPricePMT(pv, taxaAnual, meses);
  const rows = [];
  let saldo = pv;
  for (let m = 1; m <= Math.min(meses, nRows); m++) {
    const juros = saldo * i;
    const amort = pmt - juros;
    saldo -= amort;
    rows.push({ mes: m, pmt, juros, amort, saldo: Math.max(saldo, 0) });
  }
  return { pmt, rows };
}

/* ── Componentes UI ──────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, cor='#1B4332', bg='#F0F7F2', border='rgba(45,106,79,0.18)' }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:9, background:`${cor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={16} color={cor} />
      </div>
      <div>
        <p style={{ fontSize:10, color:'#6B7280', textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>{label}</p>
        <p style={{ fontSize:22, fontWeight:800, color:cor, lineHeight:1 }}>{value}</p>
        {sub && <p style={{ fontSize:10, color:'#9CA3AF', marginTop:3 }}>{sub}</p>}
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, step, fmt: fmtFn, cor='#2D6A4F' }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:12, color:'#374151', fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:cor }}>{fmtFn(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ accentColor: cor }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
        <span style={{ fontSize:9, color:'#9CA3AF' }}>{fmtFn(min)}</span>
        <span style={{ fontSize:9, color:'#9CA3AF' }}>{fmtFn(max)}</span>
      </div>
    </div>
  );
}

function CustomTooltipPie({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <p style={{ fontWeight:700, color:d.payload.cor, marginBottom:2 }}>{d.name}</p>
      <p style={{ color:'#374151' }}>R$ {fmt(d.value, 0)}/ha · {fmt(d.payload.pct, 1)}%</p>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 22px' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'#1B4332', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ width:3, height:16, background:'linear-gradient(180deg,#2D6A4F,#1B4332)', borderRadius:2, display:'inline-block' }} />
        {titulo}
      </p>
      {children}
    </div>
  );
}

/* ══ COMPONENTE PRINCIPAL ══════════════════════════════ */
export default function CustosPage() {
  const [uf,       setUf]       = useState('PR');
  const [area,     setArea]     = useState(50);
  const [preco,    setPreco]    = useState(90);
  const [distKm,   setDistKm]   = useState(150);
  const [prodTha,  setProdTha]  = useState(CUSTOS_UF['PR'].prod_tha);

  /* Financiamento */
  const [taxaAnual,    setTaxaAnual]    = useState(7.0);
  const [prazoMeses,   setPrazoMeses]   = useState(12);
  const [entradaPct,   setEntradaPct]   = useState(20);
  const [linhaCredito, setLinhaCredito] = useState(null);

  const r = useMemo(() => calcular(uf, area, preco, distKm, prodTha), [uf, area, preco, distKm, prodTha]);

  /* Cálculos de financiamento */
  const financ = useMemo(() => {
    const valorFinanciado = r.custo_total * (1 - entradaPct / 100);
    const entrada = r.custo_total * (entradaPct / 100);
    const { pmt, rows } = gerarAmortizacao(valorFinanciado, taxaAnual, prazoMeses);
    const totalPago = pmt * prazoMeses + entrada;
    const totalJuros = totalPago - r.custo_total;
    const custoEfetivo = r.custo_total > 0 ? ((totalJuros / r.custo_total) * 100) : 0;
    return { valorFinanciado, entrada, pmt, rows, totalPago, totalJuros, custoEfetivo };
  }, [r.custo_total, taxaAnual, prazoMeses, entradaPct]);
  const lucroPosi = r.lucro >= 0;

  const cenariosDados = useMemo(() => CENARIOS.map(c => {
    const rc = calcular(uf, area, preco * c.fatorPreco, distKm, prodTha * c.fatorProd);
    return { ...c, lucro: rc.lucro, roi: rc.roi, receita: rc.receita, custo: rc.custo_total };
  }), [uf, area, preco, distKm, prodTha]);

  const comparativo = useMemo(() => Object.entries(CUSTOS_UF).map(([k, v]) => {
    const rc = calcular(k, area, preco, distKm, v.prod_tha);
    return { uf: k, label: v.label, lucro: rc.lucro, roi: rc.roi, prod: v.prod_tha };
  }).sort((a, b) => b.lucro - a.lucro), [area, preco, distKm]);

  // Sensibilidade de preço
  const curvaPreco = useMemo(() => {
    const pts = [];
    for (let p = 50; p <= 150; p += 5) {
      const rc = calcular(uf, area, p, distKm, prodTha);
      pts.push({ preco: p, lucro: Math.round(rc.lucro), roi: Math.round(rc.roi) });
    }
    return pts;
  }, [uf, area, distKm, prodTha]);

  return (
    <div style={{ maxWidth:1120, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:6, height:26, borderRadius:4, background:'linear-gradient(180deg,#16a34a,#0284c7)' }} />
            <h1 style={{ fontSize:20, fontWeight:800, color:'#111827' }}>Análise de Custos & Viabilidade</h1>
          </div>
          <p style={{ fontSize:11, color:'#9CA3AF', marginLeft:16 }}>
            Simulação completa de custo/receita por estado · Baseado em dados CEPEA/EMBRAPA/CONAB 2024
          </p>
        </div>
        <select value={uf} onChange={e => { setUf(e.target.value); setProdTha(CUSTOS_UF[e.target.value].prod_tha); }}
          style={{ border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#374151', background:'#fff', cursor:'pointer', fontWeight:600 }}>
          {UFS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </div>

      {/* ── Sliders ── */}
      <div style={{ background:'#F0F7F2', border:'1px solid rgba(45,106,79,0.18)', borderRadius:14, padding:'20px 24px', marginBottom:20 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#1B4332', marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
          <Calculator size={14} color="#2D6A4F" /> Parâmetros da Simulação
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          <SliderRow label="Área (ha)" value={area} onChange={setArea} min={10} max={500} step={10} fmt={v=>`${v} ha`} />
          <SliderRow label="Preço da saca (R$/sc 60kg)" value={preco} onChange={setPreco} min={50} max={150} step={2} fmt={v=>`R$ ${v}`} />
          <SliderRow label="Produtividade (t/ha)" value={prodTha} onChange={setProdTha} min={1.0} max={6.0} step={0.1} fmt={v=>`${v.toFixed(1)} t/ha`} cor="#0284c7" />
          <SliderRow label="Distância à Agrária (km)" value={distKm} onChange={setDistKm} min={50} max={1200} step={25} fmt={v=>`${v} km`} cor="#d97706" />
        </div>
      </div>

      {/* ── KPIs principais ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard icon={DollarSign} label="Receita Bruta Total" value={fmtR(r.receita)} sub={`${fmtR(r.receita_ha)}/ha`} cor="#1A7A3C" bg="#F0FDF4" border="rgba(26,122,60,0.2)" />
        <KpiCard icon={Package} label="Custo de Produção" value={fmtR(r.custo_total)} sub={`${fmtR(r.custo_total_ha)}/ha`} cor="#0284c7" bg="#EFF6FF" border="rgba(2,132,199,0.2)" />
        <KpiCard
          icon={lucroPosi ? TrendingUp : TrendingDown}
          label="Lucro Líquido"
          value={fmtR(r.lucro)}
          sub={`Margem: ${fmt(r.margem, 1)}%`}
          cor={lucroPosi ? '#1A7A3C' : '#DC2626'}
          bg={lucroPosi ? '#F0FDF4' : '#FEF2F2'}
          border={lucroPosi ? 'rgba(26,122,60,0.2)' : 'rgba(220,38,38,0.2)'}
        />
        <KpiCard
          icon={BarChart2}
          label="Retorno sobre Investimento"
          value={`${fmt(r.roi, 1)}%`}
          sub={r.roi >= 0 ? 'Investimento viável' : 'Investimento inviável'}
          cor={r.roi >= 20 ? '#1A7A3C' : r.roi >= 0 ? '#D4A017' : '#DC2626'}
          bg={r.roi >= 20 ? '#F0FDF4' : r.roi >= 0 ? '#FFFBEB' : '#FEF2F2'}
          border={r.roi >= 20 ? 'rgba(26,122,60,0.2)' : r.roi >= 0 ? 'rgba(212,160,23,0.2)' : 'rgba(220,38,38,0.2)'}
        />
      </div>

      {/* ── Linha 1: Pizza + Breakdown ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16, marginBottom:16 }}>

        {/* Pizza */}
        <Secao titulo="Composição do Custo (R$/ha)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={r.breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="valor_ha" nameKey="label" paddingAngle={2}>
                {r.breakdown.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Pie>
              <Tooltip content={<CustomTooltipPie />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:4 }}>
            {r.breakdown.map(d => (
              <div key={d.key} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:d.cor, flexShrink:0 }} />
                <span style={{ fontSize:11, color:'#374151', flex:1 }}>{d.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{fmtR(d.valor_ha)}/ha</span>
                <span style={{ fontSize:10, color:'#9CA3AF', width:34, textAlign:'right' }}>{fmt(d.pct, 0)}%</span>
              </div>
            ))}
          </div>
        </Secao>

        {/* Break-even */}
        <Secao titulo="Pontos de Equilíbrio (Break-even)">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div style={{ background:'#FFFBEB', border:'1px solid rgba(212,160,23,0.25)', borderRadius:10, padding:'14px 16px' }}>
              <p style={{ fontSize:10, color:'#92400E', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>Preço mínimo (break-even)</p>
              <p style={{ fontSize:26, fontWeight:800, color:'#D4A017', lineHeight:1 }}>{fmtR(r.preco_be)}</p>
              <p style={{ fontSize:10, color:'#92400E', marginTop:4 }}>por saca de 60 kg</p>
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:5 }}>
                {preco >= r.preco_be
                  ? <><CheckCircle size={11} color="#16a34a" /><span style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>Preço atual {fmtR(preco)} cobre custos</span></>
                  : <><AlertTriangle size={11} color="#DC2626" /><span style={{ fontSize:10, color:'#DC2626', fontWeight:600 }}>Preço abaixo do break-even</span></>
                }
              </div>
            </div>
            <div style={{ background:'#EFF6FF', border:'1px solid rgba(2,132,199,0.25)', borderRadius:10, padding:'14px 16px' }}>
              <p style={{ fontSize:10, color:'#1e40af', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>Produtividade mínima</p>
              <p style={{ fontSize:26, fontWeight:800, color:'#0284c7', lineHeight:1 }}>{fmt(r.prod_be, 2)} t/ha</p>
              <p style={{ fontSize:10, color:'#1e40af', marginTop:4 }}>para cobrir todos os custos</p>
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:5 }}>
                {prodTha >= r.prod_be
                  ? <><CheckCircle size={11} color="#16a34a" /><span style={{ fontSize:10, color:'#16a34a', fontWeight:600 }}>Produtiv. {fmt(prodTha,1)} t/ha acima do limite</span></>
                  : <><AlertTriangle size={11} color="#DC2626" /><span style={{ fontSize:10, color:'#DC2626', fontWeight:600 }}>Produtividade abaixo do necessário</span></>
                }
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { label:'Custo frete (R$/ha)', val: fmtR(r.frete_ha), cor:'#d97706' },
              { label:'Sacas produzidas/ha', val: `${fmt(prodTha * 1000 / 60, 0)} sc`, cor:'#1B4332' },
              { label:'Receita por ha', val: fmtR(r.receita_ha), cor:'#1A7A3C' },
              { label:'Custo total/ha', val: fmtR(r.custo_total_ha), cor:'#0284c7' },
              { label:'Lucro por ha', val: fmtR(r.lucro / area), cor: r.lucro >= 0 ? '#1A7A3C' : '#DC2626' },
              { label:'Margem de contribuição', val: `${fmt(r.margem, 1)}%`, cor: r.margem >= 15 ? '#1A7A3C' : '#D4A017' },
            ].map(d => (
              <div key={d.label} style={{ background:'#F9FAFB', borderRadius:8, padding:'10px 12px' }}>
                <p style={{ fontSize:9, color:'#9CA3AF', marginBottom:3, textTransform:'uppercase', letterSpacing:0.6 }}>{d.label}</p>
                <p style={{ fontSize:14, fontWeight:800, color:d.cor }}>{d.val}</p>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      {/* ── Linha 2: Cenários + Curva de Preço ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:16, marginBottom:16 }}>

        {/* Cenários */}
        <Secao titulo="Análise de Cenários">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {cenariosDados.map(c => {
              const Icon = c.icon;
              const pos = c.lucro >= 0;
              return (
                <div key={c.id} style={{
                  border:`1.5px solid ${c.cor}30`, borderRadius:10, padding:'14px 16px',
                  background:`${c.cor}06`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <Icon size={14} color={c.cor} />
                      <span style={{ fontSize:12, fontWeight:700, color:c.cor }}>{c.label}</span>
                    </div>
                    <span style={{ fontSize:10, color:'#9CA3AF' }}>
                      Prod.: {fmt(prodTha * c.fatorProd, 1)} t/ha · Preço: {fmtR(preco * c.fatorPreco)}/sc
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      { label:'Receita', val: fmtR(c.receita) },
                      { label:'Lucro', val: fmtR(c.lucro), destaque: true },
                      { label:'ROI', val: `${fmt(c.roi,1)}%`, destaque: true },
                    ].map(d => (
                      <div key={d.label} style={{ textAlign:'center' }}>
                        <p style={{ fontSize:9, color:'#9CA3AF', marginBottom:2 }}>{d.label}</p>
                        <p style={{ fontSize:13, fontWeight:800, color: d.destaque ? (c.lucro >= 0 ? c.cor : '#DC2626') : '#374151' }}>{d.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:12, padding:'10px 12px', background:'#F9FAFB', borderRadius:8, border:'1px solid #E5E7EB' }}>
            <p style={{ fontSize:10, color:'#6B7280', lineHeight:1.6 }}>
              <Info size={10} style={{ display:'inline', marginRight:4 }} />
              <strong>Pessimista:</strong> −20% produtividade, −15% preço ·
              <strong> Otimista:</strong> +15% produtividade, +10% preço
            </p>
          </div>
        </Secao>

        {/* Curva de Sensibilidade de Preço */}
        <Secao titulo="Sensibilidade de Preço — Lucro Total (R$)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={curvaPreco} margin={{ top:4, right:16, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="preco" tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false}
                tickFormatter={v=>`R$${v}`} />
              <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 0 ? `+${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }}
                formatter={(v,n) => [fmtR(v), n === 'lucro' ? 'Lucro' : 'ROI%']}
                labelFormatter={v=>`Preço: R$ ${v}/sc`} />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:'Break-even', position:'right', fontSize:9, fill:'#DC2626' }} />
              <ReferenceLine x={preco} stroke="#2D6A4F" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:'Atual', position:'top', fontSize:9, fill:'#2D6A4F' }} />
              <Line type="monotone" dataKey="lucro" stroke="#1A7A3C" strokeWidth={2.5} dot={false} name="lucro" />
            </LineChart>
          </ResponsiveContainer>
        </Secao>
      </div>

      {/* ── Linhas de Crédito Rural ── */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#1B4332', marginBottom:4, display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:3, height:16, background:'linear-gradient(180deg,#7c3aed,#1B4332)', borderRadius:2, display:'inline-block' }} />
          Linhas de Crédito Rural — Custeio Agrícola
        </p>
        <p style={{ fontSize:10, color:'#9CA3AF', marginBottom:16, marginLeft:10 }}>Taxas e condições vigentes para a safra 2025/26 · Fonte: BACEN/MAPA</p>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'#F9FAFB' }}>
                {['Linha de Crédito','Taxa a.a.','Prazo','Público-alvo','Limite','Fonte','Selecionar'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINHAS_CREDITO.map((l, i) => (
                <tr key={l.nome} style={{ background: linhaCredito === i ? 'rgba(124,58,237,0.05)' : i % 2 ? '#FAFAFA' : '#fff', borderBottom:'1px solid #F3F4F6' }}>
                  <td style={{ padding:'9px 12px', fontWeight:700, color:'#374151' }}>{l.nome}</td>
                  <td style={{ padding:'9px 12px', fontWeight:800, color:'#7c3aed' }}>{l.taxa.toFixed(1)}%</td>
                  <td style={{ padding:'9px 12px', color:'#374151' }}>{l.prazo} meses</td>
                  <td style={{ padding:'9px 12px', color:'#6B7280' }}>{l.publico}</td>
                  <td style={{ padding:'9px 12px', fontWeight:600, color:'#1B4332' }}>{l.limite}</td>
                  <td style={{ padding:'9px 12px', color:'#9CA3AF' }}>{l.fonte}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <button onClick={() => { setLinhaCredito(i); setTaxaAnual(l.taxa); setPrazoMeses(l.prazo); }} style={{
                      fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                      background: linhaCredito === i ? '#7c3aed' : '#F3F4F6',
                      color: linhaCredito === i ? '#fff' : '#374151',
                      border:`1px solid ${linhaCredito === i ? '#7c3aed' : '#E5E7EB'}`,
                    }}>
                      {linhaCredito === i ? '✓ Selecionada' : 'Usar esta'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Simulador de Financiamento Bancário ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16, marginBottom:16 }}>

        {/* Inputs de financiamento */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 22px' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#1B4332', marginBottom:4, display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:3, height:16, background:'linear-gradient(180deg,#7c3aed,#0284c7)', borderRadius:2, display:'inline-block' }} />
            Simulador de Financiamento
          </p>
          <p style={{ fontSize:10, color:'#9CA3AF', marginBottom:18, marginLeft:10 }}>Custo total da lavoura: {fmtR(r.custo_total)}</p>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <SliderRow label="Entrada (%)" value={entradaPct} onChange={setEntradaPct} min={0} max={60} step={5} fmt={v=>`${v}%`} cor="#7c3aed" />
            <SliderRow label="Taxa de juros (% a.a.)" value={taxaAnual} onChange={setTaxaAnual} min={3.0} max={18.0} step={0.5} fmt={v=>`${v.toFixed(1)}%`} cor="#0284c7" />
            <SliderRow label="Prazo (meses)" value={prazoMeses} onChange={setPrazoMeses} min={6} max={60} step={6} fmt={v=>`${v} meses`} cor="#1B4332" />
          </div>

          <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { icon:CreditCard,  label:'Entrada',         val:fmtR(financ.entrada),         cor:'#7c3aed', bg:'rgba(124,58,237,0.06)'  },
              { icon:Building2,   label:'Valor financiado', val:fmtR(financ.valorFinanciado),  cor:'#0284c7', bg:'rgba(2,132,199,0.06)'   },
              { icon:PiggyBank,   label:'Parcela mensal',   val:fmtR(financ.pmt),             cor:'#1B4332', bg:'rgba(27,67,50,0.06)'    },
              { icon:Percent,     label:'Total de juros',   val:fmtR(financ.totalJuros),       cor:'#DC2626', bg:'rgba(220,38,38,0.06)'   },
            ].map(({ icon:Ic, label, val, cor, bg }) => (
              <div key={label} style={{ background:bg, borderRadius:10, padding:'12px 14px', display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${cor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic size={14} color={cor} />
                </div>
                <div>
                  <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, marginBottom:2 }}>{label}</p>
                  <p style={{ fontSize:14, fontWeight:800, color:cor }}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:14, padding:'10px 12px', background:'#F9FAFB', borderRadius:8, border:'1px solid #E5E7EB' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#6B7280' }}>Custo efetivo do financiamento</span>
              <span style={{ fontSize:14, fontWeight:800, color:'#DC2626' }}>{fmt(financ.custoEfetivo, 1)}%</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <span style={{ fontSize:11, color:'#6B7280' }}>Total pago ao banco</span>
              <span style={{ fontSize:14, fontWeight:800, color:'#374151' }}>{fmtR(financ.totalPago)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <span style={{ fontSize:11, color:'#6B7280' }}>Lucro líquido após quitação</span>
              <span style={{ fontSize:14, fontWeight:800, color: (r.lucro - financ.totalJuros) >= 0 ? '#1A7A3C' : '#DC2626' }}>
                {fmtR(r.lucro - financ.totalJuros)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de amortização */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'20px 22px' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#1B4332', marginBottom:4, display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:3, height:16, background:'linear-gradient(180deg,#0284c7,#7c3aed)', borderRadius:2, display:'inline-block' }} />
            Tabela Price — Primeiras Parcelas
          </p>
          <p style={{ fontSize:10, color:'#9CA3AF', marginBottom:16, marginLeft:10 }}>
            Taxa {taxaAnual.toFixed(1)}% a.a. · {prazoMeses} parcelas · Sistema de Amortização Constante (Price)
          </p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>
                  {['Mês','Parcela','Juros','Amortização','Saldo'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7, borderBottom:'1px solid #E5E7EB', textAlign:'right', background:'#F9FAFB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financ.rows.map((row, i) => (
                  <tr key={row.mes} style={{ background: i % 2 ? '#FAFAFA' : '#fff', borderBottom:'1px solid #F3F4F6' }}>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#6B7280' }}>{row.mes}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#1B4332' }}>{fmtR(row.pmt)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', color:'#DC2626' }}>{fmtR(row.juros)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', color:'#0284c7' }}>{fmtR(row.amort)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600, color:'#374151' }}>{fmtR(row.saldo)}</td>
                  </tr>
                ))}
                {prazoMeses > 8 && (
                  <tr>
                    <td colSpan={5} style={{ padding:'8px 10px', textAlign:'center', fontSize:10, color:'#9CA3AF', fontStyle:'italic' }}>
                      ... mais {prazoMeses - 8} parcelas restantes (total {fmtR(financ.totalPago)})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Gráfico barras: composição mensal (juros vs amort) */}
          <div style={{ marginTop:14 }}>
            <p style={{ fontSize:10, color:'#9CA3AF', marginBottom:8 }}>Composição das parcelas (juros × amortização)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={financ.rows} margin={{ top:0, right:0, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:9, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}°`} />
                <YAxis tick={{ fontSize:9, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={34} />
                <Tooltip contentStyle={{ fontSize:10, borderRadius:7, border:'1px solid #E5E7EB' }}
                  formatter={(v, n) => [fmtR(v), n === 'juros' ? 'Juros' : 'Amortização']} labelFormatter={v=>`Parcela ${v}`} />
                <Bar dataKey="juros" stackId="a" fill="#DC2626" radius={[0,0,0,0]} name="juros" />
                <Bar dataKey="amort" stackId="a" fill="#0284c7" radius={[3,3,0,0]} name="amort" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Comparativo por Estado ── */}
      <Secao titulo={`Comparativo Regional — Lucro Total com ${area} ha (R$)`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparativo} margin={{ top:4, right:16, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="uf" tick={{ fontSize:11, fill:'#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #E5E7EB' }}
              formatter={(v, n) => [fmtR(v), n === 'lucro' ? 'Lucro' : 'ROI%']}
              labelFormatter={v => CUSTOS_UF[v]?.label ?? v} />
            <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 3" strokeWidth={1} />
            <Bar dataKey="lucro" name="lucro" radius={[4,4,0,0]}>
              {comparativo.map((d, i) => (
                <Cell key={i} fill={d.lucro >= 0 ? (d.uf === uf ? '#1B4332' : '#40916C') : '#DC2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:6, marginTop:10 }}>
          {comparativo.map(d => (
            <div key={d.uf} style={{
              textAlign:'center', padding:'8px 4px', borderRadius:8,
              background: d.uf === uf ? '#F0F7F2' : '#F9FAFB',
              border: d.uf === uf ? '1px solid rgba(45,106,79,0.25)' : '1px solid transparent',
            }}>
              <p style={{ fontSize:12, fontWeight:800, color: d.uf === uf ? '#1B4332' : '#374151' }}>{d.uf}</p>
              <p style={{ fontSize:9, color: d.lucro >= 0 ? '#1A7A3C' : '#DC2626', fontWeight:600 }}>
                {d.lucro >= 0 ? '+' : ''}{fmt(d.roi, 0)}% ROI
              </p>
              <p style={{ fontSize:8, color:'#9CA3AF' }}>{fmt(d.prod, 1)} t/ha</p>
            </div>
          ))}
        </div>
      </Secao>

    </div>
  );
}
