import { useState } from 'react';
import {
  BookOpen, Map, BarChart2, Truck, Leaf, CalendarDays,
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Mountain, Thermometer, CloudRain, Snowflake, Layers, Search,
  Star, Info, Target, TrendingUp, Award
} from 'lucide-react';

/* ── Paleta ── */
const VERDE = '#2D6A4F';
const VERDE_LIGHT = '#F0F7F2';

/* ── Seção expansível ── */
function Section({ icon: Icon, title, cor = VERDE, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', background: open ? `${cor}0d` : '#fff',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? `1px solid ${cor}25` : 'none',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={cor} />
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{title}</span>
        {open
          ? <ChevronDown size={15} color="#9CA3AF" />
          : <ChevronRight size={15} color="#9CA3AF" />}
      </button>
      {open && (
        <div style={{ padding: '16px 18px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Bloco de destaque ── */
function Destaque({ cor = VERDE, icon: Icon, title, children }) {
  return (
    <div style={{
      background: `${cor}0a`, border: `1px solid ${cor}30`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', gap: 10,
    }}>
      {Icon && <Icon size={14} color={cor} style={{ flexShrink: 0, marginTop: 2 }} />}
      <div>
        {title && <p style={{ fontSize: 11, fontWeight: 700, color: cor, marginBottom: 4 }}>{title}</p>}
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Critério row ── */
function CriterioRow({ icon: Icon, cor, label, faixa, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 12px', background: '#F9FAFB', borderRadius: 8,
    }}>
      <Icon size={14} color={cor} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: cor,
            background: `${cor}15`, borderRadius: 5, padding: '1px 7px',
          }}>{faixa}</span>
        </div>
        <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ── Score pill ── */
function ScorePill({ score, label, cor }) {
  return (
    <div style={{
      flex: 1, background: `${cor}0d`, border: `1.5px solid ${cor}35`,
      borderRadius: 10, padding: '10px 12px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 20, fontWeight: 800, color: cor, lineHeight: 1 }}>{score}</p>
      <p style={{ fontSize: 9, color: cor, fontWeight: 600, marginTop: 2 }}>{label}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export default function ManualPage() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '4px 0 40px' }}>

      {/* Cabeçalho */}
      <div style={{
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800 }}>Manual do Usuário — SOUFII</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
              Sistema de Suporte para Indicação de Municípios para Cevada Cervejeira
            </p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
          O SOUFII analisa <strong style={{ color: '#fff' }}>5.571 municípios brasileiros</strong> com base nos
          critérios técnicos do <strong style={{ color: '#fff' }}>ZARC/EMBRAPA</strong> para identificar as
          regiões mais aptas ao cultivo de cevada cervejeira para a Cooperativa Agrária.
        </p>
      </div>

      {/* 1. O que é o SOUFII */}
      <Section icon={Info} title="O que é o SOUFII?" defaultOpen={true}>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          O SOUFII é uma plataforma de inteligência agrícola que cruza dados climáticos históricos
          (30 anos de NASA POWER), pedológicos (SoilGrids ISRIC) e geográficos para calcular a
          aptidão de cada município ao cultivo de <strong>cevada cervejeira de inverno</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { icon: '🌍', label: '5.571', sub: 'Municípios analisados' },
            { icon: '📅', label: '30 anos', sub: 'Dados climáticos NASA' },
            { icon: '🎯', label: '6 critérios', sub: 'ZARC / EMBRAPA' },
          ].map(c => (
            <div key={c.label} style={{
              background: VERDE_LIGHT, borderRadius: 10, padding: '12px 10px', textAlign: 'center',
              border: '1px solid rgba(45,106,79,0.15)',
            }}>
              <p style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: VERDE }}>{c.label}</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>{c.sub}</p>
            </div>
          ))}
        </div>
        <Destaque icon={Target} title="Missão do sistema" cor={VERDE}>
          Identificar municípios com potencial para expansão da produção de cevada cervejeira,
          apoiando a Cooperativa Agrária na tomada de decisão sobre novos contratos de compra e
          programas de fomento.
        </Destaque>
      </Section>

      {/* 2. Como usar o mapa */}
      <Section icon={Map} title="Como usar o Mapa de Zoneamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '1', title: 'Navegue pelo mapa', desc: 'Use Ctrl + scroll para dar zoom. Clique e arraste para mover. O mapa cobre todo o Brasil.' },
            { n: '2', title: 'Clique em um município', desc: 'O painel lateral direito abre com a análise completa daquele município.' },
            { n: '3', title: 'Use a barra de busca', desc: 'Digite o nome do município ou a sigla do estado (ex: "Guarapuava" ou "PR"). Use as setas ↑↓ e Enter para navegar.' },
            { n: '4', title: 'Filtre por estado e classificação', desc: 'O painel esquerdo permite filtrar por UF, tipo de aptidão e score mínimo.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: VERDE, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>{s.n}</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Destaque icon={Search} title="Dica de busca" cor="#2563eb">
          A busca funciona por nome completo, sigla de UF ou código IBGE.
          Pressione <strong>Enter</strong> para ir direto ao município selecionado no mapa.
        </Destaque>
      </Section>

      {/* 3. Cores do mapa */}
      <Section icon={Layers} title="O que significam as cores no mapa?" cor="#374151">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { cor: '#1A7A3C', label: 'Verde — Apto', desc: 'Score ≥ 70. Atende a maioria dos critérios ZARC. Recomendado para contrato de compra.' },
            { cor: '#D4A017', label: 'Amarelo — Parcialmente Apto', desc: 'Score 40–69. Atende parte dos critérios. Pode ser viável com manejo específico.' },
            { cor: '#4A90C4', label: 'Azul — Inapto', desc: 'Score < 40. Não atende os critérios mínimos do ZARC. Cultivo de alto risco.' },
            { cor: '#D1D5DB', label: 'Cinza — Sem dados', desc: 'Município ainda não processado. A coleta de dados está em andamento.' },
          ].map(c => (
            <div key={c.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: c.cor, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 1 }}>{c.label}</p>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Score de aptidão */}
      <Section icon={Award} title="Como é calculado o Score de Aptidão?" cor="#d97706">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          O score vai de <strong>0 a 100</strong> e é calculado pela proporção de critérios ZARC atendidos:
        </p>
        <div style={{
          background: '#F9FAFB', borderRadius: 10, padding: '12px 16px',
          fontFamily: 'monospace', fontSize: 13, color: '#374151',
          border: '1px solid #E5E7EB',
        }}>
          Score = (critérios atendidos ÷ 6) × 100
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ScorePill score="100" label="Apto (score ≥ 70)" cor="#16a34a" />
          <ScorePill score="50"  label="Parc. Apto (40–69)" cor="#d97706" />
          <ScorePill score="17"  label="Inapto (< 40)" cor="#2563eb" />
        </div>
        <Destaque icon={Info} cor="#d97706" title="Exemplo prático">
          Município com temperatura ✓, precipitação ✓, altitude ✓, geada ✓, mas solo ✗ e chuva
          colheita ✗ → 4 critérios atendidos → Score = (4÷6)×100 = <strong>67 pontos → Parcialmente Apto</strong>
        </Destaque>
      </Section>

      {/* 5. Critérios ZARC */}
      <Section icon={CheckCircle} title="Os 6 Critérios ZARC / EMBRAPA" cor="#16a34a">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          Baseados no Zoneamento Agrícola de Risco Climático (ZARC) do MAPA/EMBRAPA para cevada cervejeira:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <CriterioRow icon={Thermometer} cor="#d97706" label="Temperatura média anual" faixa="10–22°C"
            desc="Temperatura fora dessa faixa compromete a formação do grão. Dados: NASA POWER 30 anos." />
          <CriterioRow icon={CloudRain} cor="#2563eb" label="Precipitação anual" faixa="400–2000mm"
            desc="Abaixo de 400mm exige irrigação. Acima de 2000mm aumenta doenças fúngicas." />
          <CriterioRow icon={Mountain} cor="#374151" label="Altitude" faixa="≥ 700m"
            desc="Altitudes maiores garantem temperaturas mais amenas no ciclo de inverno. Dados: Open-Meteo." />
          <CriterioRow icon={Snowflake} cor="#7c3aed" label="Risco de geada" faixa="< 30%"
            desc="Risco calculado como % de anos com T_mín ≤ 2°C em Jul/Ago (espigamento). Dado crítico." />
          <CriterioRow icon={Layers} cor="#92400e" label="Tipo de solo ZARC" faixa="Tipo 2 ou 3"
            desc="Tipo 3 (argiloso, >35% argila) e Tipo 2 (textura média, 15–35%). Tipo 1 (< 15%) é inapto pelo ZARC." />
          <CriterioRow icon={CloudRain} cor="#0e7490" label="Chuva na colheita" faixa="120–400mm"
            desc="Mínimo 120mm garante umidade para enchimento do grão. Acima de 400mm causa germinação pré-colheita (GPH) que inviabiliza a maltagem." />
        </div>
      </Section>

      {/* 6. Painel lateral */}
      <Section icon={BarChart2} title="Entendendo o painel lateral do município" cor="#7c3aed">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          Ao clicar em um município, o painel lateral tem 3 abas:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              tab: 'Aptidão', cor: '#16a34a',
              items: [
                'Score de 0–100 com classificação',
                'Todos os 6 critérios ZARC com o valor real medido',
                'Cultivares recomendadas para o município',
              ],
            },
            {
              tab: 'Logística', cor: '#d97706',
              items: [
                'Distância estimada até a Cooperativa Agrária (Entre Rios/PR)',
                'Preço líquido por saca após desconto do frete',
                'Simulador interativo de preço e taxa de frete',
              ],
            },
            {
              tab: 'Solo & Clima', cor: '#2563eb',
              items: [
                'Tipo de solo ZARC e percentual de argila (SoilGrids)',
                'Gráfico climático mensal: temperatura e precipitação',
                'Aptidão mensal (quais meses do ano têm condições favoráveis)',
              ],
            },
          ].map(s => (
            <div key={s.tab} style={{
              border: `1px solid ${s.cor}30`, borderRadius: 9,
              overflow: 'hidden',
            }}>
              <div style={{
                background: `${s.cor}10`, padding: '8px 12px',
                fontSize: 11, fontWeight: 700, color: s.cor,
              }}>
                Aba: {s.tab}
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <CheckCircle size={10} color={s.cor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Logística */}
      <Section icon={Truck} title="Como funciona o cálculo de logística?" cor="#d97706">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          O sistema estima o custo de frete do município até a <strong>Cooperativa Agrária</strong> (Entre Rios, Guarapuava/PR):
        </p>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', lineHeight: 2 }}>
            <p>Distância estimada = linha reta × 1,35 (fator rodoviário)</p>
            <p>Preço bruto (R$/ton) = preço da saca ÷ 60kg × 1000</p>
            <p>Frete estimado = distância × taxa de frete (R$/ton·km)</p>
            <p style={{ color: '#16a34a', fontWeight: 700 }}>Preço líquido = preço bruto − frete estimado</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { d: '≤ 300 km', label: 'Muito viável', cor: '#16a34a' },
            { d: '≤ 600 km', label: 'Viável', cor: '#65a30d' },
            { d: '≤ 900 km', label: 'Considerar', cor: '#d97706' },
            { d: '> 900 km', label: 'Distante', cor: '#dc2626' },
          ].map(v => (
            <div key={v.d} style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: `${v.cor}0a`, borderRadius: 8, padding: '8px 10px',
              border: `1px solid ${v.cor}25`,
            }}>
              <Truck size={11} color={v.cor} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: v.cor }}>{v.label}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>{v.d}</p>
              </div>
            </div>
          ))}
        </div>
        <Destaque icon={Info} cor="#d97706" title="Use os sliders para simular">
          Ajuste o preço da saca (R$/saca) e a taxa de frete (R$/ton·km) para ver o impacto
          no preço líquido em tempo real. Valores padrão: R$ 95/saca e R$ 0,32/ton·km.
        </Destaque>
      </Section>

      {/* 8. Calendário */}
      <Section icon={CalendarDays} title="Como interpretar o Calendário de Cultivo?" cor="#7c3aed">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          O calendário mostra as fases do ciclo de cevada cervejeira de inverno adaptado ao Sul do Brasil:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { fase: 'Semeio', cor: '#1A7A3C', meses: 'Jun–Jul', desc: 'Janela recomendada. Semeio tardio (Jul) reduz risco de geada no espigamento.' },
            { fase: 'Perfilhamento', cor: '#2196F3', meses: 'Jul–Ago', desc: 'Fase de desenvolvimento vegetativo. Temperatura ideal 10–18°C.' },
            { fase: 'Espigamento', cor: '#D4A017', meses: 'Ago–Set', desc: 'Fase crítica. Geada com T < 2°C pode causar dano irreversível à espiga.' },
            { fase: 'Maturação', cor: '#FF9800', meses: 'Set–Out', desc: 'Formação do grão. Clima seco favorece qualidade malteável.' },
            { fase: 'Colheita', cor: '#1d4ed8', meses: 'Out–Nov', desc: 'Chuva acima de 350mm neste período causa germinação pré-colheita (GPH).' },
          ].map(f => (
            <div key={f.fase} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 10px', background: '#F9FAFB', borderRadius: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: 2, background: f.cor,
                flexShrink: 0, marginTop: 4,
              }} />
              <div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{f.fase}</span>
                  <span style={{ fontSize: 10, color: f.cor, fontWeight: 600 }}>{f.meses}</span>
                </div>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Destaque icon={AlertTriangle} cor="#dc2626" title="Atenção: La Niña">
          Em anos de La Niña, o risco de geada no sul do Brasil aumenta significativamente.
          O SOUFII mostra o risco histórico médio — sempre consulte a previsão climática sazonal do INMET.
        </Destaque>
      </Section>

      {/* 9. Cultivares */}
      <Section icon={Leaf} title="Cultivares recomendadas" cor="#16a34a">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          As cultivares indicadas pelo SOUFII são desenvolvidas pela <strong>Cooperativa Agrária</strong> em
          parceria com a <strong>EMBRAPA Trigo</strong>, homologadas pelo MAPA e otimizadas para o Sul do Brasil:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              nome: 'BRS Princesa', tipo: 'Ciclo médio', cor: '#16a34a', para: 'Aptos',
              desc: 'Alta produtividade, tolerância a geada moderada. Janela: Jun–Jul. Ideal para altitude > 800m.',
              prod: '3,0–4,0 t/ha',
            },
            {
              nome: 'BRS Duquesa', tipo: 'Ciclo longo', cor: '#15803d', para: 'Aptos',
              desc: 'Excelente qualidade malteável, maior ciclo reduz riscos de GPH. Janela: Jun. Altitude > 700m.',
              prod: '2,8–3,8 t/ha',
            },
            {
              nome: 'BRS Cauê', tipo: 'Tardio / resistente', cor: '#d97706', para: 'Parc. Aptos',
              desc: 'Tolerante a geada leve, ciclo tardio (semeio Jul). Indicado onde geada < 30%.',
              prod: '2,5–3,5 t/ha',
            },
            {
              nome: 'BRS Elis', tipo: 'Adaptada / tolerante', cor: '#d97706', para: 'Parc. Aptos',
              desc: 'Maior plasticidade de altitude (500–800m). Aceita solo Tipo 2. Janela ampla: Mai–Jul.',
              prod: '2,3–3,2 t/ha',
            },
          ].map(cv => (
            <div key={cv.nome} style={{
              border: `1px solid ${cv.cor}30`, borderRadius: 10, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', background: `${cv.cor}0a`,
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: cv.cor }}>{cv.nome}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 8 }}>{cv.tipo}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: cv.cor,
                    background: `${cv.cor}15`, borderRadius: 5, padding: '2px 7px',
                  }}>{cv.para}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{cv.prod}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, padding: '8px 12px' }}>{cv.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 10. Fontes de dados */}
      <Section icon={Star} title="Fontes dos dados" cor="#374151">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { fonte: 'NASA POWER', desc: 'Temperatura (T2M, T2M_MIN) e precipitação mensal 1993–2023 para cada município.', url: 'power.larc.nasa.gov' },
            { fonte: 'SoilGrids ISRIC v2', desc: 'Percentual de argila por camada de solo (0–5cm, 5–15cm, 15–30cm) — média ponderada.', url: 'soilgrids.org' },
            { fonte: 'Open-Meteo Geocoder', desc: 'Coordenadas geográficas dos municípios com validação por caixa delimitadora da UF.', url: 'open-meteo.com' },
            { fonte: 'IBGE', desc: 'Lista oficial de 5.571 municípios brasileiros com código IBGE, nome e UF.', url: 'ibge.gov.br' },
            { fonte: 'ZARC / MAPA', desc: 'Critérios técnicos de aptidão climática para cevada cervejeira. Portaria MAPA 2024.', url: 'mapa.gov.br' },
          ].map(f => (
            <div key={f.fonte} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 10px', background: '#F9FAFB', borderRadius: 8,
              border: '1px solid #E5E7EB',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: VERDE,
                flexShrink: 0, marginTop: 4,
              }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 1 }}>{f.fonte}</p>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Destaque icon={Info} cor={VERDE} title="Atualização dos dados">
          Os dados climáticos são a média de 30 anos (1993–2023). A coleta para todos os 5.571
          municípios está em andamento — municípios cinzas no mapa ainda não foram processados.
        </Destaque>
      </Section>

      {/* Rodapé */}
      <div style={{
        textAlign: 'center', padding: '20px 0', marginTop: 8,
        borderTop: '1px solid #E5E7EB',
      }}>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          SOUFII · Cooperativa Agrária · FAPA · EMBRAPA Trigo · UNICENTRO
        </p>
        <p style={{ fontSize: 10, color: '#D1D5DB', marginTop: 4 }}>
          Dados para fins de pesquisa e planejamento agrícola
        </p>
      </div>
    </div>
  );
}
