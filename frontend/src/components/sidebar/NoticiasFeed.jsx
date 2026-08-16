import { ExternalLink, Newspaper } from 'lucide-react';

// Links reais para as organizações de pesquisa/fomento relevantes por UF.
// Não fabrica manchetes — aponta para os sites oficiais das fontes primárias.
// (Uma versão anterior deste componente continha notícias fictícias com datas
// e números inventados atribuídos a essas organizações; removido em 2026-08.)
const FONTES_POR_UF = {
  PR: [
    { nome: 'Embrapa Trigo', desc: 'Zoneamento ZARC e cultivares', url: 'https://www.embrapa.br/trigo' },
    { nome: 'FAPA / Agrária', desc: 'Pesquisa e cultivares próprias (Guarapuava)', url: 'https://www.agraria.com.br/sementes/fapa' },
    { nome: 'IDR-Paraná', desc: 'Assistência técnica e extensão rural', url: 'https://www.idrparana.pr.gov.br/' },
  ],
  SC: [
    { nome: 'Epagri', desc: 'Pesquisa e extensão rural de SC', url: 'https://www.epagri.sc.gov.br/' },
    { nome: 'Embrapa Trigo', desc: 'Zoneamento ZARC e cultivares', url: 'https://www.embrapa.br/trigo' },
  ],
  RS: [
    { nome: 'Embrapa Trigo', desc: 'Sede em Passo Fundo/RS — pesquisa cevada', url: 'https://www.embrapa.br/trigo' },
  ],
  GO: [
    { nome: 'Embrapa Cerrados', desc: 'Pesquisa para cevada irrigada no Cerrado', url: 'https://www.embrapa.br' },
  ],
  MT: [
    { nome: 'Embrapa Agrossilvipastoril', desc: 'Pesquisa regional MT', url: 'https://www.embrapa.br' },
  ],
  MG: [
    { nome: 'EPAMIG', desc: 'Pesquisa agropecuária de MG', url: 'https://www.epamig.br' },
    { nome: 'Embrapa Trigo', desc: 'Zoneamento ZARC e cultivares', url: 'https://www.embrapa.br/trigo' },
  ],
  BA: [
    { nome: 'Embrapa Cerrados', desc: 'Pesquisa para cevada no Cerrado baiano', url: 'https://www.embrapa.br' },
  ],
  DEFAULT: [
    { nome: 'Portaria MAPA / ZARC vigente', desc: 'Zoneamento agrícola de risco climático oficial', url: 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico' },
    { nome: 'Embrapa Trigo', desc: 'Indicações técnicas para cevada cervejeira', url: 'https://www.embrapa.br/trigo' },
  ],
};

export default function NoticiasFeed({ uf }) {
  const lista = [
    ...(FONTES_POR_UF[uf] ?? []),
    ...FONTES_POR_UF.DEFAULT,
  ];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Newspaper size={14} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Fontes de Pesquisa — {uf ?? 'Brasil'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lista.map((n, i) => (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', textDecoration: 'none',
            padding: '9px 0',
            borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{n.nome}</p>
                <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>{n.desc}</p>
              </div>
              <ExternalLink size={10} color="var(--text-faint)" style={{ flexShrink: 0 }} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
