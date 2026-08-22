# -*- coding: utf-8 -*-
"""
tests/test_score_ponderado.py
================================
Testa a lógica de score ponderado (Bloco 1.5) — a peça mais crítica do
sistema, já que decide o que aparece como "apto" no mapa.

Roda com: python -m pytest tests/ -v
(precisa estar na raiz do projeto, ou rodar via `python -m pytest`)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import calcular_score_ponderado as sp


def municipio_ideal():
    """Todos os 6 critérios no centro da faixa ideal ZARC."""
    return {
        "pct_argila": 40.0,             # >=35% = Tipo 3, nota máxima
        "temp_media_anual": 16.0,       # centro de 10-22°C
        "precipitacao_acumulada_anual": 1000.0,  # centro de 700-1400mm
        "altitude": 900.0,              # acima do piso de 700m
        "risco_geada_pct": 0.0,         # sem geada
        "chuva_colheita_mm": 80.0,      # abaixo do ideal de 120mm
    }


def municipio_inapto():
    """Todos os 6 critérios bem fora da faixa ZARC."""
    return {
        "pct_argila": 0.0,
        "temp_media_anual": 32.0,       # tropical, bem acima de 22+3=25
        "precipitacao_acumulada_anual": 100.0,   # bem abaixo de 700-300=400
        "altitude": 0.0,
        "risco_geada_pct": 80.0,        # bem acima de 30+30=60
        "chuva_colheita_mm": 500.0,     # bem acima de 120+280=400
    }


def test_municipio_ideal_score_maximo():
    score = sp.calcular_score_ponderado(municipio_ideal())
    assert score == 100, f"Município com todos os critérios ideais deveria dar 100, deu {score}"


def test_municipio_inapto_score_zero():
    score = sp.calcular_score_ponderado(municipio_inapto())
    assert score == 0, f"Município totalmente fora da faixa deveria dar 0, deu {score}"


def test_campos_none_nao_quebram():
    """Município sem nenhum dado coletado não deve lançar exceção — score 0."""
    m = {
        "pct_argila": None, "temp_media_anual": None,
        "precipitacao_acumulada_anual": None, "altitude": None,
        "risco_geada_pct": None, "chuva_colheita_mm": None,
    }
    score = sp.calcular_score_ponderado(m)
    assert score == 0


def test_temperatura_dentro_da_faixa_da_nota_maxima():
    notas = sp.notas_graduadas({**municipio_ideal(), "temp_media_anual": 10.0})
    assert notas["temp"] == 1.0
    notas2 = sp.notas_graduadas({**municipio_ideal(), "temp_media_anual": 22.0})
    assert notas2["temp"] == 1.0


def test_temperatura_fora_mas_proxima_da_faixa_da_nota_parcial():
    # 24°C: 2°C acima do limite de 22°C, dentro da tolerância de 3°C
    notas = sp.notas_graduadas({**municipio_ideal(), "temp_media_anual": 24.0})
    assert 0.0 < notas["temp"] < 1.0, f"Esperava nota parcial, deu {notas['temp']}"


def test_temperatura_muito_alta_da_nota_zero():
    # 26°C: no limite exato da tolerância (22+3=25), acima disso é 0
    notas = sp.notas_graduadas({**municipio_ideal(), "temp_media_anual": 27.0})
    assert notas["temp"] == 0.0


def test_pesos_somam_100_por_cento():
    assert abs(sum(sp.PESOS.values()) - 1.0) < 1e-9


def test_altitude_no_piso_zarc_da_nota_maxima():
    notas = sp.notas_graduadas({**municipio_ideal(), "altitude": 800.0})
    assert notas["altitude"] == 1.0


def test_altitude_abaixo_do_novo_piso_perde_nota():
    """Critério endurecido em 2026-08: 700m (piso antigo) já não é mais nota máxima."""
    notas = sp.notas_graduadas({**municipio_ideal(), "altitude": 700.0})
    assert notas["altitude"] < 1.0


def test_geada_zero_da_nota_maxima_e_geada_alta_da_zero():
    baixa = sp.notas_graduadas({**municipio_ideal(), "risco_geada_pct": 0.0})
    alta  = sp.notas_graduadas({**municipio_ideal(), "risco_geada_pct": 60.0})
    assert baixa["geada"] == 1.0
    assert alta["geada"] == 0.0


def test_score_e_monotono_em_relacao_a_geada():
    """Mais risco de geada nunca deveria aumentar o score."""
    base = sp.calcular_score_ponderado({**municipio_ideal(), "risco_geada_pct": 5.0})
    pior = sp.calcular_score_ponderado({**municipio_ideal(), "risco_geada_pct": 25.0})
    assert pior <= base


def test_municipio_nordeste_nunca_e_apto_mesmo_com_clima_ideal():
    """Regra de negócio: Nordeste nunca deve ultrapassar o limiar de Apto (70),
    mesmo que os critérios climáticos brutos deem nota máxima."""
    m = {**municipio_ideal(), "uf": "BA", "codigo_ibge": "2900108"}
    score = sp.calcular_score_ponderado(m)
    assert score < 70
    assert score <= sp.TETO_SCORE_RESTRITO


def test_municipio_litoraneo_direto_nunca_e_apto():
    """Regra de negócio: município litorâneo direto (lista IBGE) nunca deve
    ultrapassar o limiar de Apto, mesmo fora do Nordeste."""
    # Florianópolis/SC, código IBGE real, está na lista de litorâneos diretos.
    m = {**municipio_ideal(), "uf": "SC", "codigo_ibge": "4205407"}
    score = sp.calcular_score_ponderado(m)
    assert score < 70


def test_municipio_fora_da_regiao_restrita_nao_e_afetado():
    """Município fora do Nordeste e não litorâneo direto (ex: Guarapuava/PR)
    não deve ter o score alterado pela regra regional."""
    m = {**municipio_ideal(), "uf": "PR", "codigo_ibge": "4109401"}
    score = sp.calcular_score_ponderado(m)
    assert score == 100
