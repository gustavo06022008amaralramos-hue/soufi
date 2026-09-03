-- 005_cultivares_trigo_soja.sql
-- Fase 5 do plano de 10 fases: popular trigo e soja em `cultivares` com dados
-- reais extraídos do portfólio 2026 da Agrária (portfolio-sementes-agraria-v2.pdf,
-- PDF sem camada de texto, lido visualmente página a página — 40/40 páginas
-- nítidas, nenhuma ilegível).
--
-- REGRAS DE PROVENIÊNCIA (nada aqui foi estimado ou inventado):
--   1) Cultivares transgênicas de soja que trazem, impresso na própria página,
--      o aviso "informações fornecidas exclusivamente pelo obtentor de
--      genética, em processo de validação pela FAPA" — o aviso é preservado
--      literalmente no campo `fonte` de cada uma. São: Fibra IPRO, 7362 IPRO,
--      Orion I2X, Imune TF I2X, 541 I2X, Fúria CE, Guapuruvu CE.
--   2) Nenhuma ficha de soja traz altura de planta nem tabela de doenças
--      foliares (formato diferente do trigo/cevada) — altura_planta_cm fica
--      NULL pras 13 cultivares de soja; resistencia_doencas relata só o que
--      a fonte realmente publica (tolerância a doenças de raiz + notas).
--   3) Orion I2X: o código genético impresso na ficha individual (page_32,
--      "56iX58 RSF I2X") diverge do sumário e da tabela de calendário
--      (page_05/page_09, "55iX56RSF I2X") — mantido como nota em `fonte`,
--      sem escolher um dos dois como certo sem confirmação da Agrária.
--   4) gdd_necessario_ciclo fica NULL em todas — nenhuma fonte publica esse
--      valor pra trigo/soja (mesma regra já aplicada à cevada).
--   5) BRS ORS Selvagem: a página não imprime nenhum valor de ciclo
--      (espigamento/maturação aparecem como "-" nas 3 janelas de semeadura) —
--      campos ficam com o texto "não informado na fonte", não um número.

insert into cultivares (cultura_id, nome, obtentor, ciclo_dias_espigamento, ciclo_dias_maturacao, altura_planta_cm, resistencia_doencas, gdd_necessario_ciclo, fonte)
select c.id, v.nome, v.obtentor, v.espigamento, v.maturacao, v.altura, v.notas, null, v.fonte
from culturas c
cross join (values
  ('TBIO Audaz', 'TBIO',
   '73 dias (semeadura 10-12/jun); 67 dias (26/jun-2/jul); 62 dias (12-14/jul)',
   '120 dias (10-12/jun); 114 dias (26/jun-2/jul); 109 dias (12-14/jul)',
   75.0,
   'Oídio S; Manchas foliares MS/MR; Ferrugem da Folha MS/MR; Giberela MR/R; Bacteriose MS/MR; DON Médio. Acamamento moderadamente resistente; germinação na espiga R/MR; reação à geada moderadamente tolerante; densidade 300 sementes/m²; PMS 32,6g; peso hectolitro 76,7 kg/hL. Cruzamento TBIO TORUK x CELEBRA (2018).',
   'Portfólio Agrária 2026, page_16.png'),

  ('BRS ORS Selvagem', 'Embrapa (marca "TRIGO BRS")',
   'não informado na fonte (ciclo aparece como "-" nas 3 janelas impressas)',
   'não informado na fonte',
   85.0,
   'Oídio R/MR; Manchas foliares R/MR; Ferrugem da Folha R/MR; Giberela R/MR; Bacteriose MR; DON Médio/baixo. Acamamento resistente; germinação na espiga MR; reação à geada tolerante; densidade 330 sementes/m²; PMS 36g; peso hectolitro 81 kg/hL.',
   'Portfólio Agrária 2026, page_17.png'),

  ('TBIO Referência', 'TBIO',
   '76 dias (10-12/jun); 70 dias (26/jun-2/jul); 68 dias (12-14/jul)',
   '123 dias (10-12/jun); 119 dias (26/jun-2/jul); 112 dias (12-14/jul)',
   84.0,
   'Oídio S; Manchas foliares MR/R; Ferrugem da Folha S/MS; Giberela MR; Bacteriose MS/MR; DON Médio. Acamamento moderadamente suscetível; germinação na espiga MR; reação à geada tolerante; densidade 330 sementes/m²; PMS 34,6g; peso hectolitro 80,1 kg/hL. Cruzamento CAMPEIRO/FUSTE//FUSTE (2019).',
   'Portfólio Agrária 2026, page_18.png'),

  ('BioTrigo Weiss', 'BioTrigo',
   '78 dias (10-12/jun); 72 dias (26/jun-2/jul); 68 dias (12-14/jul)',
   '126 dias (10-12/jun); 120 dias (26/jun-2/jul); 115 dias (12-14/jul)',
   85.0,
   'Oídio MR; Manchas foliares MR; Ferrugem da Folha MR/R; Giberela MS/MR; Bacteriose MR; DON Médio. Acamamento moderadamente suscetível; germinação na espiga MR; reação à geada tolerante; densidade 280 sementes/m²; PMS 23,2g; peso hectolitro 68,2 kg/hL. Indicado para abertura de semeadura (2023).',
   'Portfólio Agrária 2026, page_19.png'),

  ('TBIO Calibre', 'TBIO',
   '83 dias (10-12/jun); 77 dias (26/jun-2/jul); 75 dias (12-14/jul)',
   '132 dias (10-12/jun); 125 dias (26/jun-2/jul); 120 dias (12-14/jul)',
   93.0,
   'Oídio MS/MR; Manchas foliares MR; Ferrugem da Folha MR; Giberela S/MS; Bacteriose MS/MR; DON Médio. Acamamento moderadamente resistente; germinação na espiga MR; reação à geada tolerante; densidade 330 sementes/m²; PMS 32,6g; peso hectolitro 76,2 kg/hL. Cruzamento FPS Regente/BIO142505//FPS (2020). Atenção redobrada a giberela em anos de epidemia.',
   'Portfólio Agrária 2026, page_20.png'),

  ('TBIO Motriz', 'TBIO',
   '80 dias (10-12/jun); 74 dias (26/jun-2/jul); 71 dias (12-14/jul)',
   '129 dias (10-12/jun); 120 dias (26/jun-2/jul); 116 dias (12-14/jul)',
   75.0,
   'Oídio MS/MR; Manchas foliares MR; Ferrugem da Folha MR; Giberela MS; Bacteriose MS/MR; DON Médio. Acamamento moderadamente resistente; germinação na espiga MR; reação à geada "em análise" (não definida na fonte); densidade 300 sementes/m²; PMS 29,4g; peso hectolitro 72,6 kg/hL (2022).',
   'Portfólio Agrária 2026, page_21.png')
) as v(nome, obtentor, espigamento, maturacao, altura, notas, fonte)
where c.slug = 'trigo'
on conflict (cultura_id, nome) do nothing;

