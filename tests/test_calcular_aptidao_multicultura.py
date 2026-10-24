# -*- coding: utf-8 -*-
"""
tests/test_calcular_aptidao_multicultura.py
===============================================
Testa o motor de aptidão por cultura (trigo/soja) — Fase 7 do plano de 10
fases. Critérios reais citados em calcular_aptidao_multicultura.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import calcular_aptidao_multicultura as apt


def test_nota_zarc_sem_registro_e_zero():
    assert apt.nota_zarc([]) == 0.0


def test_nota_zarc_melhor_risco_disponivel_20_da_nota_maxima_de_risco():
    registros = [{"decendio": 5, "nivel_risco": 30}, {"decendio": 6, "nivel_risco": 20}]
    nota = apt.nota_zarc(registros)
    # melhor risco = 20 -> 1.0 * 0.7 = 0.7 ; cobertura = 2/36 ~ 0.0556 * 0.3 ~ 0.0167
    assert abs(nota - (0.7 + (2 / 36) * 0.3)) < 1e-3


def test_nota_zarc_cobertura_ampla_soma_mais():
    poucos = [{"decendio": i, "nivel_risco": 20} for i in range(1, 3)]
    muitos = [{"decendio": i, "nivel_risco": 20} for i in range(1, 20)]
    assert apt.nota_zarc(muitos) > apt.nota_zarc(poucos)


def test_notas_trigo_temperatura_dentro_da_faixa_9_25():
    m = {"pct_argila": 40, "temp_media_anual": 15, "altitude": 900, "risco_geada_pct": 5}
    notas = apt.notas_trigo(m, [])
    assert notas["temp"] == 1.0
    assert notas["solo"] == 1.0
    assert notas["altitude"] == 1.0
    assert notas["geada"] > 0


def test_notas_trigo_altitude_abaixo_de_800_zera_com_tolerancia_50():
    m = {"pct_argila": 40, "temp_media_anual": 15, "altitude": 700, "risco_geada_pct": 5}
    notas = apt.notas_trigo(m, [])
    assert notas["altitude"] == 0.0  # 800 - 50 = 750, 700 já fora da tolerância


def test_notas_soja_temperatura_ideal_20_30():
    m = {"temp_media_anual": 25}
    notas = apt.notas_soja(m, [])
    assert notas["temp"] == 1.0


def test_notas_soja_temperatura_10_graus_zera():
    m = {"temp_media_anual": 10}
    notas = apt.notas_soja(m, [])
    assert notas["temp"] == 0.0


def test_notas_soja_temperatura_40_graus_zera():
    m = {"temp_media_anual": 40}
    notas = apt.notas_soja(m, [])
    assert notas["temp"] == 0.0


def test_score_trigo_e_soja_ficam_entre_0_e_100():
    m = {"pct_argila": 20, "temp_media_anual": 18, "altitude": 850, "risco_geada_pct": 10}
    assert 0 <= apt.score_trigo(m, []) <= 100
    assert 0 <= apt.score_soja(m, []) <= 100


def test_classificar_aptidao_zero_reprovados_e_apta():
    assert apt.classificar_aptidao([True, True, True]) == "Apta"


def test_classificar_aptidao_ate_2_reprovados_e_parcial():
    assert apt.classificar_aptidao([False, True, True]) == "Parcial"
    assert apt.classificar_aptidao([False, False, True, True]) == "Parcial"


def test_classificar_aptidao_mais_de_2_reprovados_e_inapta():
    assert apt.classificar_aptidao([False, False, False, True]) == "Inapta"


def test_criterios_binarios_trigo_todos_reais():
    m = {"pct_argila": 40, "temp_media_anual": 15, "altitude": 900, "risco_geada_pct": 5}
    assert apt.criterios_binarios_trigo(m) == [True, True, True, True]
    assert apt.classificar_aptidao(apt.criterios_binarios_trigo(m)) == "Apta"


def test_criterios_binarios_soja_fora_da_faixa():
    m = {"temp_media_anual": 5}
    assert apt.criterios_binarios_soja(m) == [False]
    assert apt.classificar_aptidao(apt.criterios_binarios_soja(m)) == "Parcial"


# ── Regra do litoral (2026-09-20): nenhum município litorâneo direto pode
# ser Apta nem Parcial em nenhuma cultura, mesmo com critérios climáticos
# ideais. Mesma lista nacional do IBGE já usada pra cevada.
def test_eh_litoraneo_reconhece_municipio_real_da_lista():
    assert apt.eh_litoraneo("4205407") is True   # Florianópolis/SC
    assert apt.eh_litoraneo("4109401") is False  # Guarapuava/PR, não litorâneo


def test_classificar_aptidao_litoraneo_forca_inapta_mesmo_com_tudo_aprovado():
    assert apt.classificar_aptidao([True, True, True, True], litoraneo=True) == "Inapta"


def test_score_trigo_litoraneo_nunca_passa_do_teto():
    m_ideal = {"codigo_ibge": "4205407", "pct_argila": 40, "temp_media_anual": 15, "altitude": 900, "risco_geada_pct": 0}
    assert apt.score_trigo(m_ideal, []) < 40


def test_score_soja_litoraneo_nunca_passa_do_teto():
    m_ideal = {"codigo_ibge": "4205407", "temp_media_anual": 25}
    registros_perfeitos = [{"decendio": d, "nivel_risco": 20} for d in range(1, 37)]
    assert apt.score_soja(m_ideal, registros_perfeitos) < 40


def test_score_trigo_nao_litoraneo_nao_e_afetado():
    m_ideal = {"codigo_ibge": "4109401", "pct_argila": 40, "temp_media_anual": 15, "altitude": 900, "risco_geada_pct": 0}
    assert apt.score_trigo(m_ideal, []) == 85  # sem ZARC (peso 0.15), resto ideal: 0.85*100
