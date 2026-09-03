-- 009_tb_soja_pesquisado.sql
-- T_b da soja pesquisado em 2026-09-01 (era 10°C, "literatura agronômica
-- geral", sem citação específica). Melhor fonte real encontrada: Camargo,
-- Brunini & Miranda, "Temperatura-base para cálculo dos graus-dia para
-- cultivares de soja em São Paulo" (Pesquisa Agropecuária Brasileira,
-- Embrapa/IAC) — estudo dedicado, revisado por pares, achou T_b=14°C pra
-- TODAS as 4 cultivares testadas (UFV-1, Santa Rosa, Viçoja, Paraná).
-- Ainda NÃO fica marcado como tb_confirmado=true (diferente do trigo):
-- outros estudos reais divergem (10°C em Belterra/PA; 7,6°C em outro) —
-- é a melhor fonte, não uma confirmação única como a do trigo.

update culturas set
  temperatura_base_c = 14.0,
  tb_confirmado = false,
  tb_fonte = 'Camargo, Brunini & Miranda, "Temperatura-base para cálculo dos graus-dia para cultivares de soja em São Paulo" (Pesquisa Agropecuária Brasileira, Embrapa/IAC) — 14°C pra fase plantio→maturação em 4 cultivares testadas; melhor fonte encontrada, mas literatura diverge entre estudos (10°C, 7,6°C também citados) — não é confirmação única como a do trigo. Pesquisado 2026-09-01.'
where slug = 'soja';
