# -*- coding: utf-8 -*-
"""
tests/test_frete.py
=====================
Testa a lógica de distância/frete até as maltarias de referência (Bloco 3.4).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import calcular_frete as cf


def test_haversine_mesma_coordenada_e_zero():
    assert cf.haversine_km(-25.39, -51.46, -25.39, -51.46) == 0.0


def test_haversine_distancia_conhecida_guarapuava_curitiba():
    # Guarapuava/PR -> Curitiba/PR, ~220km em linha reta (a distancia rodoviaria
    # real e maior, ~260km, mas haversine calcula linha reta)
    dist = cf.haversine_km(-25.3928, -51.4593, -25.4284, -49.2733)
    assert 200 < dist < 240, f"Distância calculada {dist:.0f}km fora do esperado (~220km)"


def test_zona_logistica_limiares():
    assert cf.zona_logistica(50)  == "Zona 1 - Logistica favoravel"
    assert cf.zona_logistica(100) == "Zona 1 - Logistica favoravel"
    assert cf.zona_logistica(101) == "Zona 2 - Custo moderado"
    assert cf.zona_logistica(300) == "Zona 2 - Custo moderado"
    assert cf.zona_logistica(301) == "Zona 3 - Custo elevado"
    assert cf.zona_logistica(600) == "Zona 3 - Custo elevado"
    assert cf.zona_logistica(601) == "Zona 4 - Inviavel sem contrato"


def test_calcular_logistica_municipio_na_sede_da_agraria():
    # Coordenada exata da sede -> frete deve ser o custo fixo (sinuosidade nao gera distancia)
    lat, lon = -25.5630, -51.4898
    resultado = cf.calcular_logistica(lat, lon)
    assert resultado["dist_guarapuava_km"] < 1.0
    assert resultado["zona_logistica"] == "Zona 1 - Logistica favoravel"
    assert resultado["frete_estimado_sc"] == cf.FRETE_FIXO_SC  # so custo fixo, ~0km variavel
    assert resultado["maltaria_referencia"] == "Cooperativa Agraria (Guarapuava/PR)"


def test_calcular_logistica_escolhe_maltaria_mais_proxima():
    # Lages/SC deve ser mais perto da AmBev Lages do que das outras duas
    resultado = cf.calcular_logistica(-27.8147, -50.3260)
    assert resultado["maltaria_referencia"] == "AmBev Lages (SC)"


def test_frete_cresce_com_a_distancia():
    perto  = cf.calcular_logistica(-25.60, -51.50)  # perto da Agrária
    longe  = cf.calcular_logistica(-3.10, -60.02)   # Manaus/AM, bem longe
    assert longe["frete_estimado_sc"] > perto["frete_estimado_sc"]
    assert longe["zona_logistica"] == "Zona 4 - Inviavel sem contrato"
