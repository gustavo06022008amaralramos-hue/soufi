-- 004_multicultura_schema.sql
-- Fase 5 do plano de 10 fases: schema multicultura (cevada + trigo + soja).
--
-- Objetivo: dar ao motor de GDD (calcular_gdd.py) e ao simulador ao vivo
-- (Fase 6) uma fonte estruturada de cultivares por cultura, em vez do objeto
-- hardcoded CULTIVARES em frontend/src/components/simulador/CultivaresAgaria.jsx
-- (que continua existindo até a migração do frontend acontecer, sem quebrar
-- nada que já funciona).
--
-- IMPORTANTE (regra do projeto: nunca inventar dado agronômico):
--   - As 5 cultivares de cevada abaixo são as mesmas já verificadas e em uso
--     no app (Portaria ZARC PR nº 358/2024 + Embrapa Trigo 2025, Tabela 3.1).
--   - Trigo e soja ficam com a TABELA criada mas SEM LINHAS ainda — essa
--     migração não popula cultivar nenhuma de trigo/soja até os dados serem
--     extraídos e verificados de fato do portfólio 2026 da Agrária (em
--     andamento). Popular com placeholder seria inventar dado, o que a
--     regra do projeto proíbe.
--   - gdd_necessario_ciclo fica NULL pra quase todas as cultivares — só
--     temos um valor real (Imperatriz ≈2300°D, e mesmo esse vem de anotação
--     manuscrita do usuário, não de fonte oficial impressa). NULL aqui
--     significa "não temos essa medida", não "zero".

create table if not exists culturas (
  id            bigserial primary key,
  slug          text not null unique,      -- 'cevada' / 'trigo' / 'soja'
  nome          text not null,
  temperatura_base_c  numeric,             -- T_b do motor de GDD; NULL = não confirmado
  tb_confirmado boolean not null default false,
  tb_fonte      text                       -- de onde veio o T_b (anotação de campo, Embrapa, etc.)
);

insert into culturas (slug, nome, temperatura_base_c, tb_confirmado, tb_fonte) values
  ('cevada', 'Cevada',  0.0, true,  'Anotação de campo do usuário (2026-08-22), confirmado explicitamente: "Tb 0°C, seguir com isso"'),
  ('trigo',  'Trigo',   4.5, false, 'Valor proposto (não confirmado) — pendente de fonte citável'),
  ('soja',   'Soja',    10.0, false, 'Valor de literatura agronômica geral (Embrapa Soja) — pendente de confirmação específica do projeto')
on conflict (slug) do nothing;

create table if not exists cultivares (
  id                    bigserial primary key,
  cultura_id            bigint not null references culturas(id),
  nome                  text not null,
  obtentor              text,
  ciclo_dias_espigamento text,             -- texto livre: fontes reais nem sempre dão um único número
  ciclo_dias_maturacao  text,
  altura_planta_cm      numeric,
  resistencia_doencas   text,
  gdd_necessario_ciclo  numeric,           -- NULL = não medido/não disponível em fonte
  fonte                 text not null,     -- citação da fonte real (Portaria, publicação, PDF+página)
  unique (cultura_id, nome)
);

-- As 5 cultivares de cevada já verificadas e em uso na aba Seguro do app
-- (frontend/src/components/simulador/CultivaresAgaria.jsx) — migradas aqui
-- 1:1, sem alterar nenhum dado.
insert into cultivares (cultura_id, nome, obtentor, ciclo_dias_espigamento, ciclo_dias_maturacao, altura_planta_cm, resistencia_doencas, gdd_necessario_ciclo, fonte)
select c.id, v.nome, v.obtentor, v.espigamento, v.maturacao, v.altura, v.resistencia, v.gdd, v.fonte
from culturas c
cross join (values
  ('Condessa',  'Cooperativa Agrária Agroindustrial (FAPA)', '60–65 dias', '115–118 dias', 60.0,  'Resistente a acamamento. Baixa adaptação em áreas de menor fertilidade/pH.', null,
    'Lançamento 2025, linhagem FAPAC 2021088, cruzamento Sissi // Danielle'),
  ('Princesa',  'Cooperativa Agrária Agroindustrial', '80 dias', '122 dias', 70.0, 'Resistente a ferrugem, moderadamente resistente a mancha-reticular e mancha-marrom.', null,
    'Portaria ZARC PR nº 358/2024 + Embrapa Trigo 2025, Tabela 3.1'),
  ('Duquesa',   'Cooperativa Agrária Agroindustrial', '77 dias', '120 dias', 72.0, 'Resistente a ferrugem, suscetível a giberela.', null,
    'Portaria ZARC PR nº 358/2024 + Embrapa Trigo 2025, Tabela 3.1'),
  ('Imperatriz','FAPA (Fundação Agrária de Pesquisa Agropecuária)', '82 dias', '127 dias', 73.0, 'Moderadamente resistente à maioria das doenças foliares, suscetível a giberela.', 2300,
    'Portaria ZARC PR nº 358/2024 + Embrapa Trigo 2025, Tabela 3.1; gdd_necessario_ciclo de anotação manuscrita do usuário, não de fonte oficial impressa'),
  ('BRS Cauê',  'Embrapa Trigo', '90 dias', '132 dias', 72.0, 'Altamente suscetível a oídio. Genes de nanismo (porte baixo reduz acamamento).', null,
    'Portaria ZARC PR nº 358/2024 + Embrapa Trigo 2025, Tabela 3.1')
) as v(nome, obtentor, espigamento, maturacao, altura, resistencia, gdd, fonte)
where c.slug = 'cevada'
on conflict (cultura_id, nome) do nothing;

create table if not exists epocas_semeadura (
  id            bigserial primary key,
  cultivar_id   bigint not null references cultivares(id),
  regiao        text not null,            -- nome de região/microrregião da fonte (ex.: "Guarapuava/PR")
  janela_inicio date,
  janela_fim    date,
  fonte         text not null,
  unique (cultivar_id, regiao)
);

comment on table culturas is
  'Culturas suportadas pelo motor de GDD, com T_b (temperatura base) e status de confirmação — Fase 5 do plano de 10 fases.';
comment on table cultivares is
  'Cultivares reais por cultura, com ficha técnica citável. Trigo e soja ficam sem linhas até dados reais serem extraídos e verificados do portfólio 2026 da Agrária — nunca populado com placeholder.';
comment on table epocas_semeadura is
  'Janela de semeadura por cultivar × região, quando a fonte especificar. Bloqueado até existir mapeamento região Agrária ↔ município (dado em aberto, ver Fase 5 no plano).';
