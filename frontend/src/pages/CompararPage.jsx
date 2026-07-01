import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell,
} from 'recharts';
import {
  GitCompare, Plus, X, Trophy, CheckCircle, AlertTriangle,
  Mountain, Thermometer, CloudRain, Snowflake, Layers, Truck,
  TrendingUp, Map, Star, Download,
} from 'lucide-react';

/* ── Constantes ─────────────────────────────────── */
const CORES_SLOT = ['#1B4332', '#0284c7', '#d97706'];
const CORES_SLOT_LIGHT = ['rgba(27,67,50,0.08)', 'rgba(2,132,199,0.08)', 'rgba(217,119,6,0.08)'];
const AGRARIA = { lat: -25.530, lon: -51.491 };

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function fmt(v, dec = 0) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtR(v) { return `R$ ${fmt(v, 0)}`; }

const CUSTOS_UF = {
  PR: { semente:180, fertilizante:950,  defensivos:450, mecanizacao:420, secagem:195, admin:120, prod_tha:3.5 },
  SC: { semente:180, fertilizante:980,  defensivos:470, mecanizacao:440, secagem:192, admin:120, prod_tha:3.2 },
  RS: { semente:175, fertilizante:920,  defensivos:430, mecanizacao:400, secagem:180, admin:115, prod_tha:3.0 },
  GO: { semente:190, fertilizante:1050, defensivos:520, mecanizacao:460, secagem:210, admin:130, prod_tha:2.8 },
  MG: { semente:185, fertilizante:1020, defensivos:500, mecanizacao:450, secagem:204, admin:125, prod_tha:2.6 },
  SP: { semente:190, fertilizante:1030, defensivos:510, mecanizacao:460, secagem:210, admin:130, prod_tha:2.5 },
  default: { semente:185, fertilizante:1000, defensivos:480, mecanizacao:440, secagem:200, admin:125, prod_tha:2.8 },
};

function enriquecer(m, precoSaca = 95) {
  if (!m) return null;
  const c = CUSTOS_UF[m.uf] ?? CUSTOS_UF.default;
  const dist = m.lat && m.lon ? Math.round(haversine(m.lat, m.lon, AGRARIA.lat, AGRARIA.lon) * 1.35) : null;
  const precoTon = (precoSaca / 60) * 1000;
  const frete = dist ? dist * 0.32 : 0;
  const liquido = precoTon - frete;
  const custoTotal = c.semente + c.fertilizante + c.defensivos + c.mecanizacao + c.secagem + c.admin;
  const receita = liquido * c.prod_tha;
  const lucro = receita - custoTotal;
  const roi = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
  return { ...m, dist, frete, liquido, custoTotal, receita, lucro, roi, prod_tha: c.prod_tha };
}

/* ── Dimensões do radar ─────────────────────────── */
function buildRadar(m) {
  if (!m) return [];
  const score = m.score_aptidao ?? 0;
  const temp  = m.temp_media_anual ?? 17;
  const prec  = m.precipitacao_acumulada_anual ?? 800;
  const alt   = m.altitude ?? 300;
  const geada = m.risco_geada_pct ?? 50;
  const argila = m.argila_pct ?? 20;

  return [
    { dim: 'Aptidão',     val: score },
    { dim: 'Temperatura', val: temp >= 10 && temp <= 22 ? 100 : temp > 22 ? Math.max(0, 100 - (temp - 22) * 15) : Math.max(0, 100 - (10 - temp) * 15) },
    { dim: 'Precipit.',   val: prec >= 400 && prec <= 2000 ? 100 : prec < 400 ? Math.max(0, (prec / 400) * 100) : 60 },
    { dim: 'Altitude',    val: alt >= 700 ? 100 : Math.min(100, (alt / 700) * 90) },
    { dim: 'Geada OK',    val: geada < 20 ? 100 : geada < 35 ? 75 : geada < 50 ? 40 : 10 },
    { dim: 'Solo',        val: (m.tipo_solo_zarc ?? 0) >= 3 ? 100 : (m.tipo_solo_zarc ?? 0) >= 2 ? 75 : 20 },
    { dim: 'Logística',   val: m.dist ? (m.dist <= 200 ? 100 : m.dist <= 400 ? 80 : m.dist <= 700 ? 55 : 25) : 50 },
    { dim: 'ROI est.',    val: m.roi > 30 ? 100 : m.roi > 10 ? 70 : m.roi > 0 ? 40 : 10 },
  ];
}

