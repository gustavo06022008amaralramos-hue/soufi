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
    mesmo que os critérios climáticos brutos deem nota máxima. (2900108 não
    é litorâneo direto, então só a regra de Nordeste se aplica aqui.)"""
    m = {**municipio_ideal(), "uf": "BA", "codigo_ibge": "2900108"}
    score = sp.calcular_score_ponderado(m)
    assert score < 70
    assert score <= sp.TETO_SCORE_NORDESTE


def test_municipio_litoraneo_direto_nunca_e_nem_parcialmente_apto():
    """Regra de negócio (2026-09-20, mais rígida que a de Nordeste): município
    litorâneo direto (lista nacional do IBGE) nunca passa de Inapto — nem
    Parcialmente Apto (40) — mesmo com clima ideal e mesmo fora do Nordeste."""
    # Florianópolis/SC, código IBGE real, está na lista de litorâneos diretos.
    m = {**municipio_ideal(), "uf": "SC", "codigo_ibge": "4205407"}
    score = sp.calcular_score_ponderado(m)
    assert score < 40
    assert score <= sp.TETO_SCORE_LITORAL


def test_municipio_litoraneo_e_nordestino_usa_o_teto_mais_rigido():
    """Quando o município é litorâneo E do Nordeste ao mesmo tempo, o teto
    mais rígido (litoral, <40) deve vencer, não o de Nordeste (<70)."""
    # Salvador/BA, litorâneo direto e nordestino.
    m = {**municipio_ideal(), "uf": "BA", "codigo_ibge": "2927408"}
    score = sp.calcular_score_ponderado(m)
    assert score < 40


def test_municipio_fora_da_regiao_restrita_nao_e_afetado():
    """Município fora do Nordeste e não litorâneo direto (ex: Guarapuava/PR)
    não deve ter o score alterado pela regra regional."""
    m = {**municipio_ideal(), "uf": "PR", "codigo_ibge": "4109401"}
    score = sp.calcular_score_ponderado(m)
    assert score == 100


# ── Chuva: tolerância assimétrica até os limites ZARC 400-2000mm ──────────────
def test_chuva_dentro_do_limite_zarc_acima_do_ideal_tem_nota_parcial():
    # Guarapuava real: 1722mm — dentro de 400-2000, acima do ideal 700-1400
    nota = sp.notas_graduadas({"precipitacao_acumulada_anual": 1722})["chuva"]
    assert abs(nota - (2000 - 1722) / 600) < 1e-9


def test_chuva_no_limite_zarc_superior_zera():
    assert sp.notas_graduadas({"precipitacao_acumulada_anual": 2000})["chuva"] == 0.0


def test_chuva_borda_inferior_continua_300mm():
    assert sp.notas_graduadas({"precipitacao_acumulada_anual": 400})["chuva"] == 0.0
    assert abs(sp.notas_graduadas({"precipitacao_acumulada_anual": 550})["chuva"] - 0.5) < 1e-9


def test_ponderado_sem_zarc_tem_teto_65():
    m = {"codigo_ibge": "1400456", "uf": "RR", "pct_argila": 40, "temp_media_anual": 17,
         "precipitacao_acumulada_anual": 1000, "altitude": 900, "risco_geada_pct": 0,
         "chuva_colheita_mm": 100, "tem_zarc_cevada": False}
    assert sp.calcular_score_ponderado(m) == 65


def test_ponderado_com_zarc_geada_alta_nao_penaliza():
    base = {"codigo_ibge": "4109401", "uf": "PR", "pct_argila": 40, "temp_media_anual": 17,
            "precipitacao_acumulada_anual": 1000, "altitude": 900, "risco_geada_pct": 61,
            "chuva_colheita_mm": 100}
    assert sp.calcular_score_ponderado({**base, "tem_zarc_cevada": True}) == 100
    assert sp.calcular_score_ponderado(base) == 85  # sem flag: geada 61% zera os 15% do critério
