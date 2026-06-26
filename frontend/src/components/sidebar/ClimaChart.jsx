import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { CloudRain } from 'lucide-react';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border2)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
          {p.name.includes('Temp') ? '°C' : 'mm'}
        </p>
      ))}
    </div>
  );
};

export default function ClimaChart({ calendario }) {
  if (!calendario?.length) return null;

  const data = MESES.map((mes, i) => {
    const d = calendario.find(c => c.mes === i + 1) ?? {};
    return {
      mes,
      'Chuva (mm)':  +(d.precipitacao ?? 0).toFixed(1),
      'Temp Média':  +(d.temp_media   ?? 0).toFixed(1),
      'Temp Mínima': +(d.temp_min     ?? 0).toFixed(1),
    };
  });

  const semDados = data.every(d => d['Chuva (mm)'] === 0 && d['Temp Média'] === 0);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, boxShadow: 'var(--shadow)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Clima Histórico · NASA POWER (30 anos)
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.3)', borderRadius: 4, padding: '2px 6px', color: '#7c3aed', fontSize: 9, fontWeight: 600 }}>Jul/Ago = Geada</span>
          <span style={{ background: 'rgba(30,64,175,0.1)', border: '1px solid rgba(30,64,175,0.3)', borderRadius: 4, padding: '2px 6px', color: '#1e40af', fontSize: 9, fontWeight: 600 }}>Out/Nov = Colheita</span>
        </div>
      </div>

      {semDados ? (
        <div style={{
          height: 120, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--bg-card2)', borderRadius: 8, border: '1px dashed var(--border2)',
        }}>
          <CloudRain size={22} color="var(--text-faint)" />
          <p style={{ fontSize: 11, color: 'var(--text-faint)' }}>Dados climáticos mensais não disponíveis</p>
          <p style={{ fontSize: 10, color: 'var(--border3)' }}>Município ainda não re-processado pelo script atual</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" vertical={false} />

            <ReferenceArea x1="Jul" x2="Ago" fill="rgba(109,40,217,0.08)" strokeOpacity={0} />
            <ReferenceArea x1="Out" x2="Nov" fill="rgba(30,64,175,0.08)" strokeOpacity={0} />

            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="chuva" orientation="left"  tick={{ fontSize: 10, fill: '#0ea5e9' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="temp"  orientation="right" tick={{ fontSize: 10, fill: '#c57e15' }} axisLine={false} tickLine={false} />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26,107,66,0.05)' }} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, color: 'var(--text-muted)' }} />

            <Bar  yAxisId="chuva" dataKey="Chuva (mm)"  fill="#0ea5e9" fillOpacity={0.7} radius={[3,3,0,0]} />
            <Line yAxisId="temp"  dataKey="Temp Média"  stroke="#c57e15" strokeWidth={2} dot={false} />
            <Line yAxisId="temp"  dataKey="Temp Mínima" stroke="#1a6b42" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
