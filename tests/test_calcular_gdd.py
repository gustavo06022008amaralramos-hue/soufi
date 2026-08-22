# -*- coding: utf-8 -*-
"""
tests/test_calcular_gdd.py
=============================
Testa o motor de graus-dia (GDD) — Fase 4 do plano de 10 fases.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import calcular_gdd as gdd


def test_gdd_diario_formula_basica():
    # media = (20+10)/2 = 15; Tb=0 -> GDD=15
    assert gdd.gdd_diario(tmax=20, tmin=10, tb=0.0) == 15.0


def test_gdd_diario_nunca_e_negativo():
    # media = (2+0)/2 = 1; Tb=5 -> 1-5=-4, mas GDD nao pode ser negativo
    assert gdd.gdd_diario(tmax=2, tmin=0, tb=5.0) == 0.0


def test_gdd_diario_com_tb_zero_cevada():
    """T_b=0°C (decisão do usuário p/ cevada) — qualquer média acima de 0
    já acumula GDD integralmente, sem piso."""
    assert gdd.gdd_diario(tmax=10, tmin=2, tb=0.0) == 6.0
    assert gdd.gdd_diario(tmax=1, tmin=-1, tb=0.0) == 0.0


def test_houve_geada_limiar_4_graus():
    assert gdd.houve_geada(tmin=3.9) is True
    assert gdd.houve_geada(tmin=4.0) is True
    assert gdd.houve_geada(tmin=4.1) is False


def test_acumular_gdd_soma_corretamente():
    registros = [
        {"data": "2026-06-01", "tmax": 20, "tmin": 10},
        {"data": "2026-06-02", "tmax": 22, "tmin": 12},
        {"data": "2026-06-03", "tmax": 18, "tmin": 8},
    ]
    pontos = gdd.acumular_gdd(registros, "cevada", "2026-06-01")
    assert len(pontos) == 3
    assert pontos[0]["gdd_dia"] == 15.0
    assert pontos[1]["gdd_acumulado"] == 15.0 + 17.0
    assert pontos[2]["gdd_acumulado"] == 15.0 + 17.0 + 13.0


def test_acumular_gdd_ignora_dias_antes_do_semeio():
    registros = [
        {"data": "2026-05-30", "tmax": 30, "tmin": 20},  # antes do semeio, ignorado
        {"data": "2026-06-01", "tmax": 20, "tmin": 10},
    ]
    pontos = gdd.acumular_gdd(registros, "cevada", "2026-06-01")
    assert len(pontos) == 1
    assert pontos[0]["data"] == "2026-06-01"


def test_acumular_gdd_marca_geada_por_dia():
    registros = [
        {"data": "2026-06-01", "tmax": 15, "tmin": 3.0},   # geada
        {"data": "2026-06-02", "tmax": 20, "tmin": 10.0},  # sem geada
    ]
    pontos = gdd.acumular_gdd(registros, "cevada", "2026-06-01")
    assert pontos[0]["geada"] is True
    assert pontos[1]["geada"] is False


def test_cultura_sem_tb_definido_lanca_erro():
    try:
        gdd.acumular_gdd([], "milho", "2026-06-01")
        assert False, "deveria ter lançado ValueError"
    except ValueError:
        pass


def test_data_do_estagio_encontra_o_dia_certo():
    registros = [
        {"data": "2026-06-01", "tmax": 20, "tmin": 10},  # gdd_dia=15, acum=15
        {"data": "2026-06-02", "tmax": 20, "tmin": 10},  # acum=30
        {"data": "2026-06-03", "tmax": 20, "tmin": 10},  # acum=45
    ]
    pontos = gdd.acumular_gdd(registros, "cevada", "2026-06-01")
    estagio = gdd.data_do_estagio(pontos, gdd_alvo=30)
    assert estagio["data"] == "2026-06-02"


def test_data_do_estagio_retorna_none_se_nao_atingido():
    registros = [{"data": "2026-06-01", "tmax": 10, "tmin": 5}]
    pontos = gdd.acumular_gdd(registros, "cevada", "2026-06-01")
    assert gdd.data_do_estagio(pontos, gdd_alvo=9999) is None
