import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { Download, Info } from 'lucide-react';

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

/* ─── Layout helpers ──────────────────────────────────────────── */
const TICK = { fontSize: 10, fill: '#9CA3AF' };

function Card({ title, subtitle, action, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 10, color: '#9CA3AF' }}>{subtitle}</p>}
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
      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
      background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 7,
      cursor: 'pointer', fontSize: 11, color: '#6B7280', flexShrink: 0,
    }}>
      <Download size={11} /> CSV
    </button>
  );
}

function KpiCard({ label, val, cor }) {
  return (
    <div style={{ background: '#F9FAFB', borderRadius: 9, padding: '12px 14px' }}>
      <p style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: cor }}>{val}</p>
    </div>
  );
}

/* ══ COMPONENTE PRINCIPAL ══════════════════════════════════════
   Nota: uma versão anterior desta página exibia gráficos de
   preço/câmbio, sinistros e produção nacional 2015-2024 "atribuídos"
   a CEPEA/MAPA/BACEN — os números eram inventados, não vinham
   dessas fontes. Removidos em 2026-08. Esta página agora mostra
   apenas estatísticas reais, calculadas a partir da própria base de
   dados do SOUFII (coleta NASA POWER/SoilGrids/IBGE, 5.571 municípios).
   ═══════════════════════════════════════════════════════════════ */
export default function HistoricosPage({ municipios = [] }) {
  const temDados = municipios.length > 0;

  const distribUF = useMemo(() => gerarDistribuicaoUF(municipios), [municipios]);

  const dadosScore = useMemo(() => {
    const faixas = [
      { faixa: '83–100', label: 'Excelente',  count: 0, cor: '#16a34a' },
      { faixa: '70–82',  label: 'Apto',       count: 0, cor: '#65a30d' },
      { faixa: '50–69',  label: 'Marginal',   count: 0, cor: '#ca8a04' },
      { faixa: '33–49',  label: 'Risco',      count: 0, cor: '#ea6c0a' },
      { faixa: '0–32',   label: 'Inapto',     count: 0, cor: '#94a3b8' },
    ];
    municipios.forEach(m => {
      const s = m.score_aptidao ?? 0;
      if      (s >= 83) faixas[0].count++;
      else if (s >= 70) faixas[1].count++;
      else if (s >= 50) faixas[2].count++;
      else if (s >= 33) faixas[3].count++;
      else              faixas[4].count++;
    });
    return faixas;
  }, [municipios]);

  const dadosSolo = useMemo(() => {
    const tipos = [
      { tipo: 'Tipo 1 — Arenoso',      count: 0, cor: '#ef4444' },
      { tipo: 'Tipo 2 — Textura Média', count: 0, cor: '#f59e0b' },
      { tipo: 'Tipo 3 — Argiloso',      count: 0, cor: '#10b981' },
      { tipo: 'Sem dado',               count: 0, cor: '#d1d5db' },
    ];
    municipios.forEach(m => {
      if (m.tipo_solo_zarc === 1) tipos[0].count++;
      else if (m.tipo_solo_zarc === 2) tipos[1].count++;
      else if (m.tipo_solo_zarc === 3) tipos[2].count++;
      else tipos[3].count++;
    });
    return tipos;
  }, [municipios]);

  const kpis = useMemo(() => {
    if (!temDados) return null;
    const aptos    = municipios.filter(m => (m.score_aptidao ?? 0) >= 70).length;
    const parciais = municipios.filter(m => (m.score_aptidao ?? 0) >= 40 && (m.score_aptidao ?? 0) < 70).length;
    const scores   = municipios.map(m => m.score_aptidao).filter(s => s != null);
    const scoreMedio = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const estados = new Set(municipios.filter(m => (m.score_aptidao ?? 0) >= 70).map(m => m.uf)).size;
    return { total: municipios.length, aptos, parciais, scoreMedio, estados };
  }, [municipios, temDados]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 6, height: 26, borderRadius: 4, background: 'linear-gradient(180deg,#16a34a,#0284c7)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>Estatísticas da Base SOUFII</h1>
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 16 }}>
            Calculado a partir dos {temDados ? municipios.length.toLocaleString('pt-BR') : '5.571'} municípios processados — NASA POWER, SoilGrids, IBGE
          </p>
        </div>
      </div>

      {!temDados ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <p>Carregando dados da base...</p>
        </div>
      ) : (
        <>
          {/* KPIs reais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
            <KpiCard label="Municípios processados" val={kpis.total.toLocaleString('pt-BR')} cor="#374151" />
            <KpiCard label="Aptos (score ≥70)"       val={kpis.aptos.toLocaleString('pt-BR')} cor="#1A7A3C" />
            <KpiCard label="Parcialmente aptos"       val={kpis.parciais.toLocaleString('pt-BR')} cor="#D4A017" />
            <KpiCard label="Score médio"              val={kpis.scoreMedio} cor="#0284c7" />
            <KpiCard label="Estados com aptos"        val={kpis.estados} cor="#7c3aed" />
          </div>

          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Info size={12} color="#7c3aed" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 10, color: '#4c1d95', lineHeight: 1.6 }}>
              Estas estatísticas descrevem apenas a base de dados agronômica do SOUFII (aptidão climática/solo por
              município). Não incluem preço de mercado, câmbio, sinistralidade de seguro ou produção nacional —
              essas séries exigem fonte externa verificada (CEPEA/MAPA/BACEN/CONAB) e ainda não foram integradas.
            </p>
          </div>

          {/* Distribuição de score + solo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
            <Card title="Distribuição de Score de Aptidão" subtitle="Todos os municípios processados"
              action={<CsvBtn data={dadosScore} nome="distribuicao-score" />}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosScore} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="faixa" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v, n, { payload }) => [v, payload.label]} />
                  <Bar dataKey="count" name="Municípios" radius={[3, 3, 0, 0]}>
                    {dadosScore.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Solo ZARC" subtitle="Classificação por teor de argila (SoilGrids)">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dadosSolo} dataKey="count" nameKey="tipo" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {dadosSolo.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {dadosSolo.map(d => (
                  <div key={d.tipo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.cor, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#6B7280', flex: 1 }}>{d.tipo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{d.count.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Distribuição por UF */}
          <Card
            title="Municípios Aptos por Estado (score ≥ 70)"
            subtitle="Top 12 estados por número de municípios aptos"
            action={<CsvBtn data={distribUF} nome="aptos-por-uf" />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distribUF} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="uf" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v, n) => [v, n === 'total' ? 'Total' : 'Aptos ≥70']} />
                <Bar dataKey="total" name="Total"     fill="rgba(2,132,199,0.18)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="aptos" name="Aptos ≥70" fill="#16a34a"              radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
