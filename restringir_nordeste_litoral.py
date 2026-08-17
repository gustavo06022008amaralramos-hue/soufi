# -*- coding: utf-8 -*-
"""
restringir_nordeste_litoral.py
================================
Regra de negocio explicita pedida pelo usuario antes da apresentacao:
municipios do Nordeste e municipios litoraneos diretos (defrontantes com o
mar) nunca devem aparecer como "Apto" (score >= 70), mesmo que o proxy
climatico simplificado (media anual) de o resultado numerico ali por perto.

Fonte da lista de litoraneos diretos: IBGE "Municipios defrontantes com o
mar" (~279 municipios em 17 estados), extraida via
https://pt.wikipedia.org/wiki/Lista_de_municipios_litoraneos_do_Brasil
(tabela com codigo IBGE oficial de cada municipio -- salva em
scratch_litoraneos_ibge.json).

O que o script faz: para cada municipio nordestino OU litoraneo direto,
tampa score_aptidao e score_ponderado em, no maximo, 65 (mantem a nota
relativa entre eles, so garante que nenhum passe do limiar de 70 = Apto).
Nao mexe em municipios com score ja abaixo de 65 -- so reduz quando precisa.

Uso: python restringir_nordeste_litoral.py
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

_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client


NORDESTE_UFS = {"AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"}
TETO_SCORE = 65  # abaixo de 70 (Apto) com margem de seguranca

with open("scratch_litoraneos_ibge.json", encoding="utf-8") as f:
    LITORANEOS_IBGE = set(json.load(f))


def buscar_todos():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, uf, score_aptidao, score_ponderado"
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
    print("  restringir_nordeste_litoral.py — SOUFII")
    print("=" * 62)

    registros = buscar_todos()
    afetados = [
        m for m in registros
        if m["uf"] in NORDESTE_UFS or str(m["codigo_ibge"]) in LITORANEOS_IBGE
    ]
    a_corrigir = [
        m for m in afetados
        if (m.get("score_aptidao") or 0) > TETO_SCORE
        or (m.get("score_ponderado") or 0) > TETO_SCORE
    ]
    print(f"[DB] {len(registros)} municípios no total")
    print(f"[REGRA] {len(afetados)} no Nordeste ou litorâneos diretos")
    print(f"[AJUSTE] {len(a_corrigir)} precisam ter o score reduzido\n")

    def atualizar(m):
        novo_apt = min(m.get("score_aptidao") or 0, TETO_SCORE)
        novo_pond = min(m.get("score_ponderado") or 0, TETO_SCORE)
        cliente = get_client()
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update({
                    "score_aptidao": novo_apt,
                    "score_ponderado": novo_pond,
                }).eq("codigo_ibge", m["codigo_ibge"]).execute()
                return m["codigo_ibge"]
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))

    atualizados = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(atualizar, m) for m in a_corrigir]
        for i, fut in enumerate(as_completed(futuros), 1):
            fut.result()
            atualizados += 1
            if atualizados % 50 == 0 or atualizados == len(a_corrigir):
                print(f"  [{atualizados}/{len(a_corrigir)}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] {atualizados} municípios com score reduzido para no máximo {TETO_SCORE}.")
    print("=" * 62)


if __name__ == "__main__":
    main()
