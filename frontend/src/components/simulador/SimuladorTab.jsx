import { useState, useMemo } from 'react';
import { BarChart3, RefreshCw, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import MapComponent      from '../map/MapComponent.jsx';
import CultivaresAgaria, { CULTIVARES } from './CultivaresAgaria.jsx';

const CRITERIOS_DEFAULT = {
  argila:          15,
  tempMin:         10,
  tempMax:         22,
  chuvaMin:        400,
  chuvaMax:        1200,
  altitude:        800,
  maxGeada:        30,
  maxChuvaColheita:250,
};

const CRITERIOS_EMBRAPA = { ...CRITERIOS_DEFAULT };

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function calcularScore(m, c) {
  const criterios = [
    (m.pct_argila ?? 0)                   >= c.argila,
    (m.temp_media_anual ?? 0)             >= c.tempMin && (m.temp_media_anual ?? 0) <= c.tempMax,
    (m.precipitacao_acumulada_anual ?? 0) >= c.chuvaMin && (m.precipitacao_acumulada_anual ?? 0) <= c.chuvaMax,
    (m.altitude ?? 0)                     >= c.altitude,
    (m.risco_geada_pct ?? 0)              <= c.maxGeada,
    (m.chuva_colheita_mm ?? 999)          <= c.maxChuvaColheita,
  ];
  return Math.round(criterios.filter(Boolean).length / criterios.length * 100);
}

export default function SimuladorTab({ municipios }) {
  const [criterios,      setCriterios]      = useState(CRITERIOS_DEFAULT);
  const [selecionado,    setSelecionado]    = useState(null);
  const [cultivarAtivo,  setCultivarAtivo]  = useState(null);

  const atualizar = (campo, valor) => { setCultivarAtivo(null); setCriterios(c => ({ ...c, [campo]: valor })); };
  const resetar   = () => { setCultivarAtivo(null); setCriterios(CRITERIOS_EMBRAPA); };

  const carregarCultivar = (key) => {
    setCultivarAtivo(key);
    setCriterios({ ...CRITERIOS_DEFAULT, ...CULTIVARES[key].zarc });
  };

  const municipiosComScore = useMemo(() => (
    municipios
      .filter(m => m.lat && m.lon)
      .map(m => ({ ...m, score_simulado: calcularScore(m, criterios) }))
  ), [municipios, criterios]);

  const aptos   = municipiosComScore.filter(m => m.score_simulado === 100);
  const parciais = municipiosComScore.filter(m => m.score_simulado > 0 && m.score_simulado < 100);
  const inaptos  = municipiosComScore.filter(m => m.score_simulado === 0);

  const distribuicao = [
    { faixa: '0–16',  total: municipiosComScore.filter(m => m.score_simulado <= 16).length, cor: '#6b7280' },
    { faixa: '17–33', total: municipiosComScore.filter(m => m.score_simulado > 16 && m.score_simulado <= 33).length, cor: '#ef4444' },
    { faixa: '34–49', total: municipiosComScore.filter(m => m.score_simulado > 33 && m.score_simulado <= 49).length, cor: '#f97316' },
    { faixa: '50–66', total: municipiosComScore.filter(m => m.score_simulado > 49 && m.score_simulado <= 66).length, cor: '#f59e0b' },
    { faixa: '67–82', total: municipiosComScore.filter(m => m.score_simulado > 66 && m.score_simulado <= 82).length, cor: '#84cc16' },
    { faixa: '83–100',total: municipiosComScore.filter(m => m.score_simulado > 82).length, cor: '#10b981' },
  ];

  const municipiosParaMapa = municipiosComScore.map(m => ({ ...m, score_aptidao: m.score_simulado }));

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>

      {/* Painel de controle */}
      <div style={{
        width: 300, flexShrink: 0,
        background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Simulador ZARC</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {cultivarAtivo
                ? <span style={{ color: CULTIVARES[cultivarAtivo].cor }}>Perfil: {CULTIVARES[cultivarAtivo].nome}</span>
                : 'Ajuste os critérios em tempo real'}
            </p>
          </div>
          <button onClick={resetar} title="Restaurar padrão EMBRAPA" style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border2)',
            borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
          }}>
            <RefreshCw size={12} />Reset
          </button>
        </div>

        {/* Botões de cultivar Agrária */}
        <CultivaresAgaria ativo={cultivarAtivo} onSelect={carregarCultivar} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <p style={{ fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Solo</p>
            <Slider label="Argila mínima"    value={criterios.argila}          min={0}  max={60}  unit="%" onChange={v => atualizar('argila', v)} />
          </div>

          <div>
            <p style={{ fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Temperatura</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Slider label="Mínima anual"  value={criterios.tempMin} min={0}  max={30} unit="°C" onChange={v => atualizar('tempMin', v)} />
              <Slider label="Máxima anual"  value={criterios.tempMax} min={10} max={40} unit="°C" onChange={v => atualizar('tempMax', v)} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Precipitação</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Slider label="Mínima anual"  value={criterios.chuvaMin} min={0}    max={1000} unit="mm" onChange={v => atualizar('chuvaMin', v)} />
              <Slider label="Máxima anual"  value={criterios.chuvaMax} min={500}  max={3000} unit="mm" onChange={v => atualizar('chuvaMax', v)} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Relevo &amp; Risco</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Slider label="Altitude mínima"         value={criterios.altitude}          min={0}   max={2000} unit="m"  onChange={v => atualizar('altitude', v)} />
              <Slider label="Tol. máx. geada Jul/Ago" value={criterios.maxGeada}          min={0}   max={100}  unit="%"  onChange={v => atualizar('maxGeada', v)} />
              <Slider label="Chuva máx. Out/Nov"      value={criterios.maxChuvaColheita}  min={50}  max={600}  unit="mm" onChange={v => atualizar('maxChuvaColheita', v)} />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{aptos.length.toLocaleString('pt-BR')}</p>
              <p style={{ fontSize: 10, color: 'var(--text-faint)' }}>Aptos (100%)</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{parciais.length.toLocaleString('pt-BR')}</p>
              <p style={{ fontSize: 10, color: 'var(--text-faint)' }}>Parciais</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>{inaptos.length.toLocaleString('pt-BR')}</p>
              <p style={{ fontSize: 10, color: 'var(--text-faint)' }}>Inaptos</p>
            </div>
          </div>

          {/* Distribuição */}
          <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>
              <BarChart3 size={10} style={{ display:'inline', marginRight:4 }} />Distribuição por score
            </p>
            <ResponsiveContainer width="100%" height={70}>
              <BarChart data={distribuicao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="faixa" tick={{ fontSize: 8, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card2)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="total" radius={[2,2,0,0]}>
                  {distribuicao.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mapa do simulador */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000,
          background: 'rgba(255,255,255,0.95)', border: `1px solid ${cultivarAtivo ? CULTIVARES[cultivarAtivo].cor + '60' : 'var(--border2)'}`,
          borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(8px)',
          fontSize: 11, color: 'var(--text-muted)',
          boxShadow: cultivarAtivo ? `0 0 20px ${CULTIVARES[cultivarAtivo].cor}25` : 'none',
          transition: 'all 0.3s',
        }}>
          {cultivarAtivo && (
            <p style={{ fontSize: 10, color: CULTIVARES[cultivarAtivo].cor, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {CULTIVARES[cultivarAtivo].nome} · {CULTIVARES[cultivarAtivo].ciclo}
            </p>
          )}
          <div>
            <CheckCircle size={11} color="#10b981" style={{ display:'inline', marginRight:5 }} />
            <strong style={{ color: 'var(--text-primary)' }}>{aptos.length.toLocaleString('pt-BR')}</strong>
            <span> municípios totalmente aptos</span>
          </div>
          {cultivarAtivo && aptos.length > 0 && (
            <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>
              {((aptos.length / municipiosComScore.length) * 100).toFixed(1)}% do território com coords mapeadas
            </p>
          )}
        </div>
        <MapComponent
          municipios={municipiosParaMapa}
          selecionado={selecionado}
          onSelect={setSelecionado}
          tipoMapa="dark"
          filtroScore={0}
        />
      </div>
    </div>
  );
}
