-- 008_score_multicultura.sql
-- Fase 7 do plano de 10 fases: colunas de score/classificação por cultura
-- em municipios_aptidao, calculadas por calcular_aptidao_multicultura.py.
-- Segue o mesmo padrão de score_ponderado (001) — coluna adicional, não
-- mexe nas colunas de cevada já existentes (score_aptidao, apto_geral).

alter table municipios_aptidao
  add column if not exists score_trigo integer,
  add column if not exists classificacao_trigo text,  -- 'Apta' | 'Parcial' | 'Inapta'
  add column if not exists score_soja integer,
  add column if not exists classificacao_soja text;

comment on column municipios_aptidao.score_trigo is
  'Score 0-100 de aptidão para trigo — calcular_aptidao_multicultura.score_trigo (solo/temp/altitude/geada + ZARC real).';
comment on column municipios_aptidao.classificacao_trigo is
  'Apta (0 critérios reprovados) / Parcial (até 2) / Inapta (mais de 2) — calcular_aptidao_multicultura.classificar_aptidao.';
comment on column municipios_aptidao.score_soja is
  'Score 0-100 de aptidão para soja — calcular_aptidao_multicultura.score_soja (temp + ZARC real, peso majoritário em ZARC).';
comment on column municipios_aptidao.classificacao_soja is
  'Apta (0 critérios reprovados) / Parcial (até 2) / Inapta (mais de 2) — calcular_aptidao_multicultura.classificar_aptidao.';
