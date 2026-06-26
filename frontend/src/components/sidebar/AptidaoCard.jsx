import { PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, CheckCircle, XCircle } from 'lucide-react';

const NIVEIS = [
  { min: 83, label: 'Aptidão Máxima',   cor: '#16a34a', bg: 'rgba(22,163,74,0.07)',  border: 'rgba(22,163,74,0.2)'  },
  { min: 70, label: 'Aptidão Alta',      cor: '#65a30d', bg: 'rgba(101,163,13,0.07)', border: 'rgba(101,163,13,0.2)' },
  { min: 50, label: 'Aptidão Moderada',  cor: '#c57e15', bg: 'rgba(197,126,21,0.07)', border: 'rgba(197,126,21,0.2)' },
  { min: 33, label: 'Risco Elevado',     cor: '#ea6c0a', bg: 'rgba(234,108,10,0.07)', border: 'rgba(234,108,10,0.2)' },
  { min: 0,  label: 'Inapto',            cor: '#cc2828', bg: 'rgba(204,40,40,0.07)',  border: 'rgba(204,40,40,0.2)'  },
];

const CRITERIOS = [
  { nome: 'Solo ZARC',      key: 'tipo_solo_zarc',               fn: v => v != null && v >= 2   },
  { nome: 'Temperatura',    key: 'temp_media_anual',             fn: v => v >= 10 && v <= 22    },
  { nome: 'Precipitação',   key: 'precipitacao_acumulada_anual', fn: v => v >= 400 && v <= 1200 },
  { nome: 'Altitude',       key: 'altitude',                     fn: v => v > 800               },
  { nome: 'Risco de Geada', key: 'risco_geada_pct',              fn: v => v != null && v < 30   },
  { nome: 'Chuva Colheita', key: 'chuva_colheita_mm',           fn: v => v != null && v < 250  },
];

function getNivel(score) {
  return NIVEIS.find(n => score >= n.min) ?? NIVEIS[NIVEIS.length - 1];
}

export default function AptidaoCard({ municipio }) {
  const score = municipio?.score_aptidao ?? 0;
  const nivel = getNivel(score);

  const criteriosStatus = CRITERIOS.map(c => ({
    nome: c.nome,
    apto: c.fn(municipio?.[c.key] ?? (c.key === 'chuva_colheita_mm' ? null : 0)),
    semDados: municipio?.[c.key] == null,
  }));
  const aprovados = criteriosStatus.filter(c => c.apto).length;

  return (
    <div className="card fade-up" style={{ background: nivel.bg, borderColor: nivel.border, padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={13} color={nivel.cor} />
          <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Score ZARC / EMBRAPA
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: `${nivel.cor}20`, color: nivel.cor, border: `1px solid ${nivel.cor}40`,
        }}>
          {aprovados}/6 critérios
        </span>
      </div>

      {/* Gauge + Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        {/* Gauge semicircular */}
        <div style={{ position: 'relative', width: 120, height: 70, flexShrink: 0 }}>
          <PieChart width={120} height={70}>
            <Pie
              data={[{ value: score }, { value: 100 - score }]}
              cx={60} cy={66} startAngle={180} endAngle={0}
              innerRadius={42} outerRadius={56}
              dataKey="value" strokeWidth={0}
            >
              <Cell fill={nivel.cor} />
              <Cell fill="var(--border2)" />
            </Pie>
          </PieChart>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: nivel.cor, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>/100</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: nivel.cor, marginBottom: 4 }}>{nivel.label}</p>
          <p style={{ fontSize: 10, color: 'var(--text-faint)', lineHeight: 1.4 }}>
            Score ≥ 70 = Apto · ≥ 83 = Máxima aptidão
          </p>
        </div>
      </div>

      {/* Critérios — layout em lista vertical compacta */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5px 10px',
        background: `${nivel.cor}08`,
        borderRadius: 8, padding: '10px 12px',
        border: `1px solid ${nivel.cor}20`,
      }}>
        {criteriosStatus.map(c => (
          <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {c.apto
              ? <CheckCircle size={11} color="#16a34a" style={{ flexShrink: 0 }} />
              : <XCircle    size={11} color={c.semDados ? 'var(--border3)' : '#cc2828'} style={{ flexShrink: 0 }} />}
            <span style={{
              fontSize: 10, lineHeight: 1.3, flexShrink: 1, minWidth: 0,
              color: c.apto ? 'var(--text-primary)' : c.semDados ? 'var(--text-faint)' : 'var(--text-muted)',
              fontWeight: c.apto ? 600 : 400,
            }}>
              {c.nome}
              {c.semDados && !c.apto && <span style={{ color: 'var(--border3)', fontSize: 9 }}> (s/d)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
