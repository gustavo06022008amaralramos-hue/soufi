# -*- coding: utf-8 -*-
"""
criterios_cevada.py
=====================
Fonte única dos 6 critérios binários de aptidão da cevada (score_aptidao /
apto_geral). Antes cada script de coleta/reprocessamento tinha a sua cópia, e
elas divergiram: algumas ainda usavam altitude >= 700m (o piso é 800m desde
2026-08), outra tinha o critério de geada invertido, e nenhuma aplicava a regra
regional (Nordeste/litoral). Qualquer mudança de critério é feita só aqui.

Critérios (ZARC/EMBRAPA, ajustes da FAPA):
  Solo      — tipo ZARC 2 ou 3
  Temp.     — média anual 10–22 °C
  Chuva     — acumulado anual 400–2000 mm
  Altitude  — >= 800 m
  Geada     — risco < 30 %
  Colheita  — chuva out/nov <= 400 mm (colheita seca é o ideal; chuva causa
              germinação pré-colheita)
"""

ALTITUDE_MINIMA_M = 800.0
CHUVA_COLHEITA_MAX_MM = 400.0


def criterios_cevada(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm):
    """Lista dos 6 critérios (True = atende). Dado ausente conta como não atendido."""
    return [
        tipo_zarc is not None and tipo_zarc >= 2,
        temp_anual is not None and 10.0 <= temp_anual <= 22.0,
        chuva_anual is not None and 400.0 <= chuva_anual <= 2000.0,
        altitude is not None and altitude >= ALTITUDE_MINIMA_M,
        risco_geada_pct is not None and risco_geada_pct < 30.0,
        chuva_colheita_mm is not None and chuva_colheita_mm <= CHUVA_COLHEITA_MAX_MM,
    ]


def calcular_aptidao(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm):
    """(apto_geral, score_aptidao) só pelos critérios — SEM a regra regional."""
    c = criterios_cevada(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm)
    return all(c), int(round(sum(c) / len(c) * 100))


def aptidao_final(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm,
                  uf, codigo_ibge, tem_zarc_cevada=None):
    """(apto_geral, score_aptidao) com as regras de referência aplicadas:
      - litoral direto nunca é apto (teto 39); Nordeste nunca passa de Parcial (65);
      - sem ZARC oficial de cevada (tem_zarc_cevada=False) nunca passa de Parcial (65);
      - com ZARC oficial (True), o critério de geada é considerado atendido: o
        zoneamento já avalia geada no espigamento e só indica datas seguras.
    tem_zarc_cevada=None (flag ainda não calculada) não aplica as regras do ZARC —
    rode atualizar_flag_zarc_real.py e recalcular_altitude_800m.py depois de coletar."""
    import calcular_score_ponderado as sp  # import tardio: o módulo cria client Supabase

    if tem_zarc_cevada:
        risco_geada_pct = 0.0
    apto, score = calcular_aptidao(temp_anual, chuva_anual, altitude, tipo_zarc,
                                   risco_geada_pct, chuva_colheita_mm)
    score = sp.aplicar_regra_regiao_restrita(score, uf, codigo_ibge, tem_zarc_cevada)
    # apto só com score pleno: se o teto regional derrubou o score, deixa de ser apto
    return apto and score >= 70, score
