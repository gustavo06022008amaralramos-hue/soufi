# -*- coding: utf-8 -*-
"""
tests/test_zarc_engine.py
===========================
Testa a lógica pura de conversão data->decêndio e classificação de risco
ZARC (Fase 1 do plano de 10 fases — ZARC oficial por município).
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import zarc_engine as ze


def test_primeiro_decendio_do_ano():
    assert ze.data_para_decendio(date(2026, 1, 5)) == 1


def test_ultimo_decendio_do_ano():
    assert ze.data_para_decendio(date(2026, 12, 31)) == 36


def test_decendios_dentro_de_um_mes():
    """Cada mês tem 3 decêndios: dias 1-10, 11-20, 21-fim."""
    assert ze.data_para_decendio(date(2026, 6, 1)) == 16
    assert ze.data_para_decendio(date(2026, 6, 10)) == 16
    assert ze.data_para_decendio(date(2026, 6, 11)) == 17
    assert ze.data_para_decendio(date(2026, 6, 20)) == 17
    assert ze.data_para_decendio(date(2026, 6, 21)) == 18
    assert ze.data_para_decendio(date(2026, 6, 30)) == 18


def test_decendio_de_fevereiro_bate_com_dec4_a_6():
    """dec4-6 = Fevereiro, conforme o dicionário de dados oficial do MAPA."""
    assert ze.data_para_decendio(date(2026, 2, 5)) == 4
    assert ze.data_para_decendio(date(2026, 2, 15)) == 5
    assert ze.data_para_decendio(date(2026, 2, 25)) == 6


def test_classificar_risco_valores_validos():
    assert ze.classificar_risco(20) == "ELEGIVEL_20"
    assert ze.classificar_risco(30) == "ELEGIVEL_30"
    assert ze.classificar_risco(40) == "ELEGIVEL_40"


def test_classificar_risco_sem_registro_e_risco_elevado():
    assert ze.classificar_risco(None) == "RISCO_ELEVADO"


def test_montar_resposta_sem_registros_nao_elegivel():
    resp = ze.montar_resposta(4109401, "Guarapuava", "PR", date(2026, 6, 15), 17, [], "2025/2026")
    assert resp["elegivel"] is False
    assert resp["resultados"] == []
    assert resp["decendio"] == 17


def test_montar_resposta_com_registros_elegivel():
    registros = [
        {"grupo": "Grupo II", "solo_ad": "AD3", "manejo": "Sequeiro", "nivel_risco": 20, "portaria": "Port.426_de_15-10-2025"},
    ]
    resp = ze.montar_resposta(4109401, "Guarapuava", "PR", date(2026, 6, 15), 17, registros, "2025/2026")
    assert resp["elegivel"] is True
    assert resp["resultados"][0]["classificacao"] == "ELEGIVEL_20"
    assert resp["resultados"][0]["portaria"] == "Port.426_de_15-10-2025"
