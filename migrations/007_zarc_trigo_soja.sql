-- 007_zarc_trigo_soja.sql
-- Fase 7 do plano de 10 fases: ZARC oficial por município pra trigo e soja,
-- mesmo padrão de zarc_cevada (002). Trigo e Soja já vêm no mesmo CSV
-- nacional baixado na Fase 1 (tabua_risco_2025_2026.csv) — confirmado por
-- contagem real (71.968 linhas wide de Trigo, 94.605 de Soja) e mesma
-- decodificação de Cod_Ciclo (20/21/22=Grupo I/II/III) e Cod_Solo
-- (11-16=AD1-AD6) que cevada usa — não precisou baixar nada novo.
--
-- Tabelas separadas (não uma só "zarc_multicultura") por segurança: evita
-- migrar/renomear os 120.915 registros já em produção de zarc_cevada
-- (usados pelo endpoint /zarc/elegibilidade desde a Fase 1/6). O endpoint
-- passa a escolher a tabela certa por parâmetro `cultura`.

create table if not exists zarc_trigo (
  id            bigserial primary key,
  codigo_ibge   integer not null,
  uf            text not null,
  municipio     text not null,
  cod_ciclo     integer not null,
  grupo         text not null,
  cod_solo      integer not null,
  solo_ad       text not null,
  manejo        text not null,
  decendio      integer not null check (decendio between 1 and 36),
  nivel_risco   integer not null check (nivel_risco in (20, 30, 40)),
  portaria      text,
  safra         text not null default '2025/2026'
);
create index if not exists idx_zarc_trigo_codigo_ibge on zarc_trigo (codigo_ibge);
create index if not exists idx_zarc_trigo_decendio on zarc_trigo (codigo_ibge, decendio);

create table if not exists zarc_soja (
  id            bigserial primary key,
  codigo_ibge   integer not null,
  uf            text not null,
  municipio     text not null,
  cod_ciclo     integer not null,
  grupo         text not null,
  cod_solo      integer not null,
  solo_ad       text not null,
  manejo        text not null,
  decendio      integer not null check (decendio between 1 and 36),
  nivel_risco   integer not null check (nivel_risco in (20, 30, 40)),
  portaria      text,
  safra         text not null default '2025/2026'
);
create index if not exists idx_zarc_soja_codigo_ibge on zarc_soja (codigo_ibge);
create index if not exists idx_zarc_soja_decendio on zarc_soja (codigo_ibge, decendio);

comment on table zarc_trigo is
  'ZARC oficial por município para trigo (Nome_cultura=''Trigo'', exclui ''Trigo - Duplo Propósito''), decêndio a decêndio — fonte: MAPA, dados.agricultura.gov.br, safra 2025/2026.';
comment on table zarc_soja is
  'ZARC oficial por município para soja, decêndio a decêndio — fonte: MAPA, dados.agricultura.gov.br, safra 2025/2026.';
