-- 006_corrige_ciclo_princesa_duquesa.sql
-- Decisão do usuário (2026-08-25): pra Princesa e Duquesa (cultivares
-- próprias da Agrária), usar o ciclo publicado no portfólio 2026 da Agrária
-- (fonte mais recente e da própria obtentora) em vez da Tabela 3.1 da
-- Embrapa Trigo (2025) usada em 004. Não afeta Imperatriz nem BRS Cauê,
-- que não são vendidas pela Agrária e continuam citando a Tabela 3.1.

update cultivares set
  ciclo_dias_espigamento = '75 dias',
  ciclo_dias_maturacao   = '122 dias',
  fonte = 'Portfólio Agrária 2026, page_13.png (atualizado 2026-08-25 — substitui Embrapa Trigo Tabela 3.1 pra esta cultivar própria da Agrária)'
where nome = 'Princesa'
  and cultura_id = (select id from culturas where slug = 'cevada');

update cultivares set
  ciclo_dias_espigamento = '75 dias',
  ciclo_dias_maturacao   = '122 dias',
  fonte = 'Portfólio Agrária 2026, page_14.png (atualizado 2026-08-25 — substitui Embrapa Trigo Tabela 3.1 pra esta cultivar própria da Agrária)'
where nome = 'Duquesa'
  and cultura_id = (select id from culturas where slug = 'cevada');

-- T_b do trigo confirmado em 2026-09-01 (Fase 7, pesquisa de fontes reais):
-- Embrapa Trigo, "Cultivo de Trigo" (Sistema de Produção, Caierão et al.)
-- usa explicitamente "temperatura base de 0°C" no cálculo de filocronos —
-- substitui o valor de 4,5°C que estava proposto sem fonte em 004.
update culturas set
  temperatura_base_c = 0.0,
  tb_confirmado = true,
  tb_fonte = 'Embrapa Trigo, "Cultivo de Trigo" (Sistema de Produção, Caierão et al.), infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155370/1/Cultivo-de-Trigo.pdf — "temperatura base de 0°C" no cálculo de filocronos (Slafer & Rawson, 1994; Cunha et al., 2009), confirmado 2026-09-01'
where slug = 'trigo';
