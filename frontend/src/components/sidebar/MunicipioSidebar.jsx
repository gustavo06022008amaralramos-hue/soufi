import { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Mountain, Thermometer, CloudRain, Snowflake,
         CheckCircle, XCircle, Truck, Layers, AlertTriangle, FileText,
         Shield, ExternalLink, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import CalendarioPlantio from './CalendarioPlantio.jsx';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

/* ─── Paleta ─────────────────────────────────────────────── */
const COR = { apto:'#16a34a', parcial:'#d97706', inapto:'#2563eb', sem_dados:'#6b7280' };
const BG  = { apto:'#f0fdf4', parcial:'#fffbeb', inapto:'#eff6ff', sem_dados:'#f9fafb' };
const LABEL = { apto:'Apto', parcial:'Parc. Apto', inapto:'Inapto', sem_dados:'Sem dados' };
function classe(m) {
  if (!m || m.score_aptidao == null) return 'sem_dados';
  if (m.score_aptidao >= 70) return 'apto';
  if (m.score_aptidao >= 40) return 'parcial';
  return 'inapto';
}

/* ─── Logística ──────────────────────────────────────────── */
// Sede real: Rua 5 de Maio, 745, Colônia Vitória — Entre Rios, Guarapuava/PR
const AGRARIA = { lat:-25.5630, lon:-51.4898 };
function haversine(la1,lo1,la2,lo2) {
  const R=6371, r=Math.PI/180;
  const a = Math.sin((la2-la1)*r/2)**2 + Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}
function viabLabel(d) {
  if (d<=300) return { label:'Muito viável', cor:'#16a34a' };
  if (d<=600) return { label:'Viável',        cor:'#65a30d' };
  if (d<=900) return { label:'Considerar',    cor:'#d97706' };
  return              { label:'Distante',      cor:'#dc2626' };
}

/* ─── Notas graduadas ────────────────────────────────────────
   Mesma lógica de calcular_score_ponderado.py (Bloco 1.5): cada critério
   vira uma nota 0.0–1.0 por proximidade do ideal, não só passou/não passou.
   Isso alimenta o indicador de 3 níveis (ideal / parcial / fora) nas linhas
   abaixo — sem essa gradação, um valor a 0,5°C do limite aparecia com o
   mesmo "X vermelho" de um valor 10°C fora da faixa. */
function plato(v, idealMin, idealMax, tolerancia) {
  if (v == null) return 0;
  if (v >= idealMin && v <= idealMax) return 1;
  if (v < idealMin) {
    const limite = idealMin - tolerancia;
    return v <= limite ? 0 : (v - limite) / tolerancia;
  }
  const limite = idealMax + tolerancia;
  return v >= limite ? 0 : (limite - v) / tolerancia;
}
function rampaAlta(v, minimo, tolerancia) {
  if (v == null) return 0;
  if (v >= minimo) return 1;
  const limite = minimo - tolerancia;
  return v <= limite ? 0 : (v - limite) / tolerancia;
}
function rampaBaixa(v, maximo, tolerancia) {
  if (v == null) return 0;
  if (v <= maximo) return 1;
  const limite = maximo + tolerancia;
  return v >= limite ? 0 : (limite - v) / tolerancia;
}

/* ─── Critérios ZARC ─────────────────────────────────────── */
const CRITERIOS = [
  {
    label: 'Temperatura', icon: Thermometer, cor:'#d97706',
    faixa: '10–22°C',
    valor: m => m.temp_media_anual != null ? `${m.temp_media_anual.toFixed(1)}°C` : '—',
    ok:    m => m.temp_media_anual >= 10 && m.temp_media_anual <= 22,
    nota:  m => plato(m.temp_media_anual, 10, 22, 3),
  },
  {
    label: 'Precipitação', icon: CloudRain, cor:'#2563eb',
    faixa: '400–2000mm',
    valor: m => m.precipitacao_acumulada_anual != null ? `${Math.round(m.precipitacao_acumulada_anual)}mm` : '—',
    ok:    m => m.precipitacao_acumulada_anual >= 400 && m.precipitacao_acumulada_anual <= 2000,
    nota:  m => plato(m.precipitacao_acumulada_anual, 700, 1400, 300),
  },
  {
    label: 'Altitude', icon: Mountain, cor:'#374151',
    faixa: '≥ 800m',
    valor: m => m.altitude != null ? `${Math.round(m.altitude)}m` : '—',
    ok:    m => m.altitude >= 800,
    nota:  m => rampaAlta(m.altitude, 800, 50),
  },
  {
    label: 'Risco de Geada', icon: Snowflake, cor:'#7c3aed',
    faixa: '< 30%',
    valor: m => m.risco_geada_pct != null ? `${m.risco_geada_pct.toFixed(0)}%` : '—',
    ok:    m => m.risco_geada_pct != null && m.risco_geada_pct < 30,
    nota:  m => rampaBaixa(m.risco_geada_pct, 0, 30),
  },
  {
    label: 'Solo (ZARC)', icon: Layers, cor:'#92400e',
    faixa: 'Tipo 2 ou 3',
    valor: m => m.tipo_solo_zarc != null ? `Tipo ${m.tipo_solo_zarc}` : '—',
    ok:    m => m.tipo_solo_zarc != null && m.tipo_solo_zarc >= 2,
    nota:  m => m.tipo_solo_zarc == null ? 0 : (m.tipo_solo_zarc >= 2 ? 1 : 0),
  },
  {
    label: 'Chuva Colheita', icon: CloudRain, cor:'#0e7490',
    faixa: '120–400mm',
    valor: m => m.chuva_colheita_mm != null ? `${Math.round(m.chuva_colheita_mm)}mm` : '—',
    ok:    m => m.chuva_colheita_mm != null && m.chuva_colheita_mm >= 120 && m.chuva_colheita_mm <= 400,
    nota:  m => rampaBaixa(m.chuva_colheita_mm, 120, 280),
  },
];

/* ─── Seguro / ZARC oficial ──────────────────────────────── */
// Estados com Portaria ZARC cevada cervejeira publicada pelo MAPA (sequeiro e/ou
// irrigado), conforme "Indicações Técnicas para a Produção de Cevada Cervejeira
// — safras 2025 e 2026" (Embrapa Trigo, 2025) e Portaria SPA/MAPA nº 358/2024 (PR).
const ZARC_UFS = ['PR', 'SC', 'RS', 'SP', 'MG', 'GO', 'DF'];
const MAPA_ZARC_URL = 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico';
const MAPA_PAINEL_URL = 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/painel-de-indicacao-de-riscos-1';

const SOLO_INFO = {
  1: { label:'Tipo 1 — Arenoso',      cor:'#ef4444', recom:'Não recomendado pelo ZARC' },
  2: { label:'Tipo 2 — Textura Média', cor:'#f59e0b', recom:'Aceito com manejo adequado' },
  3: { label:'Tipo 3 — Argiloso',      cor:'#10b981', recom:'Plenamente apto pelo ZARC' },
};

/* ─── Ficha PDF ──────────────────────────────────────────── */
function printFicha(municipio, log, criterios, aprovados) {
  const cl   = classe(municipio);
  const cor  = COR[cl];
  const score = municipio.score_aptidao ?? 0;
  const now  = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const cRows = criterios.map(c => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;">
        <span style="color:${c.pass?'#16a34a':'#dc2626'};font-weight:700;margin-right:6px;">${c.pass?'✓':'✗'}</span>${c.label}
      </td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;font-weight:700;color:${c.pass?'#16a34a':'#dc2626'};">${c.val}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#9CA3AF;font-size:11px;">${c.faixa}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha — ${municipio.nome_municipio}/${municipio.uf}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a1a;background:#fff;padding:32px;max-width:800px;margin:0 auto;}
.hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;padding-bottom:14px;border-bottom:3px solid ${cor};}
.logo{font-size:10px;font-weight:700;color:#1B4332;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;}
h1{font-size:22px;font-weight:800;color:#1a1a1a;}
.sub{font-size:11px;color:#6B7280;margin-top:3px;}
.badge{font-size:12px;font-weight:800;color:${cor};background:${cor}18;border:1.5px solid ${cor}40;border-radius:8px;padding:5px 14px;}
.circle{width:58px;height:58px;border-radius:50%;border:3px solid ${cor};background:${cor}10;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;}
.snum{font-size:19px;font-weight:800;color:${cor};line-height:1;}
.ssub{font-size:9px;color:#9CA3AF;}
.sec{margin-bottom:18px;}
.stitle{font-size:10px;font-weight:800;color:#1B4332;text-transform:uppercase;letter-spacing:1.2px;padding-bottom:7px;border-bottom:1.5px solid #E5E7EB;margin-bottom:10px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:4px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:9px;padding:11px 12px;}
.ct{font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;}
.cv{font-size:18px;font-weight:800;color:#1a1a1a;line-height:1.1;}
.cu{font-size:10px;color:#9CA3AF;margin-top:2px;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.8px;padding:7px 10px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;}
.foot{margin-top:28px;padding-top:10px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;}
.foot p{font-size:9px;color:#9CA3AF;}
@media print{body{padding:16px;}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="logo">⬡ SOUFII · Cooperativa Agrária</div>
    <h1>${municipio.nome_municipio}</h1>
    <div class="sub">${municipio.uf} &nbsp;·&nbsp; IBGE ${municipio.codigo_ibge} &nbsp;·&nbsp; Ficha Técnica de Aptidão Tritícola</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px;">
    <div class="badge">${LABEL[cl].toUpperCase()}</div>
    <div class="circle"><span class="snum">${score}</span><span class="ssub">/100</span></div>
  </div>
</div>

<div class="sec">
  <div class="stitle">Dados Climáticos</div>
  <div class="g3">
    <div class="card"><div class="ct">Temperatura Média</div><div class="cv">${municipio.temp_media_anual?.toFixed(1)??'—'}°C</div><div class="cu">ZARC: 10–22°C</div></div>
    <div class="card"><div class="ct">Precipitação Anual</div><div class="cv">${municipio.precipitacao_acumulada_anual?.toFixed(0)??'—'}mm</div><div class="cu">ZARC: 400–2.000mm</div></div>
    <div class="card"><div class="ct">Altitude</div><div class="cv">${municipio.altitude?.toFixed(0)??'—'}m</div><div class="cu">ZARC: ≥ 800m</div></div>
    <div class="card"><div class="ct">Risco de Geada</div><div class="cv">${municipio.risco_geada_pct?.toFixed(0)??'—'}%</div><div class="cu">ZARC: &lt; 30%</div></div>
    <div class="card"><div class="ct">Solo ZARC</div><div class="cv">${municipio.tipo_solo_zarc?`Tipo ${municipio.tipo_solo_zarc}`:'—'}</div><div class="cu">ZARC: Tipo 2 ou 3</div></div>
    <div class="card"><div class="ct">Chuva na Colheita</div><div class="cv">${municipio.chuva_colheita_mm?.toFixed(0)??'—'}mm</div><div class="cu">ZARC: 120–400mm</div></div>
  </div>
</div>

<div class="sec">
  <div class="stitle">Critérios de Aptidão ZARC / EMBRAPA &mdash; ${aprovados}/6 atendidos</div>
  <table><thead><tr><th>Critério</th><th>Valor medido</th><th>Faixa ideal</th></tr></thead><tbody>${cRows}</tbody></table>
</div>

${log ? `<div class="sec">
  <div class="stitle">Análise Logística</div>
  <div class="g2">
    <div class="card"><div class="ct">Distância até Cooperativa Agrária</div><div class="cv">${log.dist} km</div><div class="cu">Entre Rios, Guarapuava / PR</div></div>
    <div class="card" style="border-color:${log.viab.cor}50;"><div class="ct">Viabilidade</div><div class="cv" style="color:${log.viab.cor};">${log.viab.label}</div><div class="cu">Líquido/saca: R$ ${log.liqSaca.toFixed(2)}</div></div>
    <div class="card"><div class="ct">Preço bruto / ton</div><div class="cv">R$ ${Math.round(log.pTon)}</div><div class="cu">≈ R$ ${(log.pTon*60/1000).toFixed(0)}/saca</div></div>
    <div class="card"><div class="ct">Frete estimado</div><div class="cv">R$ ${Math.round(log.frete)}/ton</div><div class="cu">Líquido: R$ ${Math.round(log.liq)}/ton</div></div>
  </div>
</div>` : ''}

<div class="foot">
  <p>Gerado em ${now} · SOUFII — Sistema de Oportunidades Agrárias</p>
  <p>Fontes: WorldClim · SoilGrids ISRIC · IBGE · ZARC/EMBRAPA</p>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/* ─── Estado vazio ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ width:340, flexShrink:0, height:'100%', background:'#fff',
      borderLeft:'1px solid #E5E7EB', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'0 32px', gap:16 }}>
      <div style={{ width:64,height:64,borderRadius:18,background:'#F0F7F2',
        border:'1px solid #D1D5DB',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <MapPin size={26} color="#D1D5DB" strokeWidth={1.5} />
      </div>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:15,fontWeight:700,color:'#374151',marginBottom:6 }}>
          Selecione um município
        </p>
        <p style={{ fontSize:12,color:'#6B7280',lineHeight:1.6 }}>
          Clique em qualquer município no mapa para ver a análise completa
        </p>
      </div>
      <div style={{ background:'#F0F7F2',border:'1px solid rgba(45,106,79,0.2)',
        borderRadius:10,padding:'10px 14px',width:'100%' }}>
        <p style={{ fontSize:11,color:'#2D6A4F',fontWeight:500,lineHeight:1.5 }}>
          💡 Comece pelo Sul — maior concentração de municípios aptos
        </p>
      </div>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────── */
export default function MunicipioSidebar({ municipio, sazonalidade, loading, onClose }) {
  const [tab, setTab] = useState(0);
  const [precoSaca,   setPrecoSaca]   = useState(95);
  const [freteTonKm,  setFreteTonKm]  = useState(0.32);

  /* useMemo ANTES do early return — regra dos hooks */
  const log = useMemo(() => {
    if (!municipio?.lat || !municipio?.lon) return null;
    const dist    = Math.round(haversine(municipio.lat, municipio.lon, AGRARIA.lat, AGRARIA.lon) * 1.35);
    const pTon    = (precoSaca / 60) * 1000;
    const frete   = dist * freteTonKm;
    const liq     = pTon - frete;
    return { dist, pTon, frete, liq, liqSaca: liq * 60 / 1000, viab: viabLabel(dist) };
  }, [municipio, precoSaca, freteTonKm]);

  /* ZARC real por município, decêndio a decêndio — Fase 1 do plano de 10 fases.
     Só cevada, safra 2025/2026 (ver /zarc/elegibilidade). Busca sob demanda,
     só quando a aba Seguro está aberta, e refaz quando a data simulada muda. */
  const [dataPlantio, setDataPlantio] = useState(() => `${new Date().getFullYear()}-06-15`);
  const [zarcReal,    setZarcReal]    = useState(null);
  const [zarcLoading, setZarcLoading] = useState(false);

  useEffect(() => {
    if (tab !== 1 || !municipio?.codigo_ibge) return;
    setZarcLoading(true);
    fetch(`${API}/zarc/elegibilidade?codigo_ibge=${municipio.codigo_ibge}&data_plantio=${dataPlantio}`)
      .then(r => r.json())
      .then(setZarcReal)
      .catch(() => setZarcReal(null))
      .finally(() => setZarcLoading(false));
  }, [tab, municipio?.codigo_ibge, dataPlantio]);

  if (!municipio) return <EmptyState />;

  const score = municipio.score_aptidao ?? 0;
  const cl    = classe(municipio);
  const cor   = COR[cl];
  const bg    = BG[cl];

  const criterios = CRITERIOS.map(c => ({
    ...c,
    val: c.valor(municipio),
    pass: c.ok(municipio),
    nota: c.nota(municipio),
  }));
  const aprovados = criterios.filter(c => c.pass).length;

  const TABS = ['Aptidão', 'Seguro', 'Logística', 'Solo & Clima'];

  return (
    <div style={{ width:340, flexShrink:0, height:'100%', background:'#fff',
      borderLeft:'1px solid #E5E7EB', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── HEADER ────────────────────────────────────────── */}
      <div style={{ padding:'14px 16px 0', borderBottom:'1px solid #E5E7EB', background: bg }}>

        {/* Nome + badge + fechar */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:16,fontWeight:800,color:'#1a1a1a',lineHeight:1.2,marginBottom:2 }}>
              {municipio.nome_municipio}
            </p>
            <p style={{ fontSize:11,color:'#6B7280' }}>
              {municipio.uf} · IBGE {municipio.codigo_ibge}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginLeft:8 }}>
            <span style={{ fontSize:10,fontWeight:700,color:cor,
              background:`${cor}18`,border:`1px solid ${cor}35`,
              borderRadius:6,padding:'3px 9px' }}>
              {LABEL[cl].toUpperCase()}
            </span>
            <button
              onClick={() => printFicha(municipio, log, criterios, aprovados)}
              title="Gerar ficha técnica (PDF / impressão)"
              style={{ background:'rgba(255,255,255,0.8)',
                border:'1px solid #E5E7EB',cursor:'pointer',color:'#2D6A4F',
                padding:5,borderRadius:7,display:'flex',alignItems:'center' }}>
              <FileText size={13} />
            </button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.8)',
              border:'1px solid #E5E7EB',cursor:'pointer',color:'#6B7280',
              padding:5,borderRadius:7,display:'flex',alignItems:'center' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Score + gauge compacto */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          {/* Círculo de score */}
          <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx={32} cy={32} r={26} fill="none" stroke="#E5E7EB" strokeWidth={7} />
              <circle cx={32} cy={32} r={26} fill="none" stroke={cor} strokeWidth={7}
                strokeDasharray={`${2*Math.PI*26 * score/100} ${2*Math.PI*26 * (1-score/100)}`}
                strokeDashoffset={2*Math.PI*26 * 0.25}
                strokeLinecap="round" style={{ transition:'stroke-dasharray 0.8s ease' }} />
            </svg>
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontSize:17,fontWeight:800,color:cor,lineHeight:1 }}>{score}</span>
              <span style={{ fontSize:8,color:'#9CA3AF' }}>/100</span>
            </div>
          </div>

          {/* 4 métricas rápidas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, flex:1 }}>
            {[
              { icon:Mountain,    label:'Alt',   val:`${municipio.altitude?.toFixed(0)??'—'}m`,    cor:'#374151' },
              { icon:Thermometer, label:'Temp',  val:`${municipio.temp_media_anual?.toFixed(1)??'—'}°C`, cor:'#d97706' },
              { icon:CloudRain,   label:'Chuva', val:`${municipio.precipitacao_acumulada_anual?.toFixed(0)??'—'}mm`, cor:'#2563eb' },
              { icon:Snowflake,   label:'Geada', val:`${municipio.risco_geada_pct?.toFixed(0)??'—'}%`,   cor:'#7c3aed' },
            ].map(({ icon:Icon, label, val, cor:c }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.7)',
                border:'1px solid rgba(0,0,0,0.07)',borderRadius:7,
                padding:'5px 8px', display:'flex', alignItems:'center', gap:5 }}>
                <Icon size={10} color={c} style={{ flexShrink:0 }} />
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:8,color:'#9CA3AF',lineHeight:1 }}>{label}</p>
                  <p style={{ fontSize:12,fontWeight:700,color:c,lineHeight:1.2 }}>{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:-1 }}>
          {TABS.map((t,i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex:1, padding:'8px 4px', fontSize:11, fontWeight: tab===i ? 700 : 500,
              color: tab===i ? cor : '#6B7280',
              background:'transparent', border:'none', cursor:'pointer',
              borderBottom: tab===i ? `2px solid ${cor}` : '2px solid transparent',
              transition:'all 0.15s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── CONTEÚDO POR TAB ──────────────────────────────── */}
      {/* minHeight:0 é necessário aqui — sem isso, um filho flex com
          overflowY:auto não encolhe (o padrão do flexbox é min-height:auto),
          então em telas mais baixas o conteúdo (ex: Chuva Colheita, Cultivares
          Recomendadas) fica cortado sem scroll em vez de rolar. */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* ── Tab 0: APTIDÃO ──────────────────────────────── */}
        {tab === 0 && (
          <>
            {/* Resultado geral */}
            <div style={{ background: bg, border:`1.5px solid ${cor}40`,
              borderRadius:10, padding:'11px 14px',
              display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36,height:36,borderRadius:9,
                background:`${cor}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                {cl==='apto'
                  ? <CheckCircle size={18} color={cor} />
                  : cl==='inapto'
                    ? <XCircle size={18} color={cor} />
                    : <AlertTriangle size={18} color={cor} />}
              </div>
              <div>
                <p style={{ fontSize:13,fontWeight:800,color:cor }}>{LABEL[cl]}</p>
                <p style={{ fontSize:10,color:'#6B7280' }}>{aprovados} de 6 critérios atendidos</p>
              </div>
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <p style={{ fontSize:22,fontWeight:800,color:cor,lineHeight:1 }}>{score}</p>
                <p style={{ fontSize:9,color:'#9CA3AF' }}>pontos</p>
              </div>
            </div>

            {/* Critérios com valor real */}
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
              <p style={{ fontSize:9,fontWeight:700,color:'#6B7280',textTransform:'uppercase',
                letterSpacing:1.2,padding:'10px 14px 8px',borderBottom:'1px solid #F3F4F6' }}>
                Critérios ZARC / EMBRAPA
              </p>
              {criterios.map((c, i) => {
                // 3 níveis a partir da nota graduada (0-1): ideal / parcial (perto do
                // limite, ainda ganha crédito) / fora (sem crédito nenhum). Sem isso,
                // um valor a poucos décimos do limite parecia igual a um valor bem fora.
                const tier = c.nota >= 0.999 ? 'ideal' : c.nota > 0 ? 'parcial' : 'fora';
                const corTier = tier === 'ideal' ? '#16a34a' : tier === 'parcial' ? '#d97706' : '#dc2626';
                const Icone = tier === 'ideal' ? CheckCircle : tier === 'parcial' ? AlertTriangle : XCircle;
                return (
                  <div key={c.label} style={{
                    padding:'8px 14px 10px',
                    borderBottom: i < criterios.length-1 ? '1px solid #F9FAFB' : 'none',
                    background: tier === 'ideal' ? '#f0fdf420' : '#fff',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <Icone size={14} color={corTier} style={{ flexShrink:0 }} />
                      <c.icon size={11} color={c.cor} style={{ flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:11, color:'#374151', fontWeight:500 }}>{c.label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:corTier }}>{c.val}</span>
                      <span style={{ fontSize:9, color:'#9CA3AF', minWidth:52, textAlign:'right' }}>{c.faixa}</span>
                    </div>
                    {tier === 'parcial' && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, paddingLeft:23 }}>
                        <div style={{ flex:1, height:4, background:'#F3F4F6', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ width:`${Math.round(c.nota*100)}%`, height:'100%', background:corTier, borderRadius:2 }} />
                        </div>
                        <span style={{ fontSize:8, color:corTier, fontWeight:700, flexShrink:0 }}>
                          {Math.round(c.nota*100)}% do critério — perto do ideal, não é reprovação total
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cultivares */}
            {(cl === 'apto' || cl === 'parcial') && (
              <div style={{ background:'#F0F7F2',border:'1px solid rgba(45,106,79,0.2)',
                borderRadius:10,padding:'11px 14px' }}>
                <p style={{ fontSize:9,fontWeight:700,color:'#2D6A4F',
                  textTransform:'uppercase',letterSpacing:1.2,marginBottom:8 }}>
                  Cultivares Recomendadas
                </p>
                <div style={{ display:'flex', gap:7 }}>
                  {(cl==='apto'
                    ? [{ nome:'Princesa', cor:'#16a34a' },{ nome:'Duquesa', cor:'#15803d' }]
                    : [{ nome:'BRS Cauê', cor:'#d97706' },{ nome:'Imperatriz', cor:'#16a34a' }]
                  ).map(cv => (
                    <div key={cv.nome} style={{ flex:1, background:'#fff',
                      border:`1px solid ${cv.cor}30`,borderRadius:8,
                      padding:'8px 10px',textAlign:'center' }}>
                      <p style={{ fontSize:11,fontWeight:700,color:cv.cor }}>{cv.nome}</p>
                      <p style={{ fontSize:9,color:'#6B7280',marginTop:2 }}>Agrária / Embrapa</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab 1: SEGURO ───────────────────────────────── */}
        {tab === 1 && (() => {
          const temZarc = ZARC_UFS.includes(municipio.uf);

          /* Agrupa os resultados reais por Grupo (I/II/III), pegando o menor
             risco disponível em cada grupo pra um resumo compacto */
          const porGrupo = {};
          (zarcReal?.resultados ?? []).forEach(r => {
            if (!porGrupo[r.grupo] || r.nivel_risco < porGrupo[r.grupo].nivel_risco) {
              porGrupo[r.grupo] = r;
            }
          });
          const gruposOrdenados = Object.values(porGrupo).sort((a, b) => a.nivel_risco - b.nivel_risco);

          return (
            <>
              {/* Simulador de data de semeio */}
              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'11px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <p style={{ fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:1.2 }}>
                    Simular data de semeio
                  </p>
                  {zarcLoading && <Loader2 size={11} color="#9CA3AF" style={{ animation:'spin 0.8s linear infinite' }} />}
                </div>
                <input type="date" value={dataPlantio} onChange={e => setDataPlantio(e.target.value)}
                  style={{ width:'100%', padding:'6px 10px', borderRadius:7, border:'1px solid #E5E7EB', fontSize:12, color:'#374151' }} />
                <p style={{ fontSize:9, color:'#9CA3AF', marginTop:5 }}>
                  ZARC oficial de cevada é publicado por decêndio (períodos de ~10 dias) — mude a data pra ver como a elegibilidade muda ao longo da janela de semeio.
                </p>
              </div>

              {/* Resultado real por município */}
              {zarcReal && !zarcReal.elegivel && (
                <div style={{ background:'#fef2f2', border:'1.5px solid #dc262640', borderRadius:10, padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <Shield size={18} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} />
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:'#dc2626', marginBottom:4 }}>
                      {zarcReal.municipio ? 'Sem indicação de plantio nessa data' : 'Município fora da abrangência do ZARC de cevada'}
                    </p>
                    <p style={{ fontSize:11, color:'#4B5563', lineHeight:1.5 }}>
                      {zarcReal.municipio
                        ? `A portaria oficial não indica semeio de cevada cervejeira no decêndio ${zarcReal.decendio} (safra ${zarcReal.safra}) pra esse município. Tente outra data — a janela real costuma ficar entre maio e agosto.`
                        : 'Esse município não tem nenhum registro na Tábua de Risco de cevada cervejeira (MAPA), safra 2025/2026 — provavelmente fora da área historicamente zoneada pra essa cultura.'}
                    </p>
                  </div>
                </div>
              )}

              {zarcReal?.elegivel && (
                <div style={{ background:'#f0fdf4', border:'1.5px solid #16a34a40', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                    <Shield size={18} color="#16a34a" style={{ flexShrink:0, marginTop:1 }} />
                    <div>
                      <p style={{ fontSize:12, fontWeight:800, color:'#16a34a', marginBottom:2 }}>
                        Elegível pra semeio em {new Date(dataPlantio+'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p style={{ fontSize:10, color:'#6B7280' }}>
                        Decêndio {zarcReal.decendio} · safra {zarcReal.safra} · ZARC oficial por município (MAPA)
                      </p>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {gruposOrdenados.map(g => (
                      <div key={g.grupo} style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', borderRadius:7, padding:'6px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#374151', flex:1 }}>{g.grupo}</span>
                        <span style={{ fontSize:9, color:'#9CA3AF' }}>melhor solo: {g.solo_ad}</span>
                        <span style={{
                          fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20,
                          background: g.nivel_risco === 20 ? '#f0fdf4' : g.nivel_risco === 30 ? '#fffbeb' : '#fef2f2',
                          color: g.nivel_risco === 20 ? '#16a34a' : g.nivel_risco === 30 ? '#d97706' : '#dc2626',
                        }}>risco {g.nivel_risco}%</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:9, color:'#9CA3AF', marginTop:8 }}>
                    Fonte: {gruposOrdenados[0]?.portaria ?? 'Portaria ZARC/MAPA'} — Tábua de Risco, dados.agricultura.gov.br
                  </p>
                </div>
              )}

              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'11px 14px' }}>
                <p style={{ fontSize:9,fontWeight:700,color:'#6B7280',textTransform:'uppercase',
                  letterSpacing:1.2,marginBottom:8 }}>
                  Estados com ZARC cevada publicado
                </p>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {ZARC_UFS.map(uf => (
                    <span key={uf} style={{
                      fontSize:10, fontWeight: uf===municipio.uf ? 800 : 500,
                      padding:'3px 9px', borderRadius:20,
                      background: uf===municipio.uf ? (temZarc ? '#16a34a20' : '#dc262620') : '#F9FAFB',
                      color: uf===municipio.uf ? (temZarc ? '#16a34a' : '#dc2626') : '#6B7280',
                      border: `1px solid ${uf===municipio.uf ? (temZarc ? '#16a34a50' : '#dc262650') : '#E5E7EB'}`,
                    }}>{uf}</span>
                  ))}
                </div>
              </div>

              <a href={MAPA_PAINEL_URL} target="_blank" rel="noopener noreferrer" style={{
                display:'flex', alignItems:'center', gap:8, textDecoration:'none',
                background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10,
                padding:'10px 14px',
              }}>
                <ExternalLink size={13} color="#374151" style={{ flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Painel de Indicação de Riscos — MAPA</p>
                  <p style={{ fontSize:9, color:'#9CA3AF' }}>Consulta oficial de elegibilidade PROAGRO/PSR por município</p>
                </div>
              </a>

              <p style={{ fontSize:9, color:'#9CA3AF', lineHeight:1.5 }}>
                Fonte: Tábua de Risco ZARC, MAPA (dados.agricultura.gov.br), safra 2025/2026
              </p>
            </>
          );
        })()}

        {/* ── Tab 2: LOGÍSTICA ────────────────────────────── */}
        {tab === 2 && log && (
          <>
            {/* Destino */}
            <div style={{ background:'#F9FAFB',border:'1px solid #E5E7EB',
              borderRadius:10,padding:'11px 14px',
              display:'flex',alignItems:'center',gap:8 }}>
              <Truck size={14} color="#374151" />
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10,color:'#6B7280' }}>Destino — Cooperativa Agrária</p>
                <p style={{ fontSize:12,fontWeight:600,color:'#374151' }}>Entre Rios, Guarapuava / PR</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:20,fontWeight:800,color:'#374151',lineHeight:1 }}>{log.dist}</p>
                <p style={{ fontSize:9,color:'#9CA3AF' }}>km est.</p>
              </div>
            </div>

            {/* Viabilidade badge */}
            <div style={{ background:`${log.viab.cor}0f`,border:`1.5px solid ${log.viab.cor}40`,
              borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:9,color:'#6B7280',marginBottom:2 }}>Preço líquido / saca</p>
                <p style={{ fontSize:18,fontWeight:800,color:log.viab.cor }}>
                  R$ {log.liqSaca.toFixed(2)}
                </p>
              </div>
              <span style={{ fontSize:11,fontWeight:700,color:log.viab.cor,
                background:`${log.viab.cor}18`,borderRadius:7,padding:'5px 12px' }}>
                {log.viab.label}
              </span>
            </div>

            {/* Métricas */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7 }}>
              {[
                { label:'Preço bruto', val:`R$${Math.round(log.pTon)}`, sub:'/ton', cor:'#374151', bg:'#F9FAFB' },
                { label:'Frete est.',  val:`-R$${Math.round(log.frete)}`, sub:'/ton', cor:'#DC2626', bg:'#FEF2F2' },
                { label:'Líquido',     val:`R$${Math.round(log.liq)}`,   sub:'/ton', cor:log.viab.cor, bg:`${log.viab.cor}0d` },
              ].map(m => (
                <div key={m.label} style={{ background:m.bg,borderRadius:9,padding:'9px 10px' }}>
                  <p style={{ fontSize:9,color:'#6B7280',marginBottom:3 }}>{m.label}</p>
                  <p style={{ fontSize:13,fontWeight:700,color:m.cor,lineHeight:1 }}>
                    {m.val}<span style={{ fontSize:8,fontWeight:400,color:'#9CA3AF' }}>{m.sub}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Sliders */}
            <div style={{ background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'12px 14px',display:'flex',flexDirection:'column',gap:10 }}>
              <p style={{ fontSize:9,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:1.2 }}>
                Simular cenário
              </p>
              {[
                { label:'Preço da saca', val:`R$ ${precoSaca}/saca`, min:60, max:150, step:1,
                  value:precoSaca, onChange:e=>setPrecoSaca(+e.target.value), accent:'#2D6A4F' },
                { label:'Frete (R$/ton·km)', val:`R$ ${freteTonKm.toFixed(2)}`, min:0.15, max:0.80, step:0.01,
                  value:freteTonKm, onChange:e=>setFreteTonKm(+e.target.value), accent:'#DC2626' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:10,color:'#6B7280' }}>{s.label}</span>
                    <span style={{ fontSize:10,fontWeight:700,color:'#374151' }}>{s.val}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={s.onChange}
                    style={{ width:'100%',accentColor:s.accent,height:3 }} />
                </div>
              ))}
            </div>
            <p style={{ fontSize:9,color:'#9CA3AF',lineHeight:1.5 }}>
              Distância estimada via fator rodoviário 1,35× sobre linha reta.
            </p>
          </>
        )}

        {/* ── Tab 3: SOLO & CLIMA ─────────────────────────── */}
        {tab === 3 && (
          <>
            {/* Solo */}
            {municipio.tipo_solo_zarc && municipio.pct_argila ? (() => {
              const si = SOLO_INFO[municipio.tipo_solo_zarc];
              const est = (municipio.tipo_solo||'').includes('(est.)');
              return (
                <div style={{ background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'13px 14px' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                    <p style={{ fontSize:9,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:1.2 }}>
                      Solo — SoilGrids ISRIC
                    </p>
                    {est && (
                      <span style={{ fontSize:9,fontWeight:700,color:'#b45309',
                        background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:5,padding:'2px 7px',
                        display:'flex',alignItems:'center',gap:3 }}>
                        <AlertTriangle size={8} /> ESTIMATIVA
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                    <div style={{ width:38,height:38,borderRadius:9,background:`${si.cor}20`,
                      display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Layers size={18} color={si.cor} />
                    </div>
                    <div>
                      <p style={{ fontSize:13,fontWeight:700,color:si.cor }}>{si.label}</p>
                      <p style={{ fontSize:10,color:'#6B7280' }}>{si.recom}</p>
                    </div>
                  </div>
                  <div style={{ marginBottom:6 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#6B7280',marginBottom:5 }}>
                      <span>Teor de Argila</span>
                      <span style={{ fontWeight:700,color:si.cor }}>{municipio.pct_argila}%</span>
                    </div>
                    <div style={{ height:7,background:'#E5E7EB',borderRadius:4,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${Math.min(municipio.pct_argila,100)}%`,
                        background:si.cor,borderRadius:4,transition:'width 0.8s ease' }} />
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:8,color:'#9CA3AF',marginTop:3 }}>
                      <span>0%</span><span style={{ color:'#f59e0b' }}>15%</span>
                      <span style={{ color:'#10b981' }}>35%</span><span>100%</span>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div style={{ background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:10,padding:'13px 14px' }}>
                <p style={{ fontSize:11,color:'#6B7280' }}>Dados de solo ainda não coletados.</p>
              </div>
            )}

            {/* Gráfico climático mensal */}
            {sazonalidade && sazonalidade.length > 0 ? (
              <div style={{ background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'13px 14px' }}>
                <p style={{ fontSize:9,fontWeight:700,color:'#6B7280',
                  textTransform:'uppercase',letterSpacing:1.2,marginBottom:10 }}>
                  Clima Mensal (média 30 anos)
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={sazonalidade} margin={{ top:4,right:4,left:-20,bottom:0 }}>
                    <defs>
                      <linearGradient id="gPrec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize:9,fill:'#9CA3AF' }} axisLine={false} tickLine={false}
                      tickFormatter={m => ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m]} />
                    <YAxis yAxisId="p" tick={{ fontSize:8,fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="t" orientation="right" tick={{ fontSize:8,fill:'#d97706' }} axisLine={false} tickLine={false} domain={[0,40]} />
                    <Tooltip
                      contentStyle={{ fontSize:10,borderRadius:8,border:'1px solid #E5E7EB' }}
                      formatter={(v,n) => n==='Temp' ? [`${v.toFixed(1)}°C`,n] : [`${Math.round(v)}mm`,n]} />
                    <Area yAxisId="p" type="monotone" dataKey="precipitacao" name="Chuva"
                      stroke="#2563eb" fill="url(#gPrec)" strokeWidth={1.5} dot={false} />
                    <Area yAxisId="t" type="monotone" dataKey="temp_media" name="Temp"
                      stroke="#d97706" fill="none" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display:'flex',gap:12,justifyContent:'center',marginTop:6 }}>
                  {[{cor:'#2563eb',label:'Precipitação (mm)'},{cor:'#d97706',label:'Temperatura (°C)',dash:true}].map(l=>(
                    <div key={l.label} style={{ display:'flex',alignItems:'center',gap:4 }}>
                      <div style={{ width:16,height:2,background:l.cor,
                        borderTop: l.dash ? '2px dashed '+l.cor : undefined,
                        background: l.dash ? 'none' : l.cor }} />
                      <span style={{ fontSize:9,color:'#6B7280' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div style={{ background:'#F9FAFB',borderRadius:10,height:160,
                display:'flex',alignItems:'center',justifyContent:'center' }}>
                <p style={{ fontSize:11,color:'#9CA3AF' }}>Carregando dados climáticos...</p>
              </div>
            ) : (
              <div style={{ background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:10,padding:'13px 14px' }}>
                <p style={{ fontSize:11,color:'#6B7280' }}>Dados climáticos mensais não disponíveis.</p>
              </div>
            )}

            {/* Calendário de cultivo com Gantt + cultivar */}
            <CalendarioPlantio municipio={municipio} calendario={sazonalidade} />
          </>
        )}
      </div>
    </div>
  );
}
