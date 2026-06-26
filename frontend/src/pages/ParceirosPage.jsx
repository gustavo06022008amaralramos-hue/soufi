import { ExternalLink, FlaskConical, Globe, Satellite, BarChart2, BookOpen, Building2 } from 'lucide-react';

const PARCEIROS = [
  {
    id: 'agraria',
    nome: 'Cooperativa Agrária',
    categoria: 'Parceiro Principal',
    descricao: 'Cooperativa agroindustrial de Guarapuava/PR — um dos maiores produtores de cevada malteável do Brasil. Base institucional do projeto SOUFII.',
    papel: 'Dados de campo, cultivares e diretrizes agronômicas',
    logo: '/logos/agraria.png',
    cor: '#1a5c38',
    bg: 'rgba(26,92,56,0.07)',
    border: 'rgba(26,92,56,0.25)',
    icon: Building2,
    link: 'https://www.agraria.com.br',
    destaque: true,
  },
  {
    id: 'fapa',
    nome: 'FAPA',
    categoria: 'Pesquisa Agropecuária',
    descricao: 'Fundação Agrária de Pesquisa Agropecuária — referência nacional em melhoramento genético e manejo de cereais de inverno no Paraná.',
    papel: 'Pesquisas de campo, ensaios de cultivares e ZARC',
    logo: '/logos/fapa.png',
    cor: '#1a6b42',
    bg: 'rgba(26,107,66,0.07)',
    border: 'rgba(26,107,66,0.25)',
    icon: FlaskConical,
    link: 'https://www.fapa.com.br',
  },
  {
    id: 'embrapa',
    nome: 'Embrapa Trigo',
    categoria: 'Pesquisa Pública',
    descricao: 'Empresa Brasileira de Pesquisa Agropecuária — unidade Trigo. Responsável pelo zoneamento agrícola de risco climático (ZARC) para cevada.',
    papel: 'ZARC, cultivares BRS e critérios de aptidão',
    logo: '/logos/embrapa.png',
    cor: '#1a5ca0',
    bg: 'rgba(26,92,160,0.07)',
    border: 'rgba(26,92,160,0.25)',
    icon: BookOpen,
    link: 'https://www.embrapa.br/trigo',
  },
  {
    id: 'nasa',
    nome: 'NASA POWER',
    categoria: 'Dados Climáticos',
    descricao: 'Prediction Of Worldwide Energy Resources — base de dados climáticos históricos da NASA com 30 anos de cobertura global, usada para temperatura e precipitação.',
    papel: 'Temperatura, precipitação e risco de geada (1993–2024)',
    logo: '/logos/nasa.svg',
    cor: '#0f3a97',
    bg: 'rgba(15,58,151,0.07)',
    border: 'rgba(15,58,151,0.25)',
    icon: Satellite,
    link: 'https://power.larc.nasa.gov',
  },
  {
    id: 'ibge',
    nome: 'IBGE',
    categoria: 'Dados Territoriais',
    descricao: 'Instituto Brasileiro de Geografia e Estatística — fonte oficial da lista de municípios brasileiros com códigos IBGE utilizados como base de geolocalização.',
    papel: 'Lista de 5.570 municípios e códigos oficiais',
    logo: '/logos/ibge.png',
    cor: '#1a4f8c',
    bg: 'rgba(26,79,140,0.07)',
    border: 'rgba(26,79,140,0.25)',
    icon: Globe,
    link: 'https://www.ibge.gov.br',
  },
  {
    id: 'unicentro',
    nome: 'UNICENTRO',
    categoria: 'Parceiro Acadêmico',
    descricao: 'Universidade Estadual do Centro-Oeste do Paraná — parceira acadêmica no desenvolvimento de metodologias de análise de aptidão agrícola regional.',
    papel: 'Suporte metodológico e validação científica',
    logo: '/logos/unicentro.png',
    cor: '#1a1a1a',
    bg: 'rgba(0,0,0,0.05)',
    border: 'rgba(0,0,0,0.15)',
    icon: BookOpen,
    link: 'https://www.unicentro.br',
  },
  {
    id: 'soilgrids',
    nome: 'ISRIC / SoilGrids',
    categoria: 'Dados de Solo',
    descricao: 'International Soil Reference and Information Centre — base global de dados de solos com resolução de 250m. Fornece teor de argila para classificação ZARC.',
    papel: 'Teor de argila 0–20cm (Tipos 1, 2 e 3 ZARC)',
    logo: null,
    cor: '#7c5e14',
    bg: 'rgba(124,94,20,0.07)',
    border: 'rgba(124,94,20,0.25)',
    icon: BarChart2,
    link: 'https://soilgrids.org',
  },
  {
    id: 'openmeteo',
    nome: 'Open-Meteo',
    categoria: 'Geocodificação',
    descricao: 'API aberta de geocodificação e dados meteorológicos — utilizada para buscar coordenadas geográficas e altitude de cada município brasileiro.',
    papel: 'Latitude, longitude e altitude dos municípios',
    logo: null,
    cor: '#0891b2',
    bg: 'rgba(8,145,178,0.07)',
    border: 'rgba(8,145,178,0.25)',
    icon: Globe,
    link: 'https://open-meteo.com',
  },
];

