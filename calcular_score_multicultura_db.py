# -*- coding: utf-8 -*-
"""
calcular_score_multicultura_db.py
====================================
Fase 7 do plano de 10 fases: roda calcular_aptidao_multicultura.py (trigo e
soja) para todos os municípios e grava score_trigo/classificacao_trigo e
score_soja/classificacao_soja em municipios_aptidao.

Mesmo padrão de calcular_score_ponderado.py: client Supabase thread-local
(evita WinError 10035 no Windows), lotes concorrentes.

Pré-requisitos:
  - migrations/007_zarc_trigo_soja.sql + ingerir_zarc_multicultura.py (ZARC real)
  - migrations/008_score_multicultura.sql (colunas novas)

Uso: python calcular_score_multicultura_db.py
"""
import os
import sys
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from supabase import create_client

from calcular_aptidao_multicultura import (
    classificar_aptidao, criterios_binarios_soja, criterios_binarios_trigo,
    eh_litoraneo, score_soja, score_trigo,
)

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


def buscar_municipios():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, uf, pct_argila, temp_media_anual, altitude, risco_geada_pct"
        ).range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return registros


def buscar_zarc_por_municipio(tabela):
    """Retorna {codigo_ibge: [{"decendio":..,"nivel_risco":..}, ...]}.

    Chave normalizada pra str: municipios_aptidao.codigo_ibge é text, mas
    zarc_trigo/zarc_soja.codigo_ibge é integer (migration 007) — sem essa
    normalização o .get() abaixo erra silenciosamente pra todo mundo e o
    componente ZARC do score fica sempre 0 (bug real, pego antes de
    reportar como pronto: Sorriso/MT batia 40/100 fixo, sem nenhum
    município passando disso)."""
    agrupado = defaultdict(list)
    offset = 0
    while True:
        batch = supabase.table(tabela).select("codigo_ibge, decendio, nivel_risco").range(offset, offset + 999).execute()
        if not batch.data:
            break
        for r in batch.data:
            agrupado[str(r["codigo_ibge"])].append({"decendio": r["decendio"], "nivel_risco": r["nivel_risco"]})
        if len(batch.data) < 1000:
            break
        offset += 1000
    return agrupado


def main():
    print("=" * 62)
    print("  calcular_score_multicultura_db.py — SOUFII (Fase 7)")
    print("=" * 62)

    print("[1/3] Buscando municípios e ZARC real (trigo/soja)...")
    municipios = buscar_municipios()
    zarc_trigo = buscar_zarc_por_municipio("zarc_trigo")
    zarc_soja = buscar_zarc_por_municipio("zarc_soja")
    print(f"      {len(municipios)} municípios | {len(zarc_trigo)} c/ ZARC trigo | {len(zarc_soja)} c/ ZARC soja")

    print("\n[2/3] Calculando score_trigo e score_soja...")
    atualizacoes = []
    for m in municipios:
        chave = str(m["codigo_ibge"])
        reg_trigo = zarc_trigo.get(chave, [])
        reg_soja = zarc_soja.get(chave, [])
        litoraneo = eh_litoraneo(m["codigo_ibge"])
        atualizacoes.append({
            "codigo_ibge": m["codigo_ibge"],
            "score_trigo": score_trigo(m, reg_trigo),
            "classificacao_trigo": classificar_aptidao(criterios_binarios_trigo(m), litoraneo),
            "score_soja": score_soja(m, reg_soja),
            "classificacao_soja": classificar_aptidao(criterios_binarios_soja(m), litoraneo),
        })

    print(f"      {len(atualizacoes)} scores calculados")

    print("\n[3/3] Gravando em municipios_aptidao...")
    total = len(atualizacoes)

    def atualizar(u):
        cliente = get_client()
        codigo_ibge = u.pop("codigo_ibge")
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update(u).eq("codigo_ibge", codigo_ibge).execute()
                return codigo_ibge
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))

    atualizados = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(atualizar, u) for u in atualizacoes]
        for fut in as_completed(futuros):
            fut.result()
            atualizados += 1
            if atualizados % 50 == 0 or atualizados == total:
                print(f"  [{atualizados}/{total}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] score_trigo e score_soja calculados para {atualizados} municípios.")
    print("=" * 62)


if __name__ == "__main__":
    main()
