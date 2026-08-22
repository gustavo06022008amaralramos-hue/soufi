-- 003_clima_diario_nasa.sql
-- Fase 3 do plano de 10 fases: clima diário (NASA POWER), escopado.
--
-- Guarda temperatura/precipitação/umidade DIÁRIA por município — o que o
-- SOUFII tinha até agora era só média MENSAL (32 anos), suficiente pro score
-- de aptidão mas não pro motor de graus-dia (GDD), que precisa reagir a uma
-- data de semeio específica escolhida pelo usuário no simulador.
--
-- Fonte: NASA POWER, https://power.larc.nasa.gov/api/temporal/daily/point,
-- community=AG (Agroclimatology), parâmetros T2M_MAX/T2M_MIN/PRECTOTCORR/RH2M.
--
-- Escopo desta fase: só PR/SC/RS (1.191 municípios — onde a cevada realmente
-- é cultivada), e só o ano corrente (não os 32 anos de histórico mensal, que
-- em resolução diária seria ~65 milhões de linhas — inviável).

create table if not exists clima_diario_nasa (
  id              bigserial primary key,
  codigo_ibge     integer not null,
  data            date not null,
  tmax            numeric,
  tmin            numeric,
  precipitacao    numeric,   -- mm/dia
  umidade         numeric,   -- % (RH2M)
  unique (codigo_ibge, data)
);

create index if not exists idx_clima_diario_codigo_ibge on clima_diario_nasa (codigo_ibge);
create index if not exists idx_clima_diario_data on clima_diario_nasa (codigo_ibge, data);

comment on table clima_diario_nasa is
  'Clima diário por município (NASA POWER, community=AG) — cache pra evitar re-requisição externa. Escopo atual: PR/SC/RS, ano corrente. Alimenta o motor de graus-dia (Fase 4).';
