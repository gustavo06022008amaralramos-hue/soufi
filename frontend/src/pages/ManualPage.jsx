import { useState } from 'react';
import {
  BookOpen, Map, BarChart2, Truck, Leaf, CalendarDays,
  CheckCircle, AlertTriangle, ChevronDown, ChevronRight,
  Mountain, Thermometer, CloudRain, Snowflake, Layers, Search,
  Star, Info, Target, TrendingUp, Award, Calculator,
  GitCompare, Wallet, ListOrdered, ShieldCheck, Wand2, Plus,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
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

/* ── Bloco de fórmula (monoespaçado) ── */
function Formula({ children }) {
  return (
    <div style={{
      background: '#F9FAFB', borderRadius: 10, padding: '12px 16px',
      fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace', fontSize: 12, color: '#374151',
      border: '1px solid #E5E7EB', lineHeight: 1.9, whiteSpace: 'pre-wrap',
    }}>
      {children}
    </div>
  );
}

/* ── Sub-bloco de cálculo (dentro da seção "Cálculos") ── */
function Calculo({ titulo, usadoEm, children }) {
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{titulo}</p>
        {usadoEm && (
          <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 20, padding: '2px 9px' }}>
            usado em: {usadoEm}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
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

      <Destaque icon={Info} cor={VERDE} title="Como usar este manual">
        As primeiras seções explicam cada tela do sistema. A seção <strong>"Cálculos — como cada número é obtido"</strong>,
        mais abaixo, reúne numa página só todas as fórmulas, médias e fontes usadas no app — é a seção pra abrir
        quando alguém perguntar "de onde veio esse número".
      </Destaque>

      {/* 1. O que é o SOUFII */}
      <Section icon={Info} title="O que é o SOUFII?" defaultOpen={true}>
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          O SOUFII é uma plataforma de inteligência agrícola que cruza dados climáticos históricos
          (32 anos de NASA POWER), pedológicos (SoilGrids ISRIC) e geográficos para calcular a
          aptidão de cada município ao cultivo de <strong>cevada cervejeira de inverno</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { icon: '🌍', label: '5.571', sub: 'Municípios analisados' },
            { icon: '📅', label: '32 anos', sub: 'Dados climáticos NASA (1993–2024)' },
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
        <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
          Telas disponíveis no menu: <strong>Dashboard</strong> (visão geral), <strong>Zoneamento</strong> (mapa),
          <strong> Históricos</strong> (estatísticas), <strong>Custos &amp; ROI</strong>, <strong>Comparador</strong>,
          <strong> Variedades</strong>, <strong>Notícias</strong>, <strong>Parceiros</strong>,
          <strong> Oportunidades</strong> e este <strong>Manual</strong>.
        </p>
      </Section>

      {/* 2. Como usar o mapa */}
      <Section icon={Map} title="Como usar o Mapa de Zoneamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '1', title: 'Navegue pelo mapa', desc: 'Use Ctrl + scroll para dar zoom. Clique e arraste para mover. O mapa cobre todo o Brasil.' },
            { n: '2', title: 'Clique em um município', desc: 'O painel lateral direito abre com a análise completa daquele município, em 4 abas.' },
            { n: '3', title: 'Use a barra de busca', desc: 'Digite o nome do município ou a sigla do estado (ex: "Guarapuava" ou "PR"). Use as setas ↑↓ e Enter para navegar.' },
            { n: '4', title: 'Filtre por estado, classe e score', desc: 'O painel esquerdo permite filtrar por UF, classificação ZARC (Apto/Parcial/Inapto) e score mínimo.' },
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
            { cor: '#1A7A3C', label: 'Verde — Apto', desc: 'Score ≥ 70. Atende bem os critérios ZARC. Recomendado para contrato de compra.' },
            { cor: '#D4A017', label: 'Amarelo — Parcialmente Apto', desc: 'Score 40–69. Atende parte dos critérios. Pode ser viável com manejo específico.' },
            { cor: '#4A90C4', label: 'Azul — Inapto', desc: 'Score < 40. Não atende os critérios mínimos do ZARC. Cultivo de alto risco.' },
            { cor: '#D1D5DB', label: 'Cinza — Sem dados', desc: 'Município ainda não processado (não deve haver nenhum, a coleta está 100% completa).' },
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
        <Destaque icon={AlertTriangle} cor="#dc2626" title="Regra regional — Nordeste e litoral nunca são Apto">
          Municípios do Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE) e municípios litorâneos diretos
          (lista oficial do IBGE, "Municípios defrontantes com o mar") nunca aparecem como Apto (verde),
          mesmo que a média climática pareça favorável — decisão explícita porque a produção real de
          cevada cervejeira no Brasil é praticamente toda em PR/SC/RS, e o proxy de score por média anual
          não captura bem regiões sem inverno real. Detalhes na seção Cálculos, mais abaixo.
        </Destaque>
      </Section>

      {/* 4. Score de aptidão */}
      <Section icon={Award} title="Como é calculado o Score de Aptidão?" cor="#d97706">
        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          O sistema guarda <strong>dois</strong> scores por município — o mapa e a maioria das telas usam o
          score binário (mais simples, histórico); o painel do município já mostra a versão graduada
          (mais fiel) critério a critério. Os dois vão de 0 a 100.
        </p>
        <Formula>{`score_aptidao (binário, legado):
  Score = (critérios atendidos ÷ 6) × 100
  → cada critério só conta 0 ou 1, sem meio-termo

score_ponderado (graduado, mais recente):
  Score = Σ (peso do critério × nota do critério 0–1) × 100
  → cada critério ganha uma nota entre 0 e 1 por proximidade
    do ideal (ver tabela completa na seção Cálculos)`}</Formula>
        <div style={{ display: 'flex', gap: 8 }}>
          <ScorePill score="100" label="Apto (score ≥ 70)" cor="#16a34a" />
          <ScorePill score="50"  label="Parc. Apto (40–69)" cor="#d97706" />
          <ScorePill score="17"  label="Inapto (< 40)" cor="#2563eb" />
        </div>
        <Destaque icon={Info} cor="#d97706" title="Exemplo prático (score binário)">
          Município com temperatura ✓, precipitação ✓, altitude ✓, geada ✓, mas solo ✗ e chuva
          colheita ✗ → 4 critérios atendidos → Score = (4÷6)×100 = <strong>67 pontos → Parcialmente Apto</strong>
        </Destaque>
      </Section>

      {/* 5. Critérios ZARC */}
      <Section icon={CheckCircle} title="Os 6 Critérios ZARC / EMBRAPA" cor="#16a34a">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          Baseados no Zoneamento Agrícola de Risco Climático (ZARC) do MAPA/EMBRAPA para cevada cervejeira.
          As faixas abaixo são a faixa <strong>ideal</strong> (nota máxima no score graduado); fora dela ainda
          existe uma zona de tolerância que dá nota parcial — ver detalhes na seção Cálculos.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <CriterioRow icon={Thermometer} cor="#d97706" label="Temperatura média anual" faixa="10–22°C (peso 25%)"
            desc="Temperatura fora dessa faixa compromete a formação do grão. Tolerância de 3°C além do limite. Dados: NASA POWER, média de 32 anos." />
          <CriterioRow icon={CloudRain} cor="#2563eb" label="Precipitação anual" faixa="700–1400mm ideal (peso 15%)"
            desc="Faixa ótima pra cevada malteira; tolerância de 300mm além do limite (400–1700mm ainda dá nota parcial). Abaixo de 400mm exige irrigação." />
          <CriterioRow icon={Mountain} cor="#374151" label="Altitude" faixa="≥ 700m (peso 15%)"
            desc="Nota máxima a partir de 700m; rampa de nota parcial entre 500–700m. Altitudes maiores garantem temperaturas mais amenas no inverno." />
          <CriterioRow icon={Snowflake} cor="#7c3aed" label="Risco de geada" faixa="0% ideal, tolerância até 30% (peso 15%)"
            desc="Não é um corte binário — a nota decai de forma contínua entre 0% e 30% de risco. Calculado como % de anos com T_mín baixa em Jul/Ago (espigamento)." />
          <CriterioRow icon={Layers} cor="#92400e" label="Tipo de solo ZARC" faixa="≥35% argila = nota máxima (peso 20%)"
            desc="Nota = %argila ÷ 35, limitada a 1.0. Tipo 3 (argiloso, >35%) e Tipo 2 (textura média, 15–35%) são os aceitos pelo ZARC; Tipo 1 (<15%) não é recomendado." />
          <CriterioRow icon={CloudRain} cor="#0e7490" label="Chuva na colheita" faixa="≤120mm ideal, tolerância até 400mm (peso 10%)"
            desc="Nota máxima até 120mm, decaindo até zero em 400mm. Chuva na colheita causa germinação pré-colheita (GPH), que inviabiliza a maltagem." />
        </div>
      </Section>

      {/* 6. Painel lateral */}
      <Section icon={BarChart2} title="Entendendo o painel do município" cor="#7c3aed">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
          Ao clicar em um município no mapa, o painel lateral direito tem 4 abas:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              tab: 'Aptidão', cor: '#16a34a',
              items: [
                'Score de 0–100 com classificação (Apto / Parc. Apto / Inapto)',
                'Os 6 critérios ZARC com o valor real medido e nota graduada',
                'Cultivares recomendadas para o município',
              ],
            },
            {
              tab: 'Seguro', cor: '#7c3aed',
              items: [
                'Se o estado do município tem portaria ZARC/MAPA publicada pra cevada (elegibilidade a PROAGRO/PSR)',
                'Hoje a checagem é só a nível de estado — a portaria completa por município ainda não está integrada',
                'Link direto pro Painel de Indicação de Riscos oficial do MAPA',
              ],
            },
            {
              tab: 'Logística', cor: '#d97706',
              items: [
                'Distância estimada até a Cooperativa Agrária (Entre Rios, Guarapuava/PR)',
                'Preço líquido por saca após desconto do frete',
                'Simulador interativo de preço da saca e taxa de frete',
              ],
            },
            {
              tab: 'Solo & Clima', cor: '#2563eb',
              items: [
                'Tipo de solo ZARC e percentual de argila (SoilGrids)',
                'Gráfico climático mensal: temperatura e precipitação (média de 32 anos)',
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

      {/* 7. Custos & ROI */}
      <Section icon={Calculator} title="Custos & ROI — a calculadora financeira" cor="#0284c7">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          Simula o retorno financeiro do cultivo, com 4 abas: <strong>Resultado</strong> (lucro, ROI, margem),
          <strong> Cenários</strong> (pessimista/esperado/otimista), <strong>Financiamento</strong> (linhas de crédito
          rural reais) e <strong>Comparativo</strong> (lucro médio entre estados).
        </p>
        <Destaque icon={AlertTriangle} cor="#d97706" title="O que é estimativa">
          Os custos de produção por hectare (sementes, fertilizantes, defensivos, mecanização, secagem)
          são <strong>estimativa interna nossa</strong> — não existe tabela pública oficial de custo de produção
          específica pra cevada cervejeira. As taxas de crédito rural (Pronaf, Pronamp, BNDES) são reais,
          do Plano Safra 2025/2026.
        </Destaque>
      </Section>

      {/* 8. Comparador */}
      <Section icon={GitCompare} title="Comparador de Municípios" cor="#0284c7">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          Compare até 3 municípios lado a lado: radar de 8 dimensões, tabela detalhada com 15 critérios
          e um card de "Melhor Município".
        </p>
        <Destaque icon={Info} cor="#0284c7" title="Como o “melhor município” é escolhido">
          Não é a média das 8 dimensões do radar — é o município que <strong>venceu em mais critérios</strong> na
          tabela comparativa (13 dos 15 critérios têm uma direção clara de "melhor"; os outros 2, temperatura
          e precipitação média, não têm porque não são "quanto mais/menos melhor"). Isso evita recomendar um
          município que ganha só na média geral mas perde em quase tudo que importa na prática — como ZARC,
          distância e ROI.
        </Destaque>
      </Section>

      {/* 9. Oportunidades */}
      <Section icon={TrendingUp} title="Oportunidades de Expansão" cor="#1B4332">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          Pensa do ponto de vista de decisão de negócio, cruzando aptidão ZARC, logística, seguro e
          viabilidade econômica num único índice de prioridade. Tem 5 abas:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: ListOrdered, cor: '#1B4332', tab: 'Ranking', desc: 'Municípios ordenados por Prioridade (score combinado) — ver fórmula na seção Cálculos.' },
            { icon: Map, cor: '#2563eb', tab: 'Mapa de Cobertura', desc: 'A mesma classificação, em mapa.' },
            { icon: Wallet, cor: '#d97706', tab: 'Break-even', desc: 'Quanto cada município precisa produzir pra cobrir o custo.' },
            { icon: CalendarDays, cor: '#7c3aed', tab: 'Manejos', desc: 'Cultivar indicada e janela de semeio pros municípios mais bem ranqueados — com busca por nome.' },
            { icon: ShieldCheck, cor: '#7c3aed', tab: 'Expansão de Seguro', desc: 'Municípios aptos sem PSR/PROAGRO ativo, priorizando quem faz fronteira (≤100km) com área já segurada.' },
          ].map(t => (
            <div key={t.tab} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#F9FAFB', borderRadius: 8, padding: '8px 10px' }}>
              <t.icon size={13} color={t.cor} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a' }}>{t.tab}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}> — {t.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <Destaque icon={Info} cor={VERDE} title="Os cards do topo e a aba Expansão de Seguro seguem o filtro de Estado">
          Ao filtrar por um estado específico no topo da página, os 4 cards (Aptos ZARC, Oport. de Seguro,
          Logística Viável, Prioridade 1) e a tabela de Expansão de Seguro recalculam só pra esse estado.
        </Destaque>
      </Section>

      {/* 10. Logística */}
      <Section icon={Truck} title="Como funciona o cálculo de logística?" cor="#d97706">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          O sistema estima o custo de frete do município até a <strong>Cooperativa Agrária</strong> (Entre Rios, Guarapuava/PR):
        </p>
        <Formula>{`Distância estimada = distância em linha reta × 1,35 (fator rodoviário)
Preço bruto (R$/ton) = preço da saca ÷ 60kg × 1000
Frete estimado = distância × taxa de frete (R$/ton·km)
Preço líquido = preço bruto − frete estimado`}</Formula>
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

      {/* 11. Calendário */}
      <Section icon={CalendarDays} title="Como interpretar o Calendário de Cultivo?" cor="#7c3aed">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          O calendário mostra as fases do ciclo de cevada cervejeira de inverno adaptado ao Sul do Brasil:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { fase: 'Semeio', cor: '#1A7A3C', meses: 'Jun–Jul', desc: 'Janela recomendada. Semeio tardio (Jul) reduz risco de geada no espigamento.' },
            { fase: 'Perfilhamento', cor: '#2196F3', meses: 'Jul–Ago', desc: 'Fase de desenvolvimento vegetativo. Temperatura ideal 10–18°C.' },
            { fase: 'Espigamento', cor: '#D4A017', meses: 'Ago–Set', desc: 'Fase crítica. Geada nessa fase pode causar dano irreversível à espiga.' },
            { fase: 'Maturação', cor: '#FF9800', meses: 'Set–Out', desc: 'Formação do grão. Clima seco favorece qualidade malteável.' },
            { fase: 'Colheita', cor: '#1d4ed8', meses: 'Out–Nov', desc: 'Chuva acima do padrão nesse período causa germinação pré-colheita (GPH).' },
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

      {/* 12. Cultivares */}
      <Section icon={Leaf} title="Variedades — catálogo de cultivares" cor="#16a34a">
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          Cultivares indicadas pela Portaria SPA/MAPA ZARC do Paraná nº 358/2024 e pelas
          "Indicações Técnicas para a Produção de Cevada Cervejeira — safras 2025 e 2026"
          (Embrapa Trigo, 2025). Nem todas são da Embrapa — Princesa e Duquesa são cultivares
          próprias da Cooperativa Agrária, Imperatriz é da FAPA:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { nome: 'Princesa', tipo: 'Agrária · Grupo II', cor: '#16a34a', desc: '80 dias até espigamento, 122 dias até maturação. Altura 70cm. Resistente a ferrugem, moderadamente resistente a mancha-reticular.' },
            { nome: 'Duquesa', tipo: 'Agrária · Grupo II', cor: '#15803d', desc: '77 dias até espigamento, 120 dias até maturação — a mais precoce do portfólio. Altura 72cm. Resistente a ferrugem, suscetível a giberela.' },
            { nome: 'Imperatriz', tipo: 'FAPA · Grupo II', cor: '#0891b2', desc: '82 dias até espigamento, 127 dias até maturação. Altura 73cm. Moderadamente resistente à maioria das doenças foliares.' },
            { nome: 'BRS Cauê', tipo: 'Embrapa · Grupo II', cor: '#d97706', desc: '90 dias até espigamento, 132 dias até maturação. Porte baixo (72cm, genes de nanismo) reduz acamamento. Altamente suscetível a oídio.' },
          ].map(cv => (
            <div key={cv.nome} style={{ border: `1px solid ${cv.cor}30`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: `${cv.cor}0a` }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: cv.cor }}>{cv.nome}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 8 }}>{cv.tipo}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, padding: '8px 12px' }}>{cv.desc}</p>
            </div>
          ))}
        </div>
        <Destaque icon={AlertTriangle} cor="#d97706" title="Por que não tem cultivares de Grupo I ou Grupo III?">
          O catálogo oficial que verificamos (Portaria SPA/MAPA + Embrapa Trigo 2025) só documenta
          cultivares de <strong>Grupo II</strong> pra cevada cervejeira — não encontramos fonte confiável de
          Grupo I (ciclo precoce) ou Grupo III (ciclo tardio), então preferimos deixar vazio a inventar dado.
        </Destaque>
        <Destaque icon={Plus} cor={VERDE} title="Cadastro próprio de cultivares (novo)">
          Na tela Variedades, o botão <strong>"Cadastrar cultivar"</strong> permite registrar uma cultivar que a
          FAPA/Agrária conhece mas que ainda não está no catálogo verificado — nome, obtentor, grupo, ciclo,
          zonas indicadas e reação a doenças. Fica salvo só no navegador de quem cadastrou, sempre marcado
          como <strong>"cadastro próprio"</strong> (nunca se mistura com o catálogo oficial), e já entra no
          cálculo do recomendador de cultivares.
        </Destaque>
        <Destaque icon={Wand2} cor="#1B4332" title="Recomendador de cultivares">
          Informe as condições do município (e, opcionalmente, o estado) — a recomendação prioriza,
          nessa ordem: (1) cultivares com <strong>zona indicada</strong> documentada pro estado escolhido,
          (2) entre essas, o <strong>ciclo mais curto</strong> primeiro, que reduz a janela de exposição quando
          o risco de geada informado é alto. Não existe fonte oficial com faixa climática diferente por
          cultivar, então esse não é um critério usado pra diferenciar.
        </Destaque>
        <Destaque icon={Calculator} cor="#0284c7" title="Calculadora de densidade de semeadura">
          <Formula>{`Kg de semente/ha = (Densidade[plantas/m²] × PMG[g/1000 sementes]) ÷ Poder germinativo[%]`}</Formula>
          Fórmula agronômica padrão de taxa de semeadura para cereais de inverno. Com os valores padrão
          (250 plantas/m², PMG 45g, poder germinativo 85%) dá 132,4 kg/ha — dentro da faixa real de
          referência (100–150 kg/ha).
        </Destaque>
      </Section>

      {/* 13. CÁLCULOS — seção central pedida */}
      <Section icon={Calculator} title="Cálculos — como cada número é obtido" cor="#dc2626" defaultOpen={false}>
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
          Esta seção reúne, num único lugar, todas as fórmulas do sistema — o que é dado real medido,
          o que é fórmula agronômica padrão, e o que é <strong>estimativa nossa</strong> (sinalizado como tal).
          Pense nela como a "caixa branca" do SOUFII.
        </p>

        <Calculo titulo="1. Score de aptidão graduado (score_ponderado)" usadoEm="painel do município, backend">
          <p style={{ fontSize: 11, color: '#6B7280' }}>Cada critério vira uma nota de 0.0 a 1.0 por proximidade do ideal, multiplicada pelo peso agronômico do critério:</p>
          <Formula>{`Pesos:  solo 20% · temperatura 25% · chuva 15% · altitude 15% · geada 15% · colheita 10%
Score = Σ (peso × nota) × 100, arredondado

Temperatura — "platô": nota 1.0 entre 10–22°C, decai linear até 0 em 7°C ou 25°C (tolerância 3°C)
Chuva       — "platô": nota 1.0 entre 700–1400mm, decai linear até 0 em 400mm ou 1700mm (tol. 300mm)
Altitude    — "rampa alta": nota 1.0 a partir de 700m, decai linear até 0 em 500m (tolerância 200m)
Geada       — "rampa baixa": nota 1.0 em 0%, decai linear até 0 em 30% de risco
Solo        — nota = %argila ÷ 35, limitada a 1.0 (35%+ argila = Tipo 3 = nota máxima)
Colheita    — "rampa baixa": nota 1.0 até 120mm, decai linear até 0 em 400mm (tolerância 280mm)`}</Formula>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>Fonte do código: calcular_score_ponderado.py — testado com 19 casos automatizados (pytest).</p>
        </Calculo>

        <Calculo titulo="2. Score de aptidão binário (score_aptidao)" usadoEm="mapa, dashboard, comparador, oportunidades">
          <p style={{ fontSize: 11, color: '#6B7280' }}>Versão mais antiga e simples: cada um dos 6 critérios conta 1 ponto se atendido, 0 se não — sem meio-termo.</p>
          <Formula>{`Score = (nº de critérios atendidos ÷ 6) × 100`}</Formula>
        </Calculo>

        <Calculo titulo="3. Regra regional — Nordeste e litoral nunca são Apto" usadoEm="score_aptidao e score_ponderado, todas as telas">
          <p style={{ fontSize: 11, color: '#6B7280' }}>
            Independente do resultado das fórmulas acima, municípios do Nordeste (AL, BA, CE, MA, PB, PE,
            PI, RN, SE) ou litorâneos diretos (lista oficial IBGE "Municípios defrontantes com o mar",
            279 municípios, casada por código IBGE) têm o score limitado a no máximo 65 pontos — nunca
            passam de "Parcialmente Apto".
          </p>
          <Destaque icon={AlertTriangle} cor="#d97706" title="Por quê">
            O critério de geada premia risco de geada baixo — mas cevada é cultivo de inverno, então baixo
            risco de geada geralmente significa "essa região não tem inverno de verdade". Isso fazia o
            proxy simplificado (média climática anual) classificar como aptas cidades litorâneas e
            nordestinas sem tradição real de cultivo. A produção comercial de cevada cervejeira no Brasil
            é, na prática, quase toda concentrada em PR/SC/RS.
          </Destaque>
        </Calculo>

        <Calculo titulo="4. Logística e frete" usadoEm="painel do município, oportunidades, comparador">
          <Formula>{`Distância rodovia (km) = distância em linha reta (haversine) × 1,35
Preço bruto (R$/ton)  = (preço da saca ÷ 60kg) × 1000
Frete (R$/ton)        = distância × taxa de frete (padrão R$0,32/ton·km)
Preço líquido (R$/ton)= preço bruto − frete
Preço líquido (R$/sc) = preço líquido × 60 ÷ 1000`}</Formula>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>
            Destino fixo: sede real da Cooperativa Agrária em Entre Rios, Guarapuava/PR (-25,5630, -51,4898).
            O fator 1,35 aproxima a distância rodoviária real a partir da distância em linha reta.
          </p>
        </Calculo>

        <Calculo titulo="5. Custos & ROI — viabilidade econômica" usadoEm="tela Custos & ROI, Oportunidades, Comparador">
          <Formula>{`Custo total/ha = sementes + fertilizantes + defensivos + mecanização + secagem (+ frete/ha)
Receita/ha     = (produtividade[t/ha] × 1000 ÷ 60) × preço líquido da saca
Lucro/ha       = Receita/ha − Custo total/ha
ROI (%)        = (Lucro/ha ÷ Custo total/ha) × 100
Preço de equilíbrio (R$/sc) = Custo total/ha ÷ sacas/ha
Produtividade de equilíbrio  = Custo total/ha × 60 ÷ (preço da saca × 1000)`}</Formula>
          <Destaque icon={AlertTriangle} cor="#d97706" title="O que é estimativa aqui">
            Os valores de custo por hectare (sementes, fertilizante, defensivos, mecanização, secagem) e
            produtividade esperada por estado são <strong>estimativa interna ajustável</strong> — não existe
            tabela pública de custo de produção específica pra cevada cervejeira. As taxas de crédito
            (Pronaf 3% a.a., Pronamp/BNDES 8,5–14% a.a.) são reais, do Plano Safra 2025/2026.
          </Destaque>
        </Calculo>

        <Calculo titulo="6. Prioridade de expansão (score combinado)" usadoEm="Oportunidades — aba Ranking">
          <Formula>{`Prioridade = 0,45 × Score ZARC
           + 0,30 × Score Logística (100 se ≤150km, 85 se ≤300km, 65 se ≤500km, 40 se ≤700km, senão 15)
           + 0,15 × Score Seguro (30 se já tem PSR/PROAGRO; 85 se apto mas sem seguro ainda; 0 se inapto)
           + 0,10 × min(ROI, 100) — só se ROI positivo

Filtros rígidos, aplicados depois:
  Score ZARC < 40           → Prioridade = 0 (inapto pra cevada, não importa o resto)
  Geada > 40% e ZARC < 70   → Prioridade × 0,60 (penaliza risco alto de geada)`}</Formula>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>
            O componente de Seguro dá nota mais alta pra município apto <strong>sem</strong> seguro ainda —
            de propósito, porque essa tela é sobre onde vale a pena <em>expandir</em> cobertura, não sobre
            quem já está coberto.
          </p>
        </Calculo>

        <Calculo titulo="7. Comparador — critério de “melhor município”" usadoEm="tela Comparador">
          <p style={{ fontSize: 11, color: '#6B7280' }}>
            Conta quantos dos 13 critérios comparáveis (de 15 no total — 2 não têm direção de "melhor")
            cada município venceu na tabela. Vence quem tiver mais critérios em verde — não uma média
            sintética das 8 dimensões do radar.
          </p>
        </Calculo>

        <Calculo titulo="8. Calculadora de densidade de semeadura" usadoEm="tela Variedades">
          <Formula>{`Kg de semente/ha = (Densidade[plantas/m²] × PMG[g/1000 sementes]) ÷ Poder germinativo[%]`}</Formula>
        </Calculo>

        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Fontes usadas nos cálculos acima</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['NASA POWER', 'Temperatura e precipitação mensal, 1993–2024 (32 anos), por município.'],
              ['SoilGrids ISRIC v2', 'Percentual de argila por camada de solo — média ponderada.'],
              ['IBGE', 'Lista oficial de 5.571 municípios e a lista de "Municípios defrontantes com o mar" (litorâneos diretos).'],
              ['Portaria SPA/MAPA nº 358/2024 (PR) + Embrapa Trigo (2025)', 'Cultivares, ciclo e critérios ZARC de cevada cervejeira.'],
              ['Plano Safra 2025/2026 (MDA / BNDES)', 'Taxas reais de crédito rural.'],
            ].map(([f, d]) => (
              <div key={f} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ fontWeight: 700, color: '#374151', flexShrink: 0 }}>{f}:</span>
                <span style={{ color: '#6B7280' }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 14. Fontes de dados */}
      <Section icon={Star} title="Fontes dos dados" cor="#374151">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { fonte: 'NASA POWER', desc: 'Temperatura (T2M, T2M_MIN) e precipitação mensal 1993–2024 para cada município.', url: 'power.larc.nasa.gov' },
            { fonte: 'SoilGrids ISRIC v2', desc: 'Percentual de argila por camada de solo (0–5cm, 5–15cm, 15–30cm) — média ponderada.', url: 'soilgrids.org' },
            { fonte: 'Open-Meteo Geocoder', desc: 'Coordenadas geográficas dos municípios com validação por caixa delimitadora da UF.', url: 'open-meteo.com' },
            { fonte: 'IBGE', desc: 'Lista oficial de 5.571 municípios brasileiros e lista de municípios litorâneos diretos.', url: 'ibge.gov.br' },
            { fonte: 'ZARC / MAPA', desc: 'Critérios técnicos de aptidão climática e portarias de zoneamento para cevada cervejeira.', url: 'gov.br/agricultura' },
            { fonte: 'Embrapa Trigo (2025)', desc: 'Indicações Técnicas para a Produção de Cevada Cervejeira — cultivares, ciclo e reação a doenças.', url: 'embrapa.br' },
            { fonte: 'Plano Safra 2025/2026', desc: 'Taxas de crédito rural (Pronaf, Pronamp, BNDES).', url: 'gov.br/agricultura' },
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
          Os dados climáticos são a média de 32 anos (1993–2024). A coleta para os 5.571
          municípios brasileiros está completa.
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