/* ── Score combinado (síntese) ──────────────────── */
function scoreGeral(m) {
  if (!m) return 0;
  const radar = buildRadar(m);
  return Math.round(radar.reduce((s, d) => s + d.val, 0) / radar.length);
}

/* ── Linhas de comparação ──────────────────────── */
const LINHAS = [
  { label: 'Score ZARC', key: 'score_aptidao', fmt: v => `${v ?? '—'}/100`, maior: 'melhor', cor: v => v >= 70 ? '#1A7A3C' : v >= 40 ? '#D4A017' : '#4A90C4' },
  { label: 'Temperatura média', key: 'temp_media_anual', fmt: v => `${fmt(v,1)}°C`, maior: null },
  { label: 'Precipitação anual', key: 'precipitacao_acumulada_anual', fmt: v => `${fmt(v,0)} mm`, maior: null },
  { label: 'Altitude', key: 'altitude', fmt: v => `${fmt(v,0)} m`, maior: 'melhor' },
  { label: 'Risco de geada', key: 'risco_geada_pct', fmt: v => `${fmt(v,0)}%`, maior: 'pior' },
  { label: 'Tipo de solo ZARC', key: 'tipo_solo_zarc', fmt: v => `Tipo ${v ?? '—'}`, maior: 'melhor' },
  { label: 'Argila (%)', key: 'argila_pct', fmt: v => `${fmt(v,1)}%`, maior: 'melhor' },
  { label: 'Distância Agrária', key: 'dist', fmt: v => v ? `${v} km` : '—', maior: 'pior' },
  { label: 'Frete estimado', key: 'frete', fmt: v => v ? fmtR(v) + '/ton' : '—', maior: 'pior' },
  { label: 'Preço líquido/ton', key: 'liquido', fmt: v => v ? fmtR(v) : '—', maior: 'melhor' },
  { label: 'Custo produção/ha', key: 'custoTotal', fmt: v => fmtR(v), maior: 'pior' },
  { label: 'Receita est./ha', key: 'receita', fmt: v => fmtR(v), maior: 'melhor' },
  { label: 'Lucro est./ha', key: 'lucro', fmt: v => fmtR(v), maior: 'melhor', destaque: true },
  { label: 'ROI estimado', key: 'roi', fmt: v => `${fmt(v,1)}%`, maior: 'melhor', destaque: true },
  { label: 'Produtiv. esperada', key: 'prod_tha', fmt: v => `${fmt(v,1)} t/ha`, maior: 'melhor' },
];

function vencedores(slots, chave) {
  const vals = slots.map(s => s ? (s[chave] ?? null) : null);
  const linha = LINHAS.find(l => l.key === chave);
  if (!linha?.maior) return [];
  const valid = vals.filter(v => v != null);
  if (!valid.length) return [];
  const best = linha.maior === 'melhor' ? Math.max(...valid) : Math.min(...valid);
  return vals.map((v, i) => v === best ? i : -1).filter(i => i >= 0);
}

