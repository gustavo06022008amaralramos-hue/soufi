import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target, ShieldCheck, Sparkles, Users, TrendingUp, CheckCircle2,
  ArrowRight, ArrowLeft, Rocket, Database, Wheat, Sprout, Leaf,
  MapPin, AlertTriangle, Quote, Handshake, Microscope, Building2,
  ChevronLeft, ChevronRight, Layers3, Clock,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

/* Guarapuava/PR — usado como município de demonstração ao vivo porque é
   onde temos o dado mais completo e já validado nesta sessão (clima diário
   real, ZARC das 3 culturas, cultivares reais). */
const MUNICIPIO_DEMO = { codigo_ibge: 4109401, nome: 'Guarapuava', uf: 'PR' };

const CULTURA_INFO = {
  cevada: { label: 'Cevada', cor: '#9c7a24', bg: '#f7edd4', icon: Sprout },
  trigo:  { label: 'Trigo',  cor: '#b3651f', bg: '#fbeadc', icon: Wheat },
  soja:   { label: 'Soja',   cor: '#3d6b31', bg: '#e8f0e4', icon: Leaf },
};

/* ── Bloco de fala — o script real, pra ler em voz alta na reunião ── */
function Fala({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 12, background: '#F9FAFB', border: '1px solid #E5E7EB',
      borderLeft: '3px solid #2D6A4F', borderRadius: 10, padding: '14px 18px',
      marginTop: 18,
    }}>
      <Quote size={16} color="#2D6A4F" style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, fontStyle: 'italic' }}>{children}</p>
    </div>
  );
}

