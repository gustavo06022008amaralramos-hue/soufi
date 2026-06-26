import { useState } from 'react';
import { ExternalLink, Newspaper, Search } from 'lucide-react';

const CATEGORIAS = ['Todas', 'Pesquisa', 'Zoneamento', 'Produção', 'Clima', 'Mercado', 'Tecnologia'];

const NOTICIAS = [
  { id:1,  titulo: 'Embrapa Trigo lança nova cultivar para o Cerrado com ciclo 20% mais curto', resumo: 'A nova variedade BRS Cerrado apresenta adaptações genéticas que permitem plantio em altitudes a partir de 400m com temperatura média até 27°C, ampliando a fronteira do cultivo de cevada no Brasil Central.', fonte: 'Embrapa Trigo', categoria: 'Pesquisa', dias: 2, img: '🌾' },
  { id:2,  titulo: 'ZARC 2025/26: MAPA amplia regiões aptas para cevada cervejeira no PR e SC', resumo: 'Novas portarias incluem 47 municípios do Paraná e 23 de Santa Catarina no zoneamento agrícola de risco climático para a cultura da cevada, baseadas em dados reanalisados da NASA POWER.', fonte: 'MAPA', categoria: 'Zoneamento', dias: 5, img: '📋' },
  { id:3,  titulo: 'FAPA registra produtividade recorde de 5,2 t/ha em Guarapuava na safra 2025', resumo: 'A Fundação Agrária de Pesquisa Agropecuária atingiu novo recorde regional com a cultivar BRS Duquesa em solos argilosos do município de Guarapuava, sob condições climáticas ideais no inverno.', fonte: 'FAPA', categoria: 'Produção', dias: 8, img: '📈' },
  { id:4,  titulo: 'Estresse hídrico em setembro afeta qualidade malteável na região de Passo Fundo', resumo: 'Dados climáticos apontam déficit hídrico no período crítico de enchimento de grãos, com potencial redução no peso hectolítrico e teor de amido das cultivares plantadas no Planalto Gaúcho.', fonte: 'Embrapa Clima', categoria: 'Clima', dias: 12, img: '💧' },
  { id:5,  titulo: 'BRS Imperatriz consolida expansão para o Cerrado Goiano com 3.800 ha plantados', resumo: 'A cultivar desenvolvida pela Embrapa para ambientes tropicais confirma viabilidade econômica no Sudoeste Goiano, com média de 3,8 t/ha em lavouras irrigadas de inverno.', fonte: 'Agrária', categoria: 'Mercado', dias: 15, img: '🗺️' },
  { id:6,  titulo: 'Inteligência artificial melhora predição de aptidão ZARC em 18% com dados Sentinel-2', resumo: 'Pesquisadores do ISRIC e FAO utilizaram imagens multiespectrais de satélite combinadas com modelos de machine learning para refinar o mapeamento de solos para cultura de cevada.', fonte: 'ISRIC/FAO', categoria: 'Tecnologia', dias: 18, img: '🛰️' },
  { id:7,  titulo: 'Mercado de cevada malteada atinge novo patamar: Brasil exporta 120 mil toneladas em 2025', resumo: 'O avanço das áreas produtoras do Sul e do Cerrado levou o Brasil à marca histórica de exportação de cevada malteável, consolidando o país como fornecedor regional para cervejarias do Cone Sul.', fonte: 'AgroBrasília', categoria: 'Mercado', dias: 22, img: '💰' },
  { id:8,  titulo: 'IDR-Paraná atualiza recomendações de plantio para 2026 com janelas ajustadas', resumo: 'Com base nos dados climáticos dos últimos 30 anos e risco de geadas tardias, o Instituto de Desenvolvimento Rural do Paraná revisou as janelas de plantio recomendadas para cevada nas principais regiões produtoras.', fonte: 'IDR-PR', categoria: 'Zoneamento', dias: 25, img: '📅' },
  { id:9,  titulo: 'Chuvas de La Niña elevam risco de GPH em municípios do Planalto Sul do RS', resumo: 'Previsões meteorológicas para outubro-novembro indicam precipitações acima da média histórica, aumentando o risco de germinação pré-colheita nos municípios do Rio Grande do Sul com altitude abaixo de 700m.', fonte: 'INMET', categoria: 'Clima', dias: 28, img: '⛈️' },
  { id:10, titulo: 'Cooperativa Agrária investe R$ 12M em nova unidade de maltagem em Guarapuava', resumo: 'O investimento ampliará a capacidade de maltagem da Cooperativa Agrária em 40%, visando atender a demanda crescente das cervejarias artesanais e industriais do Brasil.', fonte: 'Cooperativa Agrária', categoria: 'Mercado', dias: 32, img: '🏭' },
  { id:11, titulo: 'Novos fungicidas registrados pela MAPA para controle de giberela em cevada', resumo: 'O Ministério da Agricultura aprovou três novos produtos fitossanitários para controle de Fusarium graminearum, principal fungo responsável por danos na qualidade malteável da cevada.', fonte: 'MAPA', categoria: 'Pesquisa', dias: 40, img: '🔬' },
  { id:12, titulo: 'Universidade Estadual de Ponta Grossa lança programa de mestrado em cevadicultura', resumo: 'O novo programa de pós-graduação em Agronomia com ênfase em cevadicultura forma pesquisadores para atender a crescente demanda por especialistas no setor de malte e cerveja artesanal no Brasil.', fonte: 'UEPG', categoria: 'Pesquisa', dias: 45, img: '🎓' },
];

