# -*- coding: utf-8 -*-
"""
calcular_score_ponderado.py
============================
Calcula `score_ponderado` (Bloco 1.5) para todos os municípios já coletados.

Diferença em relação ao `score_aptidao` original:
  - score_aptidao   : média simples de 6 critérios BINÁRIOS (0 ou 1), peso igual.
  - score_ponderado : cada critério vira uma nota GRADUADA de 0.0 a 1.0 (quão perto
                       do ideal o município está, não apenas "passou/não passou"),
                       combinada com pesos agronômicos diferentes por critério.

Isso resolve o problema de dois municípios ficarem empatados em "5/6 critérios"
mesmo quando um está a 0.1°C do limite e o outro está a 8°C fora da faixa —
o score_ponderado diferencia esses casos.

`apto_geral` continua exigindo os 6 critérios binários originais (sem mudança
de regra — só de representação do score).

Pré-requisito: rodar migrations/001_bloco1_score_frete_auditoria.sql no Supabase
antes deste script (cria a coluna score_ponderado).

Uso: python calcular_score_ponderado.py
"""
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cada thread usa seu proprio client (o client sincrono da supabase-py nao e
# thread-safe para uso concorrente no Windows — gera httpx.ReadError WinError 10035).
_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client

# ==============================================================================
# PESOS — importância agronômica relativa de cada critério para cevada cervejeira
# ==============================================================================
PESOS = {
    "solo":     0.20,  # base para viabilidade radicular e absorção de nutrientes
    "temp":     0.25,  # critério mais determinante para qualidade do malte
    "chuva":    0.15,
    "altitude": 0.15,
    "geada":    0.15,  # impacto catastrófico se ocorre no espigamento (jul/ago)
    "colheita": 0.10,
}
assert abs(sum(PESOS.values()) - 1.0) < 1e-9

# ==============================================================================
# REGRA DE NEGÓCIO — Nordeste e municípios litorâneos diretos nunca são "Apto"
# ==============================================================================
# O score por média climática anual é um proxy simplificado (não é o balanço
# hídrico decendial do ZARC oficial) e às vezes classifica como "apto" cidades
# litorâneas ou nordestinas que na prática não têm tradição nem clima real de
# cultivo de cevada (ex: Florianópolis/SC, Balneário Camboriú/SC apareciam com
# score 83; Boninal/BA com score 100). Decisão explícita do usuário: essas
# regiões nunca devem ultrapassar o limiar de "Apto" (score >= 70).
NORDESTE_UFS = {"AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"}
TETO_SCORE_RESTRITO = 65  # abaixo de 70, com margem de segurança

_caminho_litoraneos = os.path.join(os.path.dirname(os.path.abspath(__file__)), "municipios_litoraneos_ibge.json")
try:
    with open(_caminho_litoraneos, encoding="utf-8") as _f:
        LITORANEOS_IBGE = set(json.load(_f))
except FileNotFoundError:
    LITORANEOS_IBGE = set()


def aplicar_regra_regiao_restrita(score, uf, codigo_ibge):
    """Tampa o score em TETO_SCORE_RESTRITO se o município é do Nordeste ou
    litorâneo direto (fonte: IBGE 'Municípios defrontantes com o mar')."""
    if uf in NORDESTE_UFS or str(codigo_ibge) in LITORANEOS_IBGE:
        return min(score, TETO_SCORE_RESTRITO)
    return score


def _plato(valor, ideal_min, ideal_max, tolerancia):
    """Nota 0-1: 1.0 dentro da faixa ideal, decai linearmente até 0 na borda
    de tolerância, 0 fora dela. Usado para critérios com faixa ótima central."""
    if valor is None:
        return 0.0
    if ideal_min <= valor <= ideal_max:
        return 1.0
    if valor < ideal_min:
        limite = ideal_min - tolerancia
        if valor <= limite:
            return 0.0
        return (valor - limite) / tolerancia
    else:
        limite = ideal_max + tolerancia
        if valor >= limite:
            return 0.0
        return (limite - valor) / tolerancia


def _rampa_alta(valor, minimo, tolerancia):
    """Nota 0-1: 0 abaixo de (minimo - tolerancia), sobe linearmente, 1.0 a
    partir de `minimo`. Usado para critérios "quanto maior, melhor" com piso."""
    if valor is None:
        return 0.0
    if valor >= minimo:
        return 1.0
    limite = minimo - tolerancia
    if valor <= limite:
        return 0.0
    return (valor - limite) / tolerancia


def _rampa_baixa(valor, maximo, tolerancia):
    """Nota 0-1: 1.0 abaixo de `maximo`, decai linearmente até 0 em
    (maximo + tolerancia). Usado para critérios "quanto menor, melhor"."""
    if valor is None:
        return 0.0
    if valor <= maximo:
        return 1.0
    limite = maximo + tolerancia
    if valor >= limite:
        return 0.0
    return (limite - valor) / tolerancia


def notas_graduadas(m):
    """Retorna dict {criterio: nota 0.0-1.0} a partir dos dados brutos do município."""
    pct_argila = m.get("pct_argila")
    temp       = m.get("temp_media_anual")
    chuva      = m.get("precipitacao_acumulada_anual")
    alt        = m.get("altitude")
    geada      = m.get("risco_geada_pct")
    colheita   = m.get("chuva_colheita_mm")

    # Solo: 0% argila = 0.0 ; >=35% argila (Tipo 3, argiloso) = 1.0
    nota_solo = 0.0 if pct_argila is None else max(0.0, min(1.0, pct_argila / 35.0))

    # Temperatura: faixa ideal ZARC 10-22°C, tolerância de 3°C nas bordas
    nota_temp = _plato(temp, 10.0, 22.0, 3.0)

    # Chuva: faixa ideal 700-1400mm (ótima p/ cevada malteira), tolerância até os
    # limites absolutos ZARC (400-2000mm)
    nota_chuva = _plato(chuva, 700.0, 1400.0, 300.0)

    # Altitude: piso elevado de 700m para 800m em 2026-08 (pedido explícito do
    # usuário pós-FAPA: critério mais real e rígido — bate com a altitude real
    # das regiões produtoras, ex. Guarapuava a 1050-1200m). Tolerância também
    # reduzida de 200m para 50m — município abaixo de 750m já zera o critério,
    # em vez de ainda ganhar nota parcial até 500m como antes.
    nota_altitude = _rampa_alta(alt, 800.0, 50.0)

    # Geada: quanto menor risco melhor, tolerância até o limite ZARC de 30%
    nota_geada = _rampa_baixa(geada, 0.0, 30.0)

    # Chuva na colheita: ideal <=120mm, tolerância até o limite ZARC de 400mm
    nota_colheita = _rampa_baixa(colheita, 120.0, 280.0)

    return {
        "solo": nota_solo, "temp": nota_temp, "chuva": nota_chuva,
        "altitude": nota_altitude, "geada": nota_geada, "colheita": nota_colheita,
    }


def calcular_score_ponderado(m):
    notas = notas_graduadas(m)
    score = int(round(sum(PESOS[k] * notas[k] for k in PESOS) * 100))
    return aplicar_regra_regiao_restrita(score, m.get("uf"), m.get("codigo_ibge"))


def buscar_todos():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, uf, pct_argila, temp_media_anual, "
            "precipitacao_acumulada_anual, altitude, risco_geada_pct, chuva_colheita_mm"
        ).range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return registros


def main():
    print("=" * 62)
    print("  calcular_score_ponderado.py — SOUFII")
    print("=" * 62)

    registros = buscar_todos()
    total = len(registros)
    print(f"[DB] {total} municípios a recalcular\n")

    def atualizar(m):
        score = calcular_score_ponderado(m)
        cliente = get_client()
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update(
                    {"score_ponderado": score}
                ).eq("codigo_ibge", m["codigo_ibge"]).execute()
                return m["codigo_ibge"]
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))

    atualizados = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(atualizar, m) for m in registros]
        for i, fut in enumerate(as_completed(futuros), 1):
            fut.result()
            atualizados += 1
            if atualizados % 50 == 0 or atualizados == total:
                print(f"  [{atualizados}/{total}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] score_ponderado calculado para {atualizados} municípios.")
    print("=" * 62)


if __name__ == "__main__":
    main()
