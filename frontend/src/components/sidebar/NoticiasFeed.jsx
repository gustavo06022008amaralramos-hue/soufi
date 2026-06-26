import { ExternalLink, Newspaper, Calendar } from 'lucide-react';

// Feed simulado de pesquisa agro por UF — baseado em publicações reais de
// FAPA, Embrapa Trigo, Agrária, IAPAR/IDR-Paraná e universidades regionais.
const NOTICIAS_POR_UF = {
  PR: [
    { titulo: 'FAPA/Agrária: nova janela ZARC para cevada em Guarapuava confirma aptidão para BRS Imperatriz', fonte: 'FAPA', dias: 12 },
    { titulo: 'Embrapa Trigo divulga resultados de cultivares em solos argilosos do Paraná — Safra 2025', fonte: 'Embrapa Trigo', dias: 28 },
    { titulo: 'IDR-Paraná recomenda antecipação de 10 dias no plantio na região de Castro por risco de geada tardia', fonte: 'IDR-PR', dias: 35 },
    { titulo: 'Parcerias FAPA/Agrária em solos argilosos da região Centro-Sul apresentam ganho de 12% no extrato', fonte: 'FAPA', dias: 48 },
    { titulo: 'ZARC 2025: portaria MAPA amplia regiões aptas para cevada cervejeira no Paraná', fonte: 'MAPA', dias: 60 },
  ],
  SC: [
    { titulo: 'Epagri lança recomendação de manejo de nitrogênio para cevada em Lages e Campos Novos', fonte: 'Epagri', dias: 20 },
    { titulo: 'Santa Catarina registra aumento de 8% em área cultivada com cevada — destaque para Planalto Sul', fonte: 'Seagri-SC', dias: 32 },
    { titulo: 'Resultados ZARC Embrapa: municípios de SC com altitude acima de 900m apresentam aptidão máxima', fonte: 'Embrapa Trigo', dias: 55 },
  ],
  RS: [
    { titulo: 'Rio Grande do Sul: safra de cevada 2024/25 bate recorde histórico de produtividade malteável', fonte: 'Irga/RS', dias: 15 },
    { titulo: 'Embrapa Trigo lança cultivar tolerante a seca para o planalto gaúcho — menor dependência hídrica', fonte: 'Embrapa Trigo', dias: 40 },
    { titulo: 'FAPA avalia impacto das chuvas de setembro na calibragem de grãos da região de Passo Fundo', fonte: 'FAPA', dias: 52 },
    { titulo: 'Zoneamento de risco para cevada é atualizado para 23 municípios do RS após reanálise NASA POWER', fonte: 'MAPA', dias: 70 },
  ],
  GO: [
    { titulo: 'BRS Imperatriz consolida aptidão no Cerrado: resultados em Jataí/GO superam 4 t/ha', fonte: 'Embrapa Trigo', dias: 18 },
    { titulo: 'FAPA e UFG analisam potencial de expansão de cevada cervejeira no Sudoeste Goiano', fonte: 'UFG', dias: 34 },
    { titulo: 'Sistema de irrigação de inverno em GO amplia janela de plantio de cevada para 60 dias', fonte: 'Emater-GO', dias: 47 },
  ],
  MG: [
    { titulo: 'Alto Paranaíba/MG: novos estudos apontam aptidão de cevada em altitude acima de 900m', fonte: 'EPAMIG', dias: 22 },
    { titulo: 'BRS Imperatriz registra produtividade de 3,8 t/ha no Triângulo Mineiro sob irrigação', fonte: 'Embrapa Trigo', dias: 38 },
    { titulo: 'EPAMIG avalia 12 cultivares de cevada em ensaios no Sul de Minas — destaque para qualidade malteável', fonte: 'EPAMIG', dias: 59 },
  ],
  SP: [
    { titulo: 'IAC/SP: ensaios de cevada de inverno em Itapetininga e Itapeva mostram resultados promissores', fonte: 'IAC', dias: 25 },
    { titulo: 'Cooperativa da região de Itapeva estuda viabilidade de cevada como alternativa à soja de inverno', fonte: 'Cati-SP', dias: 44 },
  ],
  MS: [
    { titulo: 'Embrapa Agropecuária Oeste avalia adaptação de cultivares de cevada no cerrado sul-mato-grossense', fonte: 'Embrapa', dias: 30 },
    { titulo: 'FAMASUL mapeia potencial de cevada irrigada no inverno para o Cone Sul de MS', fonte: 'FAMASUL', dias: 50 },
  ],
  MT: [
    { titulo: 'Cevada de inverno em MT: primeiros ensaios em Rondonópolis mostram viabilidade com irrigação', fonte: 'Imea', dias: 28 },
    { titulo: 'Embrapa Agrossilvipastoril inicia programa de avaliação de cultivares de cevada para o Mato Grosso', fonte: 'Embrapa', dias: 55 },
  ],
  BA: [
    { titulo: 'Chapada Diamantina/BA: altitude de 1.100m abre janela para cevada — primeiros testes com BRS Imperatriz', fonte: 'Embrapa CNPMF', dias: 19 },
    { titulo: 'EBDA e Embrapa avaliam potencial de cevada para o semiárido baiano em altitudes elevadas', fonte: 'EBDA', dias: 45 },
  ],
  DEFAULT: [
    { titulo: 'Embrapa Trigo: nova versão do ZARC inclui dados de 30 anos da NASA POWER para cevada', fonte: 'Embrapa Trigo', dias: 14 },
    { titulo: 'MAPA atualiza portarias de zoneamento agrícola de risco climático para cevada — safra 2025/26', fonte: 'MAPA', dias: 31 },
    { titulo: 'Agrária: programa de melhoramento genético lança duas novas cultivares para ciclo 2026', fonte: 'Agrária', dias: 43 },
    { titulo: 'Pesquisa internacional: dados de satélite (Sentinel-2) melhoram predição de aptidão malteira em 18%', fonte: 'ISRIC/FAO', dias: 65 },
  ],
};

function formatarData(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NoticiasFeed({ uf }) {
  const lista = [
    ...(NOTICIAS_POR_UF[uf] ?? []),
    ...NOTICIAS_POR_UF.DEFAULT,
  ].slice(0, 5);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Newspaper size={14} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Pesquisa &amp; Notícias — {uf ?? 'Brasil'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lista.map((n, i) => (
          <div key={i} style={{
            padding: '9px 0',
            borderBottom: i < lista.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>
                {n.titulo}
              </p>
              <ExternalLink size={10} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 2 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--cyan)', background: 'rgba(6,182,212,0.1)', borderRadius: 4, padding: '1px 6px' }}>
                {n.fonte}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--text-faint)' }}>
                <Calendar size={8} />
                {formatarData(n.dias)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
