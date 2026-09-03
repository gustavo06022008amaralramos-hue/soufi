# -*- coding: utf-8 -*-
"""
ingerir_zarc_multicultura.py
==============================
Fase 7 do plano de 10 fases: ingestão do ZARC oficial de trigo e soja por
município, decêndio a decêndio — mesma lógica testada em
ingerir_zarc_cevada.py (Fase 1), generalizada por cultura.

Fonte real: MAPA, dataset aberto "Tábua de Risco - Zoneamento Agrícola de
Risco Climático" (dados.agricultura.gov.br), safra 2025/2026 — já baixado
na Fase 1 (zarc_dados/tabua_risco_2025_2026.csv). Confirmado por contagem
real antes de escrever este script: 71.968 linhas wide de "Trigo" e 94.605
de "Soja", com a mesma decodificação de Cod_Ciclo (20/21/22=Grupo I/II/III)
e Cod_Solo (11-16=AD1-AD6) que cevada usa.

Pré-requisito: rodar migrations/007_zarc_trigo_soja.sql no Supabase antes.

Uso: python ingerir_zarc_multicultura.py
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

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zarc_dados", "tabua_risco_2025_2026.csv")
SAFRA = "2025/2026"

CICLOS = {20: "Grupo I", 21: "Grupo II", 22: "Grupo III"}
SOLOS = {11: "AD1", 12: "AD2", 13: "AD3", 14: "AD4", 15: "AD5", 16: "AD6"}
MANEJOS = {1: "Sequeiro", 2: "Irrigado", 3: "Irrigado com controle de geada"}

# Nome_cultura exato no CSV (exclui "Trigo - Duplo Propósito", que é outro
# sistema de cultivo, não a cultivar de trigo pão/malte deste app) -> tabela.
CULTURAS = {
    "Trigo": "zarc_trigo",
    "Soja": "zarc_soja",
}

HEADER = [
    "Nome_cultura", "SafraIni", "SafraFin", "Cod_Cultura", "Cod_Ciclo", "Cod_Solo",
    "geocodigo", "UF", "municipio", "Cod_Clima", "Nome_Clima", "Cod_Outros_Manejos",
    "Nome_Outros_Manejos", "Produtividade", "Cod_NM", "Cod_Munic", "Cod_Meso",
    "Cod_Micro", "Portaria",
] + [f"dec{i}" for i in range(1, 37)]


def ler_linhas(nome_cultura):
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        for row in reader:
            if len(row) != len(HEADER):
                continue
            if row[0] != nome_cultura:
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


def ingerir_cultura(nome_cultura, tabela):
    print(f"\n[{nome_cultura}] lendo CSV e transformando wide -> long...")
    linhas = list(ler_linhas(nome_cultura))
    print(f"  {len(linhas)} linhas wide lidas (safra {SAFRA})")

    registros = transformar_para_long(linhas)
    municipios_unicos = len({r["codigo_ibge"] for r in registros})
    print(f"  {len(registros)} registros long | {municipios_unicos} municípios distintos")

    print(f"  limpando tabela {tabela} (reingestão idempotente)...")
    supabase.table(tabela).delete().gte("id", 0).execute()

    total = len(registros)
    for i in range(0, total, 500):
        lote = registros[i:i + 500]
        for tentativa in range(3):
            try:
                supabase.table(tabela).insert(lote).execute()
                break
            except Exception as e:
                if tentativa == 2:
                    print(f"\n  [ERRO] lote {i}-{i+len(lote)}: {e}")
                    raise
        print(f"  [{min(i+500, total)}/{total}] inseridos", end="\r", flush=True)

    print(f"\n  [OK] {total} registros de {nome_cultura} inseridos em {tabela}.")
    return total, municipios_unicos


def main():
    print("=" * 62)
    print("  ingerir_zarc_multicultura.py — SOUFII (Fase 7)")
    print("=" * 62)

    resumo = []
    for nome_cultura, tabela in CULTURAS.items():
        total, municipios = ingerir_cultura(nome_cultura, tabela)
        resumo.append((nome_cultura, total, municipios))

    print("\n" + "=" * 62)
    for nome_cultura, total, municipios in resumo:
        print(f"  {nome_cultura}: {total} registros, {municipios} municípios")
    print("=" * 62)


if __name__ == "__main__":
    main()