function Kicker({ n, total, label, cor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{
        fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: cor,
        background: `${cor}15`, border: `1px solid ${cor}35`, borderRadius: 20, padding: '2px 10px',
      }}>{String(n).padStart(2, '0')} / {total}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

function StatBlock({ value, label, cor = '#1B4332' }) {
  return (
    <div>
      <p style={{ fontSize: 30, fontWeight: 800, color: cor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>{label}</p>
    </div>
  );
}

/* ── Slide: simulador ao vivo, dado real (mesmos endpoints do painel do
   município) — a demonstração central da apresentação. ── */
function SlideSimulador() {
  const [cultura, setCultura] = useState('cevada');
  const [data, setData] = useState('2026-06-15');
  const [gdd, setGdd] = useState(null);
  const [zarc, setZarc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/gdd/simulacao?codigo_ibge=${MUNICIPIO_DEMO.codigo_ibge}&data_semeio=${data}&cultura=${cultura}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/zarc/elegibilidade?codigo_ibge=${MUNICIPIO_DEMO.codigo_ibge}&data_plantio=${data}&cultura=${cultura}`).then(r => r.json()).catch(() => null),
    ]).then(([g, z]) => { setGdd(g); setZarc(z); }).finally(() => setLoading(false));
  }, [cultura, data]);

  const info = CULTURA_INFO[cultura];
  const grupos = {};
  (zarc?.resultados ?? []).forEach(r => {
    if (!grupos[r.grupo] || r.nivel_risco < grupos[r.grupo].nivel_risco) grupos[r.grupo] = r;
  });
  const melhores = Object.values(grupos).sort((a, b) => a.nivel_risco - b.nivel_risco);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {Object.entries(CULTURA_INFO).map(([k, c]) => (
          <button key={k} onClick={() => setCultura(k)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            border: cultura === k ? `1px solid ${c.cor}` : '1px solid #E5E7EB',
            background: cultura === k ? `${c.cor}15` : '#fff',
            color: cultura === k ? c.cor : '#6B7280', fontWeight: cultura === k ? 700 : 500, fontSize: 12,
          }}>
            <c.icon size={13} /> {c.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={13} color="#9CA3AF" />
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#374151' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* GDD real */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Clima real, dia a dia (NASA POWER)
          </p>
          {loading && <p style={{ fontSize: 12, color: '#9CA3AF' }}>Calculando...</p>}
          {!loading && gdd?.disponivel && (
            <div style={{ display: 'flex', gap: 16 }}>
              <StatBlock value={`${gdd.gdd_acumulado}`} label={`°D acumulados desde ${new Date(data+'T00:00:00').toLocaleDateString('pt-BR')} (Tb=${gdd.tb}°C)`} cor={info.cor} />
              <StatBlock value={gdd.dias_com_geada} label="dias com geada (Tmín≤4°C)" cor={gdd.dias_com_geada > 0 ? '#dc2626' : '#16a34a'} />
            </div>
          )}
          {!loading && gdd && !gdd.disponivel && (
            <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{gdd.motivo}</p>
          )}
        </div>

        {/* ZARC real */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Elegibilidade oficial (MAPA, Tábua de Risco)
          </p>
          {!loading && zarc?.elegivel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {melhores.map(g => (
                <div key={g.grupo} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', borderRadius: 7, padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', flex: 1 }}>{g.grupo}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                    background: g.nivel_risco === 20 ? '#f0fdf4' : g.nivel_risco === 30 ? '#fffbeb' : '#fef2f2',
                    color: g.nivel_risco === 20 ? '#16a34a' : g.nivel_risco === 30 ? '#d97706' : '#dc2626',
                  }}>risco {g.nivel_risco}%</span>
                </div>
              ))}
              <p style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>Portaria: {melhores[0]?.portaria}</p>
            </div>
          )}
          {!loading && zarc && !zarc.elegivel && (
            <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
              Sem indicação de plantio nessa data — troque a data acima pra ver a janela real de semeio.
            </p>
          )}
        </div>
      </div>

      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 10, textAlign: 'center' }}>
        {MUNICIPIO_DEMO.nome}/{MUNICIPIO_DEMO.uf} · IBGE {MUNICIPIO_DEMO.codigo_ibge} · dado ao vivo, direto da API — não é print.
      </p>
    </div>
  );
}

/* ── As 8 fases da apresentação — script real de ~12 minutos ── */
function useSlides(municipios) {
  return useMemo(() => {
    const total = municipios.length;
    const aptosCevada = municipios.filter(m => (m.score_aptidao ?? 0) >= 70).length;
    const aptosTrigo  = municipios.filter(m => (m.score_trigo  ?? 0) >= 70).length;
    const aptosSoja   = municipios.filter(m => (m.score_soja   ?? 0) >= 70).length;

    return [
      {
        id: 'abertura', kicker: 'Abertura', cor: '#1B4332', tempo: '~1 min',
        render: () => (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#86efac', letterSpacing: 2, marginBottom: 14 }}>
              COOPERATIVA AGRÁRIA · FAPA
            </p>
            <h1 style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 14 }}>SOUFII</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Sistema de Aptidão Agrícola — da pergunta <em>"onde plantar"</em> à resposta com dado real, município por município.
            </p>
          </div>
        ),
        fala: 'Bom dia a todos. Nos próximos doze minutos eu quero contar uma história em três partes: o desafio que vocês nos colocaram, o que construímos pra responder a ele, e pra onde isso pode ir daqui. E o mais importante: não vou mostrar print de tela — vou mostrar a própria plataforma, ao vivo, com dado real.',
        dark: true,
      },
      {
        id: 'desafio', kicker: 'O problema', cor: '#a34b3a', tempo: '~1,5 min',
        titulo: 'O desafio que vocês nos colocaram',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Onde no Brasil dá pra plantar cevada cervejeira com segurança agronômica — não por intuição ou "sempre plantamos aqui", mas com critério técnico auditável?',
              'Como escalar essa análise pro país inteiro, não só pra alguns municípios já conhecidos da Agrária?',
              'Como transformar isso numa ferramenta viva que ajuda a decidir — expansão, seguro, logística — em vez de um relatório que fica parado numa gaveta?',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px' }}>
                <Target size={16} color="#a34b3a" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        ),
        fala: 'O ponto de partida foi simples de enunciar e difícil de responder: onde no Brasil dá pra plantar cevada cervejeira com segurança agronômica de verdade? E mais — como transformar isso numa ferramenta viva que a Agrária e a FAPA pudessem realmente usar pra decidir expansão, não um PDF que ninguém abre de novo.',
      },
      {
        id: 'resposta', kicker: 'O que construímos', cor: '#2D6A4F', tempo: '~1,5 min',
        titulo: 'A resposta: SOUFII',
        render: () => (
          <div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 18 }}>
              Uma plataforma que cruza dado climático oficial, solo e zoneamento de risco do próprio Ministério da
              Agricultura — município por município, pro Brasil inteiro. Começou em cevada. Hoje já cobre trigo e soja também.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, background: '#F0F7F2', borderRadius: 12, padding: '18px 20px' }}>
              <StatBlock value={total.toLocaleString('pt-BR')} label="municípios mapeados — 100% do Brasil" />
              <StatBlock value="3" label="culturas: cevada, trigo, soja" cor="#b3651f" />
              <StatBlock value="24" label="cultivares reais catalogadas (5+6+13)" cor="#3d6b31" />
              <StatBlock value="3" label="maltarias de referência (não só 1)" cor="#0284c7" />
            </div>
          </div>
        ),
        fala: 'SOUFII cruza dado climático oficial, solo e zoneamento de risco do MAPA, município por município, pro Brasil inteiro. Cinco mil quinhentos e setenta e um municípios — cem por cento do país — hoje em três culturas: cevada, trigo e soja, com vinte e quatro cultivares reais catalogadas, ficha técnica completa.',
      },
      {
        id: 'rigor', kicker: 'Como foi calculado', cor: '#6b5b95', tempo: '~2,5 min',
        titulo: 'Por trás do número — e por que confiar nele',
        render: () => (
          <div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
              Cada score vem de critério real e citável — não de estimativa: temperatura e chuva de 32 anos de
              histórico (NASA POWER), textura de solo (SoilGrids/ISRIC), e risco por decêndio direto da Tábua de
              Risco oficial do MAPA. Mas o que mais importa não é nunca errar — é <strong>caçar e corrigir</strong>
              o erro antes de vocês verem:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: 'Achamos uma inversão real no critério de geada que fazia Minas Gerais parecer melhor que o Paraná — e corrigimos antes de publicar.', icon: AlertTriangle, cor: '#d97706' },
                { t: 'Uma cultivar ("Condessa") parecia fabricada numa primeira checagem — confirmamos como real só depois de achar a fonte primária certa, e mantivemos.', icon: Microscope, cor: '#0284c7' },
                { t: 'Um bug de concorrência real (WinError 10035) foi encontrado testando ao vivo e corrigido em toda a API, não só onde apareceu.', icon: ShieldCheck, cor: '#16a34a' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 14px' }}>
                  <r.icon size={15} color={r.cor} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>{r.t}</p>
                </div>
              ))}
            </div>
          </div>
        ),
        fala: 'Todo score vem de critério real: trinta e dois anos de clima da NASA, textura de solo do SoilGrids, e risco por decêndio direto da Tábua de Risco oficial do MAPA. Mas o que eu quero destacar não é que acertamos tudo de primeira — é que caçamos e corrigimos erro real antes de vocês verem. Achamos uma inversão que fazia Minas Gerais parecer melhor que o Paraná pra geada, e corrigimos. Isso é o tipo de rigor que sustenta confiar no número.',
      },
      {
        id: 'demo', kicker: 'Demonstração ao vivo', cor: '#1B4332', tempo: '~3 min',
        titulo: 'Vamos ver funcionando — ao vivo',
        render: () => <SlideSimulador />,
        fala: 'Deixa eu mostrar isso funcionando, não em print. Aqui em Guarapuava — escolhe uma cultura e uma data de semeio, e o sistema busca o clima real dia a dia e a elegibilidade oficial na hora. Se eu mudar pra soja, ou pra outra data, o número muda na hora, porque é cálculo real acontecendo agora, não uma tabela pré-pronta.',
      },
      {
        id: 'personas', kicker: 'O que isso resolve', cor: '#0284c7', tempo: '~1,5 min',
        titulo: 'O que isso representa pra cada um de vocês',
        render: () => (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { icon: Microscope, cor: '#6b5b95', label: 'Pesquisador FAPA', t: 'Todo número cita a fonte — Portaria, publicação Embrapa, ou dataset oficial. Dá pra auditar e usar como base de novas cultivares.' },
              { icon: Building2, cor: '#b3651f', label: 'Gerente Agrária', t: 'Oportunidade real de expansão de seguro e logística até as 3 maltarias — não só a sede — em qualquer município do país.' },
              { icon: Users, cor: '#3d6b31', label: 'Cooperado/produtor', t: 'Simulação da própria safra: quando semear, qual cultivar, qual o risco real de geada — antes de plantar, não depois.' },
            ].map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 16px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${p.cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <p.icon size={16} color={p.cor} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: p.cor, marginBottom: 6 }}>{p.label}</p>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{p.t}</p>
              </div>
            ))}
          </div>
        ),
        fala: 'Pra quem pesquisa, cada número cita a fonte — dá pra auditar. Pra quem gerencia a Agrária, é oportunidade real de expansão que hoje ninguém enxergava, porque só olhávamos distância até a sede. Pro cooperado, é saber quando semear e qual o risco real de geada antes de plantar, não depois da perda.',
      },
      {
        id: 'roadmap', kicker: 'Onde pode chegar', cor: '#b3651f', tempo: '~1 min',
        titulo: 'Isso é a base, não o teto',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { done: true,  t: 'ZARC oficial das 3 culturas, motor de graus-dia e simulador ao vivo' },
              { done: true,  t: 'Aptidão multicultura com critério próprio por cultura, não uma fórmula genérica' },
              { done: true,  t: 'Múltiplas maltarias, seguro real por município, dashboard multicultura' },
              { done: false, t: 'Histórico ano a ano de 32 anos de clima (hoje só a média está exposta)' },
              { done: false, t: 'Mapeamento de região Agrária ↔ município, pra época de semeadura por cultivar específica' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 14px' }}>
                <CheckCircle2 size={15} color={r.done ? '#16a34a' : '#D1D5DB'} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: r.done ? '#374151' : '#9CA3AF', lineHeight: 1.5 }}>{r.t}</p>
              </div>
            ))}
          </div>
        ),
        fala: 'O que vocês viram hoje já está no ar, testado, não é protótipo. E a lista do que vem depois já está desenhada — histórico de trinta e dois anos ano a ano, e o mapeamento de região da Agrária pra época de semeadura por cultivar específica. Isso é a base, não o teto.',
      },
      {
        id: 'fechamento', kicker: 'Fechamento', cor: '#1B4332', tempo: '~1 min',
        titulo: 'O que precisamos de vocês agora',
        render: () => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Validar com quem planta de verdade: os números batem com a experiência de campo de vocês?',
              'Nos ajudar a mapear a região Agrária pra cada município — hoje é o maior dado que falta.',
              'Decidir prioridade: histórico de 32 anos, mais cultivares, ou mais culturas primeiro?',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Handshake size={16} color="#2D6A4F" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        ),
        fala: 'Pra fechar: isso não é uma entrega de mão única. Precisamos que vocês validem se o número bate com a experiência de campo, nos ajudem a mapear a região Agrária por município — hoje é o maior buraco de dado que temos — e decidam com a gente a prioridade do próximo mês. Obrigado.',
      },
    ];
  }, [municipios]);
}

export default function PitchPage({ municipios = [] }) {
  const slides = useSlides(municipios);
  const [i, setI] = useState(0);
  const slide = slides[i];

  const proximo = useCallback(() => setI(v => Math.min(v + 1, slides.length - 1)), [slides.length]);
  const anterior = useCallback(() => setI(v => Math.max(v - 1, 0)), []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') proximo();
      if (e.key === 'ArrowLeft') anterior();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proximo, anterior]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>

      {/* Header fixo com progresso */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Rocket size={16} color="#1B4332" />
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332' }}>Pitch da Plataforma</h1>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>~12 min · {slides.length} atos</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {slides.map((s, idx) => (
            <button key={s.id} onClick={() => setI(idx)} title={s.titulo ?? s.kicker} style={{
              width: 22, height: 4, borderRadius: 2, border: 'none', cursor: 'pointer',
              background: idx === i ? s.cor : idx < i ? `${s.cor}70` : '#E5E7EB',
              transition: 'all 0.15s',
            }} />
          ))}
        </div>
      </div>

      {/* Slide */}
      <div style={{
        background: slide.dark ? 'linear-gradient(135deg,#0d3320,#1B4332)' : '#fff',
        border: '1px solid #E5E7EB', borderRadius: 16, padding: '28px 32px',
        minHeight: 380, display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Kicker n={i + 1} total={slides.length} label={slide.kicker} cor={slide.dark ? '#86efac' : slide.cor} />
          <span style={{ fontSize: 10, color: slide.dark ? 'rgba(255,255,255,0.5)' : '#9CA3AF', fontFamily: 'monospace' }}>{slide.tempo}</span>
        </div>
        {slide.titulo && (
          <h2 style={{ fontSize: 22, fontWeight: 800, color: slide.dark ? '#fff' : '#111827', marginBottom: 18, letterSpacing: -0.3 }}>
            {slide.titulo}
          </h2>
        )}
        <div style={{ flex: 1 }}>{slide.render()}</div>

        <div style={slide.dark ? { filter: 'brightness(1.4)' } : undefined}>
          <Fala>{slide.fala}</Fala>
        </div>
      </div>

      {/* Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button onClick={anterior} disabled={i === 0} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
          border: '1px solid #E5E7EB', background: '#fff', cursor: i === 0 ? 'default' : 'pointer',
          color: i === 0 ? '#D1D5DB' : '#374151', fontSize: 12, fontWeight: 600,
        }}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <p style={{ fontSize: 10, color: '#9CA3AF' }}>← → pra navegar</p>
        <button onClick={proximo} disabled={i === slides.length - 1} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
          border: 'none', background: i === slides.length - 1 ? '#E5E7EB' : '#1B4332',
          cursor: i === slides.length - 1 ? 'default' : 'pointer',
          color: i === slides.length - 1 ? '#9CA3AF' : '#fff', fontSize: 12, fontWeight: 700,
        }}>
          Próximo <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
