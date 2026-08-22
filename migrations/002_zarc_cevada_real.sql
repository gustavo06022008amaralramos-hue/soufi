-- 002_zarc_cevada_real.sql
-- Fase 1 do plano de 10 fases: ZARC oficial por município (não só por estado).
--
-- Fonte: MAPA, dataset aberto "Tábua de Risco - Zoneamento Agrícola de Risco
-- Climático" (dados.agricultura.gov.br, dataset 6d3d141c-885e-41a4-ab7f-dc8ff323b96f),
-- safra 2025/2026, filtrado para "Cevada Cervejeira" (26.766 linhas no formato wide
-- original, antes do pivot pra long).
--
-- Semântica confirmada no dicionário de dados oficial (dicionario-de-dados-tabua-de-risco-2026.pdf):
--   Cod_Ciclo: 20=Grupo I, 21=Grupo II, 22=Grupo III (cevada cervejeira só usa esses 3)
--   Cod_Solo:  11=AD1, 12=AD2, 13=AD3, 14=AD4, 15=AD5, 16=AD6
--   Cod_Outros_Manejos: 1=Sequeiro, 2=Irrigado, 3=Irrigado com controle de geada
--   decendio (1-36): terço do mês (dec1-3=Jan, dec4-6=Fev, ..., dec34-36=Dez)
--   nivel_risco: 0 = não indicado pra plantio nesse decêndio; 20/30/40 = risco
--     climático % publicado na portaria (quanto menor, mais seguro)

create table if not exists zarc_cevada (
  id            bigserial primary key,
  codigo_ibge   integer not null,
  uf            text not null,
  municipio     text not null,
  cod_ciclo     integer not null,
  grupo         text not null,          -- 'Grupo I' / 'Grupo II' / 'Grupo III'
  cod_solo      integer not null,
  solo_ad       text not null,          -- 'AD1'..'AD6'
  manejo        text not null,          -- 'Sequeiro' / 'Irrigado' / 'Irrigado com controle de geada'
  decendio      integer not null check (decendio between 1 and 36),
  nivel_risco   integer not null check (nivel_risco in (20, 30, 40)),
  portaria      text,
  safra         text not null default '2025/2026'
);

create index if not exists idx_zarc_cevada_codigo_ibge on zarc_cevada (codigo_ibge);
create index if not exists idx_zarc_cevada_decendio on zarc_cevada (codigo_ibge, decendio);

comment on table zarc_cevada is
  'ZARC oficial por município para cevada cervejeira, decêndio a decêndio — fonte: MAPA, dados.agricultura.gov.br, safra 2025/2026. Substitui o proxy por estado usado antes na aba Seguro.';
