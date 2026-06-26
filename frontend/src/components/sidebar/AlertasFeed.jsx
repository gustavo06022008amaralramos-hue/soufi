import { AlertTriangle, CheckCircle, Info, Sprout } from 'lucide-react';

function gerarAlertas(municipio, calendario) {
  const alertas = [];
  const score   = municipio?.score_aptidao ?? 0;
  const geada   = municipio?.risco_geada_pct ?? 0;
  const colheita= municipio?.chuva_colheita_mm ?? 0;
  const tipo    = municipio?.tipo_solo_zarc;

  if (score >= 70) {
    alertas.push({ tipo: 'ok', icon: CheckCircle, cor: '#16a34a', titulo: 'Região com alta aptidão para cevada', desc: 'Parâmetros climáticos e pedológicos dentro das faixas ideais definidas pelo ZARC/EMBRAPA para cultivares de cevada de inverno.' });
  }
  if (geada >= 30) {
    alertas.push({ tipo: 'alerta', icon: AlertTriangle, cor: '#f59e0b', titulo: `Risco de geada no espigamento: ${geada}%`, desc: 'Julho e Agosto concentram probabilidade significativa de geadas. Recomenda-se ajuste da janela de plantio para antecipar ou postergar o espigamento.' });
  } else if (geada > 0) {
    alertas.push({ tipo: 'info', icon: Info, cor: '#06b6d4', titulo: `Baixo risco de geada: ${geada}%`, desc: 'Monitorar previsões de temperatura mínima em julho/agosto, especialmente em anos de La Niña.' });
  }
  if (colheita >= 250) {
    alertas.push({ tipo: 'alerta', icon: AlertTriangle, cor: '#ef4444', titulo: `Alto índice pluviométrico na colheita: ${colheita}mm`, desc: 'Volume médio de chuva em outubro/novembro acima de 250mm representa risco de germinação pré-colheita (GPH), prejudicando a qualidade malteável.' });
  }
  if (tipo === 3) {
    alertas.push({ tipo: 'info', icon: Sprout, cor: '#10b981', titulo: 'Solo Argiloso (Tipo 3 ZARC)', desc: 'Latossolos e Nitossolos típicos desta classificação favorecem a produção de cevada malteável com maior uniformidade de grãos.' });
  }
  if (tipo === 2) {
    alertas.push({ tipo: 'info', icon: Sprout, cor: '#f59e0b', titulo: 'Solo Textura Média (Tipo 2 ZARC)', desc: 'Recomenda-se calagem e adubação de base conforme análise. A disponibilidade hídrica pode ser fator limitante em veranicos.' });
  }
  if (tipo === 1 || tipo === null) {
    alertas.push({ tipo: 'alerta', icon: AlertTriangle, cor: '#ef4444', titulo: 'Solo Arenoso ou sem dados (Tipo 1/N.I.)', desc: 'Solos com baixo teor de argila apresentam restrições severas à cultura da cevada, especialmente quanto à retenção de umidade e nitrogênio.' });
  }

  // Janela de plantio
  const mesesAptos = calendario?.filter(c => c.apto_no_mes).map(c => c.mes) ?? [];
  if (mesesAptos.length > 0) {
    const nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    alertas.push({ tipo: 'info', icon: Info, cor: '#8b5cf6', titulo: 'Janela de plantio estimada', desc: `Meses com temperatura entre 10–22°C: ${mesesAptos.map(m => nomes[m]).join(', ')}. Consulte as portarias MAPA vigentes para confirmação da janela oficial.` });
  }

  return alertas;
}

export default function AlertasFeed({ municipio, calendario }) {
  const alertas = gerarAlertas(municipio, calendario);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Alertas e Recomendações Técnicas
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertas.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: `${a.cor}0d`, border: `1px solid ${a.cor}33`, borderRadius: 8 }}>
            <a.icon size={16} color={a.cor} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: a.cor, marginBottom: 3 }}>{a.titulo}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
