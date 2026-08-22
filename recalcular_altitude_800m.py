# -*- coding: utf-8 -*-
"""
recalcular_altitude_800m.py
=============================
Recalcula score_aptidao/apto_geral e score_ponderado para todos os
municipios apos o criterio de altitude ter sido endurecido de 700m
para 800m (pedido do usuario, 2026-08, pos-reuniao com a FAPA).

Nao refaz a coleta de dados (NASA POWER/SoilGrids) -- so reaplica as
formulas de calculo em cima dos campos ja salvos no banco. Reaplica
tambem a regra de Nordeste/litoral (score_geada_inversion) pra nao
regredir aquela correcao.

Uso: python recalcular_altitude_800m.py
"""
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calcular_score_ponderado as sp  # reusa notas_graduadas/PESOS/regra regional

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client


def calcular_aptidao(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm):
    """Copia de coleta_dados.py:calcular_aptidao() -- nao importamos coleta_dados.py
    direto porque ele tem execucao de coleta completa (rede) no nivel do modulo."""
    apto_solo     = tipo_zarc is not None and tipo_zarc >= 2
    apto_temp     = temp_anual is not None and 10.0 <= temp_anual <= 22.0
    apto_chuva    = chuva_anual is not None and 400.0 <= chuva_anual <= 2000.0
    apto_alt      = altitude is not None and altitude >= 800.0
    apto_geada    = risco_geada_pct is not None and risco_geada_pct < 30.0
    apto_colheita = chuva_colheita_mm is not None and 120.0 <= chuva_colheita_mm <= 400.0

    criterios  = [apto_solo, apto_temp, apto_chuva, apto_alt, apto_geada, apto_colheita]
    apto_final = all(criterios)
    score      = int(round(sum(criterios) / len(criterios) * 100))
    return apto_final, score


def buscar_todos():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, uf, pct_argila, temp_media_anual, tipo_solo_zarc, "
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
    print("  recalcular_altitude_800m.py — SOUFII")
    print("=" * 62)

    registros = buscar_todos()
    total = len(registros)
    print(f"[DB] {total} municípios a recalcular\n")

    def atualizar(m):
        apto_geral, score_aptidao = calcular_aptidao(
            m.get("temp_media_anual"), m.get("precipitacao_acumulada_anual"),
            m.get("altitude"), m.get("tipo_solo_zarc"),
            m.get("risco_geada_pct"), m.get("chuva_colheita_mm"),
        )
        score_aptidao = sp.aplicar_regra_regiao_restrita(score_aptidao, m.get("uf"), m.get("codigo_ibge"))
        score_ponderado = sp.calcular_score_ponderado(m)

        cliente = get_client()
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update({
                    "apto_geral": apto_geral,
                    "score_aptidao": score_aptidao,
                    "score_ponderado": score_ponderado,
                }).eq("codigo_ibge", m["codigo_ibge"]).execute()
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
            if atualizados % 200 == 0 or atualizados == total:
                print(f"  [{atualizados}/{total}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] {atualizados} municípios recalculados com o piso de altitude em 800m.")
    print("=" * 62)


if __name__ == "__main__":
    main()
