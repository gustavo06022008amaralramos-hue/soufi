# -*- coding: utf-8 -*-
"""
atualizar_flag_zarc_real.py
==============================
Melhoria "Oportunidades — seguro real" do plano de 10 fases: marca
tem_zarc_cevada=true pra todo município com pelo menos 1 registro real em
zarc_cevada (MAPA, Tábua de Risco, safra 2025/2026) — substitui o proxy por
UF (UFS_COM_SEGURO) usado até agora na aba Expansão de Seguro.

Pré-requisito: rodar migrations/010_zarc_real_flag.sql no Supabase antes.

Uso: python atualizar_flag_zarc_real.py
"""
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


def buscar_codigos_ibge_com_zarc():
    """codigo_ibge distintos com registro real em zarc_cevada."""
    codigos = set()
    offset = 0
    while True:
        batch = supabase.table("zarc_cevada").select("codigo_ibge").range(offset, offset + 999).execute()
        if not batch.data:
            break
        codigos.update(str(r["codigo_ibge"]) for r in batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return codigos


def buscar_todos_municipios():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select("codigo_ibge").range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return registros


def main():
    print("=" * 62)
    print("  atualizar_flag_zarc_real.py — SOUFII")
    print("=" * 62)

    print("[1/3] Buscando municípios com ZARC real (zarc_cevada)...")
    com_zarc = buscar_codigos_ibge_com_zarc()
    print(f"      {len(com_zarc)} municípios com registro real")

    print("\n[2/3] Buscando todos os municípios...")
    municipios = buscar_todos_municipios()
    print(f"      {len(municipios)} municípios no total")

    print("\n[3/3] Gravando tem_zarc_cevada...")
    total = len(municipios)

    def atualizar(m):
        codigo = str(m["codigo_ibge"])
        cliente = get_client()
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update(
                    {"tem_zarc_cevada": codigo in com_zarc}
                ).eq("codigo_ibge", m["codigo_ibge"]).execute()
                return
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))

    atualizados = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(atualizar, m) for m in municipios]
        for fut in as_completed(futuros):
            fut.result()
            atualizados += 1
            if atualizados % 200 == 0 or atualizados == total:
                print(f"  [{atualizados}/{total}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] tem_zarc_cevada atualizado para {atualizados} municípios "
          f"({len(com_zarc)} com ZARC real, {atualizados - len(com_zarc)} sem).")
    print("=" * 62)


if __name__ == "__main__":
    main()
