import { useState, useMemo } from 'react';
import { X, MapPin, Mountain, Thermometer, CloudRain, Snowflake,
         CheckCircle, XCircle, Truck, Layers, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import CalendarioPlantio from './CalendarioPlantio.jsx';

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
const AGRARIA = { lat:-25.530, lon:-51.491 };
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

/* ─── Critérios ZARC ─────────────────────────────────────── */
const CRITERIOS = [
  {
    label: 'Temperatura', icon: Thermometer, cor:'#d97706',
    faixa: '10–22°C',
    valor: m => m.temp_media_anual != null ? `${m.temp_media_anual.toFixed(1)}°C` : '—',
    ok:    m => m.temp_media_anual >= 10 && m.temp_media_anual <= 22,
  },
  {
    label: 'Precipitação', icon: CloudRain, cor:'#2563eb',
    faixa: '400–2000mm',
    valor: m => m.precipitacao_acumulada_anual != null ? `${Math.round(m.precipitacao_acumulada_anual)}mm` : '—',
    ok:    m => m.precipitacao_acumulada_anual >= 400 && m.precipitacao_acumulada_anual <= 2000,
  },
  {
    label: 'Altitude', icon: Mountain, cor:'#374151',
    faixa: '≥ 700m',
    valor: m => m.altitude != null ? `${Math.round(m.altitude)}m` : '—',
    ok:    m => m.altitude >= 700,
  },
  {
    label: 'Risco de Geada', icon: Snowflake, cor:'#7c3aed',
    faixa: '< 30%',
    valor: m => m.risco_geada_pct != null ? `${m.risco_geada_pct.toFixed(0)}%` : '—',
    ok:    m => m.risco_geada_pct != null && m.risco_geada_pct < 30,
  },
  {
    label: 'Solo (ZARC)', icon: Layers, cor:'#92400e',
    faixa: 'Tipo 2 ou 3',
    valor: m => m.tipo_solo_zarc != null ? `Tipo ${m.tipo_solo_zarc}` : '—',
    ok:    m => m.tipo_solo_zarc != null && m.tipo_solo_zarc >= 2,
  },
  {
    label: 'Chuva Colheita', icon: CloudRain, cor:'#0e7490',
    faixa: '120–400mm',
    valor: m => m.chuva_colheita_mm != null ? `${Math.round(m.chuva_colheita_mm)}mm` : '—',
    ok:    m => m.chuva_colheita_mm != null && m.chuva_colheita_mm >= 120 && m.chuva_colheita_mm <= 400,
  },
];

const SOLO_INFO = {
  1: { label:'Tipo 1 — Arenoso',      cor:'#ef4444', recom:'Não recomendado pelo ZARC' },
  2: { label:'Tipo 2 — Textura Média', cor:'#f59e0b', recom:'Aceito com manejo adequado' },
  3: { label:'Tipo 3 — Argiloso',      cor:'#10b981', recom:'Plenamente apto pelo ZARC' },
};

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

  if (!municipio) return <EmptyState />;

  const score = municipio.score_aptidao ?? 0;
  const cl    = classe(municipio);
  const cor   = COR[cl];
  const bg    = BG[cl];

  const criterios = CRITERIOS.map(c => ({
    ...c,
    val: c.valor(municipio),
    pass: c.ok(municipio),
  }));
  const aprovados = criterios.filter(c => c.pass).length;

  const TABS = ['Aptidão', 'Logística', 'Solo & Clima'];

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
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>

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
              {criterios.map((c, i) => (
                <div key={c.label} style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'9px 14px',
                  borderBottom: i < criterios.length-1 ? '1px solid #F9FAFB' : 'none',
                  background: c.pass ? '#f0fdf420' : '#fff',
                }}>
                  {c.pass
                    ? <CheckCircle size={14} color="#16a34a" style={{ flexShrink:0 }} />
                    : <XCircle     size={14} color="#dc2626" style={{ flexShrink:0 }} />}
                  <c.icon size={11} color={c.cor} style={{ flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:11, color:'#374151', fontWeight:500 }}>{c.label}</span>
                  <span style={{ fontSize:11, fontWeight:700,
                    color: c.pass ? '#16a34a' : '#dc2626' }}>{c.val}</span>
                  <span style={{ fontSize:9, color:'#9CA3AF', minWidth:52, textAlign:'right' }}>{c.faixa}</span>
                </div>
              ))}
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
                    ? [{ nome:'BRS Princesa', cor:'#16a34a' },{ nome:'BRS Duquesa', cor:'#15803d' }]
                    : [{ nome:'BRS Condessa', cor:'#d97706' },{ nome:'BRS Imperatriz', cor:'#16a34a' }]
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

        {/* ── Tab 1: LOGÍSTICA ────────────────────────────── */}
        {tab === 1 && log && (
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

        {/* ── Tab 2: SOLO & CLIMA ─────────────────────────── */}
        {tab === 2 && (
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