const BADGE_CORES = {
  Pesquisa:  { bg: 'rgba(139,92,246,0.1)',  cor: '#8b5cf6' },
  Zoneamento:{ bg: 'rgba(6,182,212,0.1)',   cor: '#06b6d4' },
  Produção:  { bg: 'rgba(16,185,129,0.1)',  cor: '#10b981' },
  Clima:     { bg: 'rgba(59,130,246,0.1)',  cor: '#3b82f6' },
  Mercado:   { bg: 'rgba(245,158,11,0.1)',  cor: '#f59e0b' },
  Tecnologia:{ bg: 'rgba(236,72,153,0.1)',  cor: '#ec4899' },
};

function NoticiaCard({ n }) {
  const badge = BADGE_CORES[n.categoria] ?? { bg: 'rgba(100,100,100,0.1)', cor: '#888' };
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14,
      transition: 'border-color 0.2s',
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
          <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>há {n.dias} dias</span>
          <span style={{ fontSize: 9, color: 'var(--cyan)', background: 'rgba(6,182,212,0.08)', padding: '2px 6px', borderRadius: 4 }}>{n.fonte}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
          {n.titulo}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.55 }}>
          {n.resumo}
        </p>
      </div>
      <ExternalLink size={13} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 2 }} />
    </div>
  );
}

export default function NoticiasPage() {
  const [categoria, setCategoria] = useState('Todas');
  const [busca, setBusca]         = useState('');
  const [pagina, setPagina]       = useState(1);
  const POR_PAG = 6;

  const filtradas = NOTICIAS.filter(n => {
    const matchCat = categoria === 'Todas' || n.categoria === categoria;
    const matchBusca = !busca || n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      n.resumo.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  const totalPags = Math.ceil(filtradas.length / POR_PAG);
  const paginadas = filtradas.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  function mudarCategoria(cat) {
    setCategoria(cat);
    setPagina(1);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Notícias</h1>
        <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Agronegócio, clima, mercado e tecnologia para cevada</p>
      </div>

      {/* Busca + filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="var(--text-faint)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar notícias..."
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
              <button key={c} onClick={() => mudarCategoria(c)} style={{
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

      {/* Lista */}
      {paginadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Newspaper size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>Nenhuma notícia encontrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {paginadas.map(n => <NoticiaCard key={n.id} n={n} />)}
        </div>
      )}

      {/* Paginação */}
      {totalPags > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: pagina === 1 ? 'not-allowed' : 'pointer',
              background: 'var(--bg-card)', border: '1px solid var(--border2)',
              color: pagina === 1 ? 'var(--text-faint)' : 'var(--text-muted)', opacity: pagina === 1 ? 0.5 : 1,
            }}
          >Anterior</button>
          {Array.from({ length: totalPags }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPagina(p)} style={{
              width: 32, height: 32, borderRadius: 7, fontSize: 12, cursor: 'pointer',
              background: p === pagina ? 'rgba(6,182,212,0.15)' : 'var(--bg-card)',
              border: `1px solid ${p === pagina ? 'rgba(6,182,212,0.3)' : 'var(--border2)'}`,
              color: p === pagina ? 'var(--cyan)' : 'var(--text-muted)',
              fontWeight: p === pagina ? 700 : 400,
            }}>{p}</button>
          ))}
          <button
            onClick={() => setPagina(p => Math.min(totalPags, p + 1))}
            disabled={pagina === totalPags}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: pagina === totalPags ? 'not-allowed' : 'pointer',
              background: 'var(--bg-card)', border: '1px solid var(--border2)',
              color: pagina === totalPags ? 'var(--text-faint)' : 'var(--text-muted)', opacity: pagina === totalPags ? 0.5 : 1,
            }}
          >Próximo</button>
        </div>
      )}
    </div>
  );
}
