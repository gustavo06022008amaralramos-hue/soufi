# -*- coding: utf-8 -*-
"""
ingerir_zarc_cevada.py
========================
Fase 1 do plano de 10 fases: ingestão do ZARC oficial de cevada cervejeira
por município, decêndio a decêndio.

Fonte real: MAPA, dataset aberto "Tábua de Risco - Zoneamento Agrícola de
Risco Climático" (dados.agricultura.gov.br), safra 2025/2026 — que é a safra
que realmente cobre o ciclo de inverno de cevada (a "2026/2027" já publicada
só tinha culturas de verão quando checamos: soja, milho, sorgo, algodão etc.,
sem cevada — confirmado por grep antes de assumir).

Lê o CSV wide (uma linha por combinação cultura/ciclo/solo/manejo/município,
com risco em 36 colunas dec1..dec36) e transforma pra long (uma linha por
decêndio com risco > 0), gravando em zarc_cevada.

Pré-requisito: rodar migrations/002_zarc_cevada_real.sql no Supabase antes.

Uso: python ingerir_zarc_cevada.py
"""
import csv
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zarc_dados", "cevada_cervejeira_apenas.csv")
SAFRA = "2025/2026"

# Decodificação confirmada no dicionário de dados oficial do MAPA
CICLOS = {20: "Grupo I", 21: "Grupo II", 22: "Grupo III"}
SOLOS = {11: "AD1", 12: "AD2", 13: "AD3", 14: "AD4", 15: "AD5", 16: "AD6"}
MANEJOS = {1: "Sequeiro", 2: "Irrigado", 3: "Irrigado com controle de geada"}

HEADER = [
    "Nome_cultura", "SafraIni", "SafraFin", "Cod_Cultura", "Cod_Ciclo", "Cod_Solo",
    "geocodigo", "UF", "municipio", "Cod_Clima", "Nome_Clima", "Cod_Outros_Manejos",
    "Nome_Outros_Manejos", "Produtividade", "Cod_NM", "Cod_Munic", "Cod_Meso",
    "Cod_Micro", "Portaria",
] + [f"dec{i}" for i in range(1, 37)]


def ler_linhas():
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        for row in reader:
            if len(row) != len(HEADER):
                continue
            yield dict(zip(HEADER, row))


def transformar_para_long(linhas):
    registros = []
    for r in linhas:
        try:
            cod_ciclo = int(r["Cod_Ciclo"])
            cod_solo = int(r["Cod_Solo"])
            codigo_ibge = int(r["geocodigo"])
        except ValueError:
            continue
        base = {
            "codigo_ibge": codigo_ibge,
            "uf": r["UF"],
            "municipio": r["municipio"],
            "cod_ciclo": cod_ciclo,
            "grupo": CICLOS.get(cod_ciclo, f"Ciclo {cod_ciclo}"),
            "cod_solo": cod_solo,
            "solo_ad": SOLOS.get(cod_solo, f"Solo {cod_solo}"),
            "manejo": MANEJOS.get(int(r["Cod_Outros_Manejos"]), r["Nome_Outros_Manejos"]),
            "portaria": r["Portaria"] or None,
            "safra": SAFRA,
        }
        for dec in range(1, 37):
            valor = r.get(f"dec{dec}", "0").strip()
            if not valor or valor == "0":
                continue
            try:
                risco = int(valor)
            except ValueError:
                continue
            if risco not in (20, 30, 40):
                continue
            registros.append({**base, "decendio": dec, "nivel_risco": risco})
    return registros


def main():
    print("=" * 62)
    print("  ingerir_zarc_cevada.py — SOUFII (Fase 1)")
    print("=" * 62)

    print("[1/3] Lendo CSV e transformando wide -> long...")
    linhas = list(ler_linhas())
    print(f"      {len(linhas)} linhas wide lidas (Cevada Cervejeira, safra {SAFRA})")

    registros = transformar_para_long(linhas)
    print(f"      {len(registros)} registros long (município x decêndio x risco > 0)")

    municipios_unicos = len({r["codigo_ibge"] for r in registros})
    print(f"      {municipios_unicos} municípios distintos cobertos")

    print("\n[2/3] Limpando tabela zarc_cevada (reingestão idempotente)...")
    supabase.table("zarc_cevada").delete().gte("id", 0).execute()

    print("\n[3/3] Inserindo em lotes de 500...")
    total = len(registros)
    for i in range(0, total, 500):
        lote = registros[i:i + 500]
        for tentativa in range(3):
            try:
                supabase.table("zarc_cevada").insert(lote).execute()
                break
            except Exception as e:
                if tentativa == 2:
                    print(f"\n[ERRO] lote {i}-{i+len(lote)}: {e}")
                    raise
        print(f"  [{min(i+500, total)}/{total}] inseridos", end="\r", flush=True)

    print(f"\n\n[OK] {total} registros ZARC de cevada cervejeira inseridos.")
    print(f"     {municipios_unicos} municípios com elegibilidade real por decêndio.")
    print("=" * 62)


if __name__ == "__main__":
    main()