function LogoImage({ src, nome, cor }) {
  if (!src) {
    return (
      <div style={{
        width: 72, height: 72, borderRadius: 14, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, fontWeight: 800, color: cor,
        background: `${cor}15`, border: `2px solid ${cor}30`, letterSpacing: 1,
        flexShrink: 0,
      }}>
        {nome.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div style={{
      width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
      background: '#fff', border: '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 8, boxShadow: 'var(--shadow)',
    }}>
      <img
        src={src}
        alt={nome}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        onError={e => {
          e.target.style.display = 'none';
          e.target.parentNode.innerHTML = `<span style="font-size:20px;font-weight:800;color:${cor}">${nome.slice(0,2).toUpperCase()}</span>`;
        }}
      />
    </div>
  );
}

function PartnerCard({ p }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${p.destaque ? p.border : 'var(--border)'}`,
      borderRadius: 16, padding: '20px 22px',
      boxShadow: p.destaque ? `var(--shadow-lg), 0 0 0 1px ${p.border}` : 'var(--shadow)',
      transition: 'all 0.2s', display: 'flex', gap: 16, alignItems: 'flex-start',
      gridColumn: p.destaque ? 'span 2' : undefined,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `var(--shadow-lg), 0 0 0 1px ${p.border}`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = p.destaque ? `var(--shadow-lg), 0 0 0 1px ${p.border}` : 'var(--shadow)'; }}
    >
      <LogoImage src={p.logo} nome={p.nome} cor={p.cor} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: p.bg, color: p.cor, border: `1px solid ${p.border}`,
            textTransform: 'uppercase', letterSpacing: 0.8,
          }}>{p.categoria}</span>
          {p.destaque && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(26,107,66,0.1)', color: 'var(--cyan)',
              border: '1px solid rgba(26,107,66,0.25)',
            }}>⭐ Parceiro Principal</span>
          )}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: p.cor, marginBottom: 6 }}>{p.nome}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 10 }}>{p.descricao}</p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', borderRadius: 8, background: p.bg,
          border: `1px solid ${p.border}`,
        }}>
          <p.icon size={11} color={p.cor} />
          <p style={{ fontSize: 11, color: p.cor, fontWeight: 500 }}>{p.papel}</p>
        </div>
      </div>

      {p.link && (
        <a href={p.link} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 10px', borderRadius: 8, fontSize: 11,
          background: p.bg, border: `1px solid ${p.border}`,
          color: p.cor, textDecoration: 'none', fontWeight: 500,
          transition: 'opacity 0.15s', flexShrink: 0, alignSelf: 'flex-start',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <ExternalLink size={11} />Site
        </a>
      )}
    </div>
  );
}

export default function ParceirosPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          Parceiros &amp; Fontes de Dados
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', maxWidth: 600 }}>
          O SOUFII integra dados de múltiplas instituições científicas e fontes abertas para produzir
          análises precisas de aptidão para cevada cervejeira no Brasil.
        </p>
      </div>


      {/* Grid de parceiros */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
      }}>
        {PARCEIROS.map(p => <PartnerCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
