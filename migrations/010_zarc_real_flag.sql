-- 010_zarc_real_flag.sql
-- Melhoria "Oportunidades — seguro real" do plano de 10 fases: a aba
-- "Expansão de Seguro" decidia elegibilidade por ESTADO (proxy
-- UFS_COM_SEGURO = PR/SC/RS/SP/MG/GO/DF), mesmo já tendo ZARC real por
-- MUNICÍPIO ingerido desde a Fase 1 (zarc_cevada, 120.915 registros,
-- 1.429 municípios). Adiciona uma flag booleana simples, precomputada,
-- pra não precisar consultar zarc_cevada por decêndio/data em toda listagem
-- de 5.571 municípios (caro) — só "esse município tem ALGUM registro real
-- de ZARC cevada" (grosseiro o suficiente pra substituir o proxy por UF,
-- fino o suficiente por já ser dado oficial por município).

alter table municipios_aptidao
  add column if not exists tem_zarc_cevada boolean not null default false;

comment on column municipios_aptidao.tem_zarc_cevada is
  'true se o município tem ao menos 1 registro real em zarc_cevada (MAPA, Tábua de Risco) — substitui o proxy por UF (UFS_COM_SEGURO) da aba Expansão de Seguro. Calculado por atualizar_flag_zarc_real.py.';
