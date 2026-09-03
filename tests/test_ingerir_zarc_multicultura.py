# -*- coding: utf-8 -*-
"""
tests/test_ingerir_zarc_multicultura.py
==========================================
Testa o pivot wide->long do ZARC multicultura — Fase 7 do plano de 10 fases.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ingerir_zarc_multicultura as ing


def _linha_base(**overrides):
    linha = {
        "Nome_cultura": "Trigo", "Cod_Ciclo": "21", "Cod_Solo": "13",
        "geocodigo": "4109401", "UF": "PR", "municipio": "Guarapuova",
        "Cod_Outros_Manejos": "1", "Nome_Outros_Manejos": "Sequeiro",
        "Portaria": "Portaria SPA/MAPA nº 999/2025",
    }
    for dec in range(1, 37):
        linha[f"dec{dec}"] = "0"
    linha.update(overrides)
    return linha


def test_transformar_ignora_decendio_com_risco_zero():
    registros = ing.transformar_para_long([_linha_base()])
    assert registros == []


def test_transformar_mantem_apenas_riscos_validos():
    linha = _linha_base(dec1="20", dec5="30", dec10="40", dec15="99")
    registros = ing.transformar_para_long([linha])
    decendios = {r["decendio"]: r["nivel_risco"] for r in registros}
    assert decendios == {1: 20, 5: 30, 10: 40}  # dec15=99 descartado (fora de 20/30/40)


def test_transformar_decodifica_ciclo_e_solo():
    linha = _linha_base(dec1="20")
    registros = ing.transformar_para_long([linha])
    assert registros[0]["grupo"] == "Grupo II"     # Cod_Ciclo 21
    assert registros[0]["solo_ad"] == "AD3"        # Cod_Solo 13
    assert registros[0]["manejo"] == "Sequeiro"    # Cod_Outros_Manejos 1
    assert registros[0]["codigo_ibge"] == 4109401


def test_transformar_ignora_linha_com_geocodigo_invalido():
    linha = _linha_base(dec1="20", geocodigo="não-numérico")
    assert ing.transformar_para_long([linha]) == []


def test_culturas_mapeia_trigo_e_soja_pras_tabelas_certas():
    assert ing.CULTURAS["Trigo"] == "zarc_trigo"
    assert ing.CULTURAS["Soja"] == "zarc_soja"