/* ── Exportar comparativo ── */
function exportComparativo(slots) {
  const filled = slots.filter(Boolean);
  if (!filled.length) return;
  const cols = ['nome_municipio', 'uf', 'score_aptidao', 'temp_media_anual', 'precipitacao_acumulada_anual', 'altitude', 'risco_geada_pct', 'dist', 'lucro', 'roi'];
  const headers = cols.join(',');
  const rows = filled.map(m => cols.map(c => {
    const v = m[c];
    return typeof v === 'number' ? v.toFixed(1) : (v ?? '');
  }).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'comparativo_municipios.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ══ COMPONENTE PRINCIPAL ══════════════════════════════ */
export default function CompararPage({ municipios = [] }) {
  const [slots, setSlots]     = useState([null, null, null]);
  const [busca, setBusca]     = useState(['', '', '']);
  const [aberto, setAberto]   = useState(null);
  const [precoSaca, setPreco] = useState(95);

  const enriched = useMemo(
    () => slots.map(m => m ? enriquecer(m, precoSaca) : null),
    [slots, precoSaca]
  );

  const preenchidos = enriched.filter(Boolean);

  /* Sugestões de busca */
  const sugestoes = useMemo(() => {
    if (aberto == null || !busca[aberto] || busca[aberto].length < 2) return [];
    const q = busca[aberto].toLowerCase();
    return municipios
      .filter(m => {
        const ja = slots.some(s => s?.codigo_ibge === m.codigo_ibge);
        return !ja && (m.nome_municipio?.toLowerCase().includes(q) || m.uf?.toLowerCase() === q);
      })
      .slice(0, 8);
  }, [aberto, busca, municipios, slots]);

  function selecionarMunicipio(idx, m) {
    const next = [...slots];
    next[idx] = m;
    setSlots(next);
    const nb = [...busca];
    nb[idx] = '';
    setBusca(nb);
    setAberto(null);
  }

  function removerSlot(idx) {
    const next = [...slots];
    next[idx] = null;
    setSlots(next);
  }

  /* Radar data multi-série */
  const radarDims = ['Aptidão', 'Temperatura', 'Precipit.', 'Altitude', 'Geada OK', 'Solo', 'Logística', 'ROI est.'];
  const radarData = radarDims.map(d => {
    const obj = { dim: d };
    enriched.forEach((m, i) => {
      if (m) {
        const r = buildRadar(m);
        const found = r.find(x => x.dim === d);
        obj[`s${i}`] = found?.val ?? 0;
      }
    });
    return obj;
  });

  /* Bar chart — Score e Lucro */
  const barData = ['Score ZARC', 'ROI (%)', 'Lucro/ha (R$÷100)'].map(label => {
    const obj = { label };
    enriched.forEach((m, i) => {
      if (!m) return;
      if (label === 'Score ZARC') obj[`s${i}`] = m.score_aptidao ?? 0;
      if (label === 'ROI (%)') obj[`s${i}`] = Math.max(0, Math.round(m.roi ?? 0));
      if (label === 'Lucro/ha (R$÷100)') obj[`s${i}`] = Math.max(0, Math.round((m.lucro ?? 0) / 100));
    });
    return obj;
  });

  const vencedor = useMemo(() => {
    if (!preenchidos.length) return null;
    const scores = enriched.map(m => m ? scoreGeral(m) : -1);
    const maxScore = Math.max(...scores);
    const idx = scores.indexOf(maxScore);
    return { idx, m: enriched[idx], score: maxScore };
  }, [enriched, preenchidos]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 6, height: 26, borderRadius: 4, background: 'linear-gradient(180deg,#1B4332,#0284c7)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Comparador de Municípios</h1>
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 16 }}>
            Compare até 3 municípios lado a lado — aptidão ZARC, logística, viabilidade econômica e ROI estimado
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Preço da saca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px' }}>
            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Preço/saca:</span>
            <input type="number" min={50} max={150} step={1} value={precoSaca}
              onChange={e => setPreco(Number(e.target.value))}
              style={{ width: 60, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#1B4332', outline: 'none', textAlign: 'center' }} />
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>R$/sc</span>
          </div>
          <button onClick={() => exportComparativo(enriched)} disabled={!preenchidos.length} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, cursor: preenchidos.length ? 'pointer' : 'not-allowed',
            background: preenchidos.length ? '#1B4332' : '#F3F4F6',
            color: preenchidos.length ? '#fff' : '#9CA3AF',
            border: 'none', fontSize: 12, fontWeight: 600,
          }}>
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* ── Slots de seleção ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[0, 1, 2].map(idx => {
          const m = enriched[idx];
          const cor = CORES_SLOT[idx];
          const corLight = CORES_SLOT_LIGHT[idx];
          const sg = m ? scoreGeral(m) : null;

          return (
            <div key={idx} style={{
              border: `2px solid ${m ? cor : '#E5E7EB'}`,
              borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              {/* Header do slot */}
              <div style={{
                background: m ? corLight : '#F9FAFB',
                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: m ? cor : '#E5E7EB', color: m ? '#fff' : '#9CA3AF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>{idx + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m ? cor : '#9CA3AF' }}>
                    {m ? `${m.nome_municipio} / ${m.uf}` : `Município ${idx + 1}`}
                  </span>
                </div>
                {m && <button onClick={() => removerSlot(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}><X size={14} /></button>}
              </div>

              {/* Conteúdo do slot */}
              <div style={{ padding: '12px 16px', minHeight: 100 }}>
                {m ? (
                  <div>
                    {/* Score geral + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                        border: `3px solid ${cor}`, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', background: corLight,
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: cor, lineHeight: 1 }}>{sg}</span>
                        <span style={{ fontSize: 8, color: cor, fontWeight: 600 }}>pts</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>Score Combinado</p>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: m.score_aptidao >= 70 ? '#1A7A3C' : m.score_aptidao >= 40 ? '#D4A017' : '#4A90C4', background: m.score_aptidao >= 70 ? '#F0FDF4' : m.score_aptidao >= 40 ? '#FFFBEB' : '#EFF6FF', borderRadius: 5, padding: '2px 6px', border: `1px solid ${m.score_aptidao >= 70 ? '#1A7A3C' : m.score_aptidao >= 40 ? '#D4A017' : '#4A90C4'}30` }}>
                            ZARC {m.score_aptidao ?? '—'}/100
                          </span>
                          {m.dist && <span style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', borderRadius: 5, padding: '2px 6px' }}>{m.dist} km</span>}
                          <span style={{ fontSize: 9, fontWeight: 600, color: (m.lucro ?? 0) >= 0 ? '#1A7A3C' : '#DC2626', background: (m.lucro ?? 0) >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: 5, padding: '2px 6px' }}>
                            ROI {fmt(m.roi, 0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Métricas rápidas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Lucro/ha', val: fmtR(m.lucro ?? 0), cor: (m.lucro ?? 0) >= 0 ? '#1A7A3C' : '#DC2626' },
                        { label: 'Altitude', val: `${fmt(m.altitude, 0)} m`, cor: '#374151' },
                        { label: 'Temp. média', val: `${fmt(m.temp_media_anual, 1)}°C`, cor: '#374151' },
                        { label: 'Precipit.', val: `${fmt(m.precipitacao_acumulada_anual, 0)} mm`, cor: '#374151' },
                      ].map(d => (
                        <div key={d.label} style={{ background: '#F9FAFB', borderRadius: 7, padding: '7px 9px' }}>
                          <p style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>{d.label}</p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: d.cor }}>{d.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Campo de busca */
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <Map size={13} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        value={busca[idx]}
                        onChange={e => { const b = [...busca]; b[idx] = e.target.value; setBusca(b); setAberto(idx); }}
                        onFocus={() => setAberto(idx)}
                        placeholder={municipios.length ? 'Buscar município...' : 'Aguardando dados...'}
                        disabled={!municipios.length}
                        style={{
                          width: '100%', padding: '9px 12px 9px 32px',
                          border: '1px solid #E5E7EB', borderRadius: 8,
                          fontSize: 12, color: '#374151', background: '#fff', outline: 'none',
                        }}
                      />
                    </div>
                    {aberto === idx && sugestoes.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginTop: 3,
                        maxHeight: 220, overflowY: 'auto',
                      }}>
                        {sugestoes.map(s => (
                          <button key={s.codigo_ibge}
                            onClick={() => selecionarMunicipio(idx, s)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 12px', border: 'none', borderBottom: '1px solid #F3F4F6',
                              background: 'transparent', cursor: 'pointer', textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                              background: s.score_aptidao >= 70 ? '#F0FDF4' : s.score_aptidao >= 40 ? '#FFFBEB' : '#EFF6FF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 800,
                              color: s.score_aptidao >= 70 ? '#1A7A3C' : s.score_aptidao >= 40 ? '#D4A017' : '#4A90C4',
                            }}>
                              {s.score_aptidao ?? '?'}
                            </div>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.nome_municipio}</p>
                              <p style={{ fontSize: 10, color: '#9CA3AF' }}>{s.uf} · alt. {s.altitude?.toFixed(0) ?? '—'}m</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {municipios.length > 0 && busca[idx].length < 2 && (
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                        Digite pelo menos 2 letras para buscar
                      </p>
                    )}
                    {!municipios.length && (
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                        Aguardando carregamento dos dados...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {preenchidos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <GitCompare size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.25 }} />
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nenhum município selecionado</p>
          <p style={{ fontSize: 12 }}>Use os campos acima para buscar e adicionar até 3 municípios para comparar.</p>
        </div>
      )}

      {preenchidos.length >= 2 && (
        <>
          {/* ── Destaque vencedor ── */}
          {vencedor && (
            <div style={{
              background: `linear-gradient(135deg, ${CORES_SLOT_LIGHT[vencedor.idx]}, rgba(255,255,255,0.9))`,
              border: `2px solid ${CORES_SLOT[vencedor.idx]}40`,
              borderRadius: 14, padding: '16px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: CORES_SLOT[vencedor.idx], display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Trophy size={22} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                  Melhor Município (Score Combinado)
                </p>
                <p style={{ fontSize: 18, fontWeight: 800, color: CORES_SLOT[vencedor.idx] }}>
                  {vencedor.m?.nome_municipio} / {vencedor.m?.uf}
                </p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Score combinado: <strong>{vencedor.score}/100</strong> ·
                  ZARC: {vencedor.m?.score_aptidao ?? '—'}/100 ·
                  Lucro est.: {fmtR(vencedor.m?.lucro ?? 0)}/ha ·
                  ROI: {fmt(vencedor.m?.roi, 1)}%
                </p>
              </div>
            </div>
          )}

          {/* ── Gráficos lado a lado ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

            {/* Radar */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Perfil Comparativo (Radar)</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 14 }}>Dimensões normalizadas 0–100</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 6, right: 24, bottom: 6, left: 24 }}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {enriched.map((m, i) => m ? (
                    <Radar key={i} dataKey={`s${i}`} name={`${m.nome_municipio}/${m.uf}`}
                      stroke={CORES_SLOT[i]} fill={CORES_SLOT[i]} fillOpacity={0.15} strokeWidth={2.5} />
                  ) : null)}
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Score, ROI e Lucro Comparados</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 14 }}>Lucro dividido por 100 para escala visual</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {enriched.map((m, i) => m ? (
                    <Bar key={i} dataKey={`s${i}`} name={`${m.nome_municipio}/${m.uf}`}
                      fill={CORES_SLOT[i]} radius={[4, 4, 0, 0]} />
                  ) : null)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tabela comparativa ── */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Tabela Comparativa Detalhada</p>
              <p style={{ fontSize: 10, color: '#9CA3AF' }}>Verde = melhor nesta dimensão · Vermelho = pior</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left', borderBottom: '1px solid #E5E7EB', width: 180 }}>
                      Critério
                    </th>
                    {enriched.map((m, i) => m ? (
                      <th key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: CORES_SLOT[i], textAlign: 'center', borderBottom: '1px solid #E5E7EB', borderLeft: `2px solid ${CORES_SLOT[i]}30` }}>
                        {m.nome_municipio}/{m.uf}
                      </th>
                    ) : null)}
                  </tr>
                </thead>
                <tbody>
                  {/* Score geral */}
                  <tr style={{ background: '#F0F7F2' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#1B4332' }}>
                      <Star size={11} style={{ display: 'inline', marginRight: 5 }} />
                      Score Geral Combinado
                    </td>
                    {enriched.map((m, i) => m ? (
                      <td key={i} style={{ padding: '10px 14px', textAlign: 'center', borderLeft: `2px solid ${CORES_SLOT[i]}30` }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 40, height: 40, borderRadius: '50%',
                          border: `2.5px solid ${CORES_SLOT[i]}`,
                          fontSize: 14, fontWeight: 900, color: CORES_SLOT[i],
                          background: CORES_SLOT_LIGHT[i],
                        }}>
                          {scoreGeral(m)}
                        </div>
                      </td>
                    ) : null)}
                  </tr>

                  {LINHAS.map((linha, li) => {
                    const wins = vencedores(enriched, linha.key);
                    return (
                      <tr key={linha.key} style={{
                        background: li % 2 ? '#FAFAFA' : '#fff',
                        borderBottom: '1px solid #F3F4F6',
                      }}>
                        <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: linha.destaque ? 700 : 400, color: linha.destaque ? '#111827' : '#374151' }}>
                          {linha.destaque && <TrendingUp size={10} style={{ display: 'inline', marginRight: 4, color: '#2D6A4F' }} />}
                          {linha.label}
                        </td>
                        {enriched.map((m, i) => {
                          if (!m) return null;
                          const val = m[linha.key];
                          const isWinner = wins.includes(i);
                          const isLoser  = wins.length && !isWinner && linha.maior;
                          return (
                            <td key={i} style={{
                              padding: '9px 14px', textAlign: 'center',
                              borderLeft: `2px solid ${CORES_SLOT[i]}30`,
                              background: isWinner ? 'rgba(26,122,60,0.05)' : isLoser ? 'rgba(220,38,38,0.04)' : 'transparent',
                            }}>
                              <span style={{
                                fontSize: 12, fontWeight: linha.destaque ? 800 : 600,
                                color: linha.cor ? linha.cor(val) : (isWinner ? '#1A7A3C' : '#374151'),
                              }}>
                                {linha.fmt(val)}
                              </span>
                              {isWinner && <CheckCircle size={10} color="#1A7A3C" style={{ marginLeft: 4, display: 'inline' }} />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Resumo executivo ── */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6, color: '#D4A017' }} />
              Análise e Recomendação
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {enriched.map((m, i) => !m ? null : {
                i, m,
                pontos: [
                  m.score_aptidao >= 70 ? '✓ Aptidão ZARC confirmada' : m.score_aptidao >= 40 ? '⚠ Aptidão parcial' : '✗ Inapto ZARC',
                  m.dist && m.dist <= 300 ? '✓ Logística excelente' : m.dist && m.dist <= 600 ? '~ Logística razoável' : '⚠ Logística distante',
                  (m.lucro ?? 0) > 500 ? '✓ Lucrativo' : (m.lucro ?? 0) > 0 ? '~ Margem pequena' : '✗ Prejuízo estimado',
                  m.altitude && m.altitude >= 700 ? '✓ Altitude adequada' : '✗ Altitude insuficiente',
                ],
              }).filter(Boolean).map(({ i: idx, m, pontos }) => (
                <div key={idx} style={{
                  border: `1px solid ${CORES_SLOT[idx]}30`,
                  borderRadius: 10, padding: '14px 16px',
                  background: CORES_SLOT_LIGHT[idx],
                }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: CORES_SLOT[idx], marginBottom: 10 }}>
                    {idx === vencedor?.idx && <Trophy size={12} style={{ display: 'inline', marginRight: 5 }} />}
                    {m.nome_municipio} / {m.uf}
                  </p>
                  {pontos.map(p => (
                    <p key={p} style={{
                      fontSize: 11, marginBottom: 4,
                      color: p.startsWith('✓') ? '#1A7A3C' : p.startsWith('~') ? '#D4A017' : '#DC2626',
                      fontWeight: 500,
                    }}>{p}</p>
                  ))}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${CORES_SLOT[idx]}20` }}>
                    <p style={{ fontSize: 10, color: '#9CA3AF' }}>
                      Score geral: <strong style={{ color: CORES_SLOT[idx] }}>{scoreGeral(m)}/100</strong>
                      {idx === vencedor?.idx ? ' 🏆 Vencedor' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