insert into cultivares (cultura_id, nome, obtentor, ciclo_dias_espigamento, ciclo_dias_maturacao, altura_planta_cm, resistencia_doencas, gdd_necessario_ciclo, fonte)
select c.id, v.nome, v.obtentor, null, v.ciclo, null, v.notas, null, v.fonte
from culturas c
cross join (values
  ('B53C22', 'BRAVEZA (convencional, GMO free)', '125 dias · GM relativo 5.5',
   'Tolerância a doenças de raiz: Alta (até 3 anos de soja, melhor em rotação soja/milho). Hábito indeterminado; acamamento tolerante; densidade 280-320 mil plantas/ha; PMS 190g; fertilidade média-alta. Não indicada para pré-feijão (STS); alta suscetibilidade à ferrugem; risco de perda de PMG se ficar muito tempo no campo. Altura de planta e resistência a doenças foliares: não disponível na fonte.',
   'Portfólio Agrária 2026, page_24.png + page_09.png'),

  ('B58C22', 'BRAVEZA (convencional, GMO free)', '136 dias · GM relativo 5.8',
   'Tolerância a doenças de raiz: Média (até 2 anos de soja). Acamamento tolerante; densidade 240-280 mil plantas/ha; PMS 198g; fertilidade alta. Cuidado com semeadura em solo compactado. Altura de planta e resistência a doenças foliares: não disponível na fonte.',
   'Portfólio Agrária 2026, page_25.png'),

  ('Zeus IPRO', 'BRASMAX (55i57 RSF IPRO, Intacta RR2)', '128 dias · GM relativo 5.5',
   'Tolerância a doenças de raiz: Média (até 2 anos de soja). Acamamento resistente; densidade 250-300 mil plantas/ha; PMS 209g; fertilidade alta. Atenção a áreas sem rotação e semeadura tardia. Altura de planta e resistência a doenças foliares: não disponível na fonte.',
   'Portfólio Agrária 2026, page_27.png'),

  ('Fibra IPRO', 'BRASMAX (64i61RSF IPRO, Intacta RR2)', '138 dias · GM relativo 6.4',
   '[DADO NÃO VALIDADO PELA FAPA — aviso impresso na fonte: "informações fornecidas exclusivamente pelo obtentor de genética, em processo de validação pela FAPA"] Tolerância a doenças de raiz: Média, resistente à Phytophthora raça 1. Densidade 200-250 mil plantas/ha; PMS 156g; fertilidade média; ampla janela de plantio. Altura de planta e resistência a doenças foliares: não disponível na fonte.',
   'Portfólio Agrária 2026, page_28.png'),

  ('7362 IPRO', 'TMG (Intacta RR2)', '127 a 137 dias · GM relativo 6.1',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Média, moderadamente resistente à Phytophthora raça 1. Tecnologia Inox Plus (resistente à ferrugem asiática); acamamento resistente; densidade 200-300 mil plantas/ha; PMS 192g; fertilidade alta. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_29.png'),

  ('Trovão I2X', 'BRASMAX (51iX51 RSF I2X, Intacta 2 Xtend)', '120 dias · GM relativo 5.1',
   'Tolerância a doenças de raiz: Média (até 2 anos de soja). Acamamento resistente; densidade 270-320 mil plantas/ha; PMS 184g; fertilidade alta. Sensível a Fusarium em solo compactado. Altura de planta e resistência a doenças foliares: não disponível na fonte.',
   'Portfólio Agrária 2026, page_30.png'),

  ('Titanium TF I2X', 'BRASMAX (56iX58 RSF I2X, Intacta 2 Xtend)', '132 dias · GM relativo 5.6',
   'Tolerância a doenças de raiz: Média (até 2 anos de soja). Tolerante à ferrugem; acamamento tolerante; densidade 200-250 mil plantas/ha; PMS 202g; fertilidade alta. Não tolera altas densidades; dificuldade em semeaduras muito antecipadas. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_31.png'),

  ('Orion I2X (55iX56RSF I2X)', 'BRASMAX (Intacta 2 Xtend)', '123 dias · GM relativo 5.5',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Alta (até 3 anos de soja). Desenvolvimento radicular agressivo; acamamento tolerante; densidade 250-350 mil plantas/ha; PMS 196g; fertilidade alta. Atenção a mofo branco (Sclerotinia) e ferrugem; evitar semeadura tardia. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_05.png (sumário) + page_09.png (calendário) — código "55iX56RSF I2X" adotado por decisão do usuário (2026-08-25); a ficha individual page_32.png imprime "56iX58 RSF I2X" (igual ao código da Titanium), divergência tratada como erro de diagramação da própria fonte'),

  ('Imune TF I2X', 'BRASMAX (53iX55 RSF I2X, Intacta 2 Xtend)', '115 dias · GM relativo 5.3',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Média, resistente à Phytophthora raça 1. Precoce, indicada para regiões de maior altitude; tolerante à ferrugem; densidade 260-350 mil plantas/ha; PMS 210g; fertilidade alta. Não indicada para pré-feijão (STS); suscetível à mancha olho de rã. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_33.png'),

  ('541 I2X', 'SOYTECH (Intacta 2 Xtend)', '127 dias · GM relativo 5.4',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Média, resistente à Phytophthora raça 1. Boa em semeaduras antecipadas; ampla adaptação geográfica; densidade 240-280 mil plantas/ha; PMS 205g; fertilidade alta. Suscetível à mancha olho de rã. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_34.png'),

  ('Fúria CE', 'BRASMAX (65K67RSF CE, Conkesta Enlist)', '124 dias · GM relativo 6.5',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Média, resistente à Phytophthora raça 1. Boa adaptação a regiões de menor altitude; densidade 200-300 mil plantas/ha; PMS 150g; fertilidade média. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_35.png'),

  ('Guapuruvu CE', 'TMG (22201 CE, Conkesta Enlist)', '117 dias · GM relativo 5.0',
   '[DADO NÃO VALIDADO PELA FAPA — mesmo aviso do obtentor] Tolerância a doenças de raiz: Baixa, moderadamente resistente à Phytophthora raça 1. Precoce, alto potencial produtivo; acamamento resistente; densidade 266-311 mil plantas/ha; PMS 170g; fertilidade alta. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_36.png'),

  ('C2550E', 'CORDIUS (Enlist)', '125 dias · GM relativo 5.5',
   'Tolerância a doenças de raiz: Média (sem nota adicional). Tecnologia Enlist amplia manejo de daninhas; acamamento tolerante; densidade 280-350 mil plantas/ha; PMS 178g; fertilidade média-alta. Atenção a oídio e áreas com histórico de doenças radiculares; pode exigir dessecação pré-colheita em clima adverso. Sem o aviso de "dado não validado" impresso nesta ficha. Altura de planta: não disponível na fonte.',
   'Portfólio Agrária 2026, page_37.png')
) as v(nome, obtentor, ciclo, notas, fonte)
where c.slug = 'soja'
on conflict (cultura_id, nome) do nothing;

comment on table cultivares is
  'Cultivares reais por cultura, com ficha técnica citável. Trigo (6) e soja (13) populadas em 005 a partir do portfólio 2026 da Agrária (leitura visual, PDF sem texto). Cultivares de soja transgênicas com aviso "[DADO NÃO VALIDADO PELA FAPA]" no campo fonte/resistencia_doencas carregam disclaimer impresso na própria fonte — precisam ser sinalizadas como tal no frontend, não apresentadas como dado validado.';
