import { useState } from 'react';
import { ExternalLink, Newspaper, Search } from 'lucide-react';

// Links para fontes primárias reais — não fabrica manchetes/dados atribuídos
// a essas organizações. (Uma versão anterior desta página continha ~12
// notícias fictícias com datas e estatísticas inventadas; removida em 2026-08
// por não ter lastro em publicações reais.)
const CATEGORIAS = ['Todas', 'Zoneamento', 'Pesquisa', 'Cultivares', 'Seguro Rural'];

const FONTES = [
  { id: 1, nome: 'Programa Nacional de Zoneamento Agrícola de Risco Climático (ZARC)', orgao: 'MAPA', categoria: 'Zoneamento', desc: 'Portarias oficiais de zoneamento para cevada por estado, safra vigente. Fonte primária para elegibilidade PROAGRO/PSR.', url: 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico', img: '📋' },
  { id: 2, nome: 'Embrapa Trigo', orgao: 'Embrapa', categoria: 'Pesquisa', desc: 'Instituto responsável pela pesquisa nacional de cevada cervejeira (Passo Fundo/RS) — publica as Indicações Técnicas bienais para a cultura.', url: 'https://www.embrapa.br/trigo', img: '🌾' },
  { id: 3, nome: 'FAPA — Fundação Agrária de Pesquisa Agropecuária', orgao: 'Agrária', categoria: 'Cultivares', desc: 'Braço de pesquisa e melhoramento genético da Cooperativa Agrária, em Guarapuava/PR — desenvolve cultivares próprias (Princesa, Duquesa, Fandaga).', url: 'https://www.agraria.com.br/sementes/fapa', img: '🏛️' },
  { id: 4, nome: 'Epagri', orgao: 'Governo de SC', categoria: 'Pesquisa', desc: 'Empresa de Pesquisa Agropecuária e Extensão Rural de Santa Catarina.', url: 'https://www.epagri.sc.gov.br/', img: '🔬' },
  { id: 5, nome: 'IDR-Paraná', orgao: 'Governo do PR', categoria: 'Pesquisa', desc: 'Instituto de Desenvolvimento Rural do Paraná — assistência técnica e extensão rural.', url: 'https://www.idrparana.pr.gov.br/', img: '📡' },
  { id: 6, nome: 'EPAMIG', orgao: 'Governo de MG', categoria: 'Pesquisa', desc: 'Empresa de Pesquisa Agropecuária de Minas Gerais.', url: 'https://www.epamig.br', img: '🧪' },
  { id: 7, nome: 'Painel de Indicação de Riscos (ZARC)', orgao: 'MAPA', categoria: 'Seguro Rural', desc: 'Ferramenta oficial para consultar elegibilidade PROAGRO/PSR por município, cultivar e classe de solo.', url: 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/painel-de-indicacao-de-riscos-1', img: '🛡️' },
];

const BADGE_CORES = {
  Zoneamento:   { bg: 'rgba(6,182,212,0.1)',   cor: '#06b6d4' },
  Pesquisa:     { bg: 'rgba(139,92,246,0.1)',  cor: '#8b5cf6' },
  Cultivares:   { bg: 'rgba(16,185,129,0.1)',  cor: '#10b981' },
  'Seguro Rural':{ bg: 'rgba(245,158,11,0.1)', cor: '#f59e0b' },
};

function FonteCard({ n }) {
  const badge = BADGE_CORES[n.categoria] ?? { bg: 'rgba(100,100,100,0.1)', cor: '#888' };
  return (
    <a href={n.url} target="_blank" rel="noopener noreferrer" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14,
      transition: 'border-color 0.2s', textDecoration: 'none',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border3)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: 'var(--bg-card2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 24,
      }}>
        {n.img}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: badge.bg, color: badge.cor, border: `1px solid ${badge.cor}40`,
          }}>{n.categoria}</span>
          <span style={{ fontSize: 9, color: 'var(--cyan)', background: 'rgba(6,182,212,0.08)', padding: '2px 6px', borderRadius: 4 }}>{n.orgao}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
          {n.nome}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.55 }}>
          {n.desc}
        </p>
      </div>
      <ExternalLink size={13} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 2 }} />
    </a>
  );
}

export default function NoticiasPage() {
  const [categoria, setCategoria] = useState('Todas');
  const [busca, setBusca]         = useState('');

  const filtradas = FONTES.filter(n => {
    const matchCat = categoria === 'Todas' || n.categoria === categoria;
    const matchBusca = !busca || n.nome.toLowerCase().includes(busca.toLowerCase()) ||
      n.desc.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Fontes de Pesquisa</h1>
        <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Organizações oficiais de zoneamento, pesquisa e melhoramento genético de cevada cervejeira</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="var(--text-faint)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar fonte..."
            style={{
              width: '100%', padding: '8px 10px 8px 30px',
              background: 'var(--bg-card)', border: '1px solid var(--border2)',
              borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIAS.map(c => {
            const badge = BADGE_CORES[c];
            const ativo = categoria === c;
            return (
              <button key={c} onClick={() => setCategoria(c)} style={{
                padding: '5px 11px', fontSize: 11, borderRadius: 20, cursor: 'pointer',
                background: ativo ? (badge?.bg ?? 'rgba(6,182,212,0.1)') : 'var(--bg-card)',
                color: ativo ? (badge?.cor ?? 'var(--cyan)') : 'var(--text-faint)',
                border: `1px solid ${ativo ? (badge?.cor ?? 'var(--cyan)') + '50' : 'var(--border2)'}`,
                transition: 'all 0.15s', fontWeight: ativo ? 600 : 400,
              }}>{c}</button>
            );
          })}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Newspaper size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>Nenhuma fonte encontrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtradas.map(n => <FonteCard key={n.id} n={n} />)}
        </div>
      )}
    </div>
  );
}
