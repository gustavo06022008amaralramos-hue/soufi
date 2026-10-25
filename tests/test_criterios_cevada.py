# -*- coding: utf-8 -*-
"""Testa a fonte única dos critérios binários da cevada (criterios_cevada.py)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import criterios_cevada as cc

IDEAL = dict(temp_anual=17, chuva_anual=1200, altitude=1000, tipo_zarc=3,
             risco_geada_pct=10, chuva_colheita_mm=150)


def _apt(**mud):
    return cc.calcular_aptidao(**{**IDEAL, **mud})


def test_todos_os_criterios_atendidos_e_apto_100():
    assert _apt() == (True, 100)


def test_altitude_abaixo_de_800_reprova():
    assert _apt(altitude=750) == (False, 83)


def test_colheita_seca_atende():
    assert _apt(chuva_colheita_mm=40)[0] is True


def test_colheita_acima_de_400_reprova():
    assert _apt(chuva_colheita_mm=450)[0] is False


def test_dado_ausente_reprova_em_vez_de_quebrar():
    # antes: colheita None virava 0.0 e passaria em "<= 400"; temp None quebrava
    assert _apt(chuva_colheita_mm=None) == (False, 83)
    assert _apt(temp_anual=None) == (False, 83)


def test_regra_regional_nordeste_ideal_nao_e_apto():
    apto, score = cc.aptidao_final(**IDEAL, uf="BA", codigo_ibge="2900108")
    assert (apto, score) == (False, 65)


def test_regra_regional_litoral_ideal_e_inapto():
    apto, score = cc.aptidao_final(**IDEAL, uf="SC", codigo_ibge="4205407")  # Florianópolis
    assert (apto, score) == (False, 39)


def test_sul_interior_ideal_segue_apto():
    assert cc.aptidao_final(**IDEAL, uf="PR", codigo_ibge="4109401") == (True, 100)  # Guarapuava
