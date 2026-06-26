import { FlaskConical, Droplets, Wheat, Zap } from 'lucide-react';

// PIQ = Padrão Industrial de Qualidade (parâmetros malteiros para cevada cervejeira)

function indicador(valor, limiteOk, limiteCritico, unidade, inverso = false) {
  if (valor == null) return 'indisponível';
  const status = inverso
    ? (valor <= limiteOk ? 'ok' : valor <= limiteCritico ? 'atencao' : 'critico')
    : (valor >= limiteOk ? 'ok' : valor >= limiteCritico ? 'atencao' : 'critico');
  return { valor, status, unidade };
}

function StatusDot({ status }) {
  const cor = status === 'ok' ? '#10b981' : status === 'atencao' ? '#f59e0b' : '#ef4444';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: cor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 5px ${cor}88` }} />;
}

export default function PIQCard({ municipio, calendario }) {
  const geada    = municipio?.risco_geada_pct    ?? null;
  const colheita = municipio?.chuva_colheita_mm   ?? null;
  const temp     = municipio?.temp_media_anual    ?? null;
  const tipo     = municipio?.tipo_solo_zarc      ?? null;
  const argila   = municipio?.pct_argila          ?? null;

  // Estimativas de impacto PIQ baseadas nos dados climáticos e pedológicos
  const alertas = [];

  // 1. Germinação do grão — afetada por chuva na colheita
  if (colheita != null) {
    if (colheita >= 250) {
      alertas.push({
        icon: Droplets,
        titulo: 'Risco de queda no Poder Germinativo (PG)',
        detalhe: `Chuva média de ${colheita}mm em Out/Nov pode induzir germinação pré-colheita (GPH), reduzindo o PG abaixo de 95% exigido pela indústria malteira.`,
        status: colheita >= 350 ? 'critico' : 'atencao',
        indicador: `${colheita}mm Out/Nov`,
      });
    } else {
      alertas.push({
        icon: Droplets,
        titulo: 'Poder Germinativo: baixo risco de GPH',
        detalhe: `Volume de ${colheita}mm em Out/Nov está dentro do limite seguro (< 250mm) para manutenção do PG ≥ 95%.`,
        status: 'ok',
        indicador: `${colheita}mm Out/Nov`,
      });
    }
  }

  // 2. Teor de proteína — afetado pela temperatura média
  if (temp != null) {
    if (temp > 21) {
      alertas.push({
        icon: FlaskConical,
        titulo: 'Risco de proteína elevada no grão',
        detalhe: `Temperatura média de ${temp.toFixed(1)}°C pode elevar o teor de proteína acima de 13%, reduzindo o rendimento de extrato e aumentando a turbidez da cerveja.`,
        status: 'atencao',
        indicador: `${temp.toFixed(1)}°C anual`,
      });
    } else if (temp >= 10) {
      alertas.push({
        icon: FlaskConical,
        titulo: 'Proteína bruta: faixa ideal',
        detalhe: `Temperatura média de ${temp.toFixed(1)}°C favorece proteína entre 9–13%, dentro da faixa de qualidade malteira exigida pela Agrária.`,
        status: 'ok',
        indicador: `${temp.toFixed(1)}°C anual`,
      });
    }
  }

  // 3. Calibragem do grão (> 2,5mm) — afetada por solo e altitude
  if (tipo != null) {
    if (tipo >= 3) {
      alertas.push({
        icon: Wheat,
        titulo: 'Calibragem ≥ 2,5mm: solo favorável',
        detalhe: 'Solo argiloso (Tipo 3 ZARC) com boa retenção hídrica favorece grãos uniformes e calibragem acima de 85%, padrão exigido para malte industrial.',
        status: 'ok',
        indicador: `Solo Tipo ${tipo} (${argila ?? '—'}% argila)`,
      });
    } else if (tipo === 2) {
      alertas.push({
        icon: Wheat,
        titulo: 'Calibragem: manejo necessário',
        detalhe: 'Solo de textura média (Tipo 2). Com adubação nitrogenada ajustada, é possível atingir calibragem ≥ 85%. Monitorar disponibilidade hídrica em veranicos.',
        status: 'atencao',
        indicador: `Solo Tipo ${tipo} (${argila ?? '—'}% argila)`,
      });
    } else {
      alertas.push({
        icon: Wheat,
        titulo: 'Risco de calibragem abaixo do padrão',
        detalhe: 'Solo arenoso (Tipo 1) com baixa retenção de nutrientes. Alta probabilidade de grãos finos (< 2,5mm), inviabilizando aproveitamento para malte.',
        status: 'critico',
        indicador: `Solo Tipo ${tipo ?? 'N.I.'} (${argila ?? '—'}% argila)`,
      });
    }
  }

  // 4. Risco de geada no espigamento — afeta rendimento de extrato
  if (geada != null && geada >= 20) {
    alertas.push({
      icon: Zap,
      titulo: 'Geada no espigamento: risco ao extrato',
      detalhe: `${geada}% de probabilidade de geada em Jul/Ago. Danos no espigamento reduzem o teor de amido, impactando diretamente o rendimento de extrato (alvo: ≥ 78%).`,
      status: geada >= 40 ? 'critico' : 'atencao',
      indicador: `${geada}% de risco`,
    });
  }

  if (alertas.length === 0) return null;

  const corStatus = { ok: '#10b981', atencao: '#f59e0b', critico: '#ef4444' };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FlaskConical size={14} color="var(--cyan)" />
        <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Padrão Industrial de Qualidade (PIQ)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alertas.map((a, i) => {
          const Icon = a.icon;
          const cor  = corStatus[a.status];
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 12px',
              background: `${cor}0a`, border: `1px solid ${cor}30`, borderRadius: 8,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Icon size={14} color={cor} />
                <StatusDot status={a.status} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: cor, lineHeight: 1.3 }}>{a.titulo}</p>
                  <span style={{ fontSize: 9, color: cor, background: `${cor}15`, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {a.indicador}
                  </span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.detalhe}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
