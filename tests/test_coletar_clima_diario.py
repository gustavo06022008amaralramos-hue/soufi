# -*- coding: utf-8 -*-
"""
tests/test_coletar_clima_diario.py
=====================================
Testa a lógica pura de parsing da resposta diária da NASA POWER
(Fase 3 do plano de 10 fases) — sem depender de rede.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import coletar_clima_diario as ccd


def resposta_nasa_exemplo(**overrides):
    """Formato real confirmado contra a API (Guarapuava, jun/2026)."""
    base = {
        "properties": {
            "parameter": {
                "T2M_MAX": {"20260601": 19.1, "20260602": 18.34},
                "T2M_MIN": {"20260601": 8.8, "20260602": 6.48},
                "PRECTOTCORR": {"20260601": 0.0, "20260602": 2.5},
                "RH2M": {"20260601": 75.0, "20260602": 80.0},
            }
        }
    }
    base["properties"]["parameter"].update(overrides)
    return base


def test_parse_basico_dois_dias():
    registros = ccd.parse_resposta_nasa(resposta_nasa_exemplo())
    assert len(registros) == 2
    assert registros[0]["data"] == "2026-06-01"
    assert registros[0]["tmax"] == 19.1
    assert registros[0]["tmin"] == 8.8


def test_dia_com_sentinela_e_descartado():
    """-999.0 é o valor sentinela da NASA POWER pra 'sem dado' — não pode
    virar um registro de temperatura -999°C no banco."""
    resp = resposta_nasa_exemplo(
        T2M_MAX={"20260601": 19.1, "20260602": -999.0},
        T2M_MIN={"20260601": 8.8, "20260602": -999.0},
    )
    registros = ccd.parse_resposta_nasa(resp)
    assert len(registros) == 1
    assert registros[0]["data"] == "2026-06-01"


def test_precipitacao_sentinela_vira_none_nao_derruba_o_dia():
    """Só tmax/tmin sentinela descarta o dia inteiro; precipitação/umidade
    sentinela isolada só zera aquele campo."""
    resp = resposta_nasa_exemplo(PRECTOTCORR={"20260601": -999.0, "20260602": 2.5})
    registros = ccd.parse_resposta_nasa(resp)
    assert len(registros) == 2
    assert registros[0]["precipitacao"] is None
    assert registros[1]["precipitacao"] == 2.5


def test_dias_esperados_bate_com_intervalo_do_ano():
    """DIAS_ESPERADOS deve ser um número positivo e plausível pro ano corrente."""
    assert 1 <= ccd.DIAS_ESPERADOS <= 366
