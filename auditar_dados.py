# -*- coding: utf-8 -*-
"""
auditar_dados.py
==================
Auditoria de qualidade dos dados de municipios_aptidao. Só LÊ o banco e
lista problemas — não corrige nada. Cada verificação nasceu de um erro real
encontrado na base:

  - campo obrigatório nulo            (6 municípios do AM sem argila)
  - altitude <= 0 ou valor-sentinela  (Bacuri/MA e Chaves/PA com 0 m;
                                       Balneário Pinhal/RS e Ilhéus/BA com 9999)
  - coordenadas repetidas             (Camboriú com a coordenada de Balneário
                                       Camboriú; São Francisco/SE com a de Brejo Grande)
  - chuva anual < 300 mm              (92 municípios com chuva em mm/dia, não mm/mês)
  - solo estimado "(est.)"            (solo_regional.py, não medido)
  - flag ZARC ainda não calculada     (tem_zarc_cevada nulo)

Uso: python auditar_dados.py        (sai com código 1 se achar problema)
"""
import collections
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

OBRIGATORIOS = ["lat", "lon", "altitude", "pct_argila", "tipo_solo_zarc", "temp_media_anual",
                "precipitacao_acumulada_anual", "risco_geada_pct", "chuva_colheita_mm",
                "score_aptidao", "score_ponderado", "score_trigo", "score_soja"]


def buscar_todos():
    cols = "codigo_ibge, nome_municipio, uf, tipo_solo, tem_zarc_cevada, " + ", ".join(OBRIGATORIOS)
    linhas, offset = [], 0
    while True:
        lote = supabase.table("municipios_aptidao").select(cols).range(offset, offset + 999).execute().data
        linhas += lote
        if len(lote) < 1000:
            return linhas
        offset += 1000


def nomes(lista, n=8):
    txt = ", ".join(f"{m['nome_municipio']}/{m['uf']}" for m in lista[:n])
    return txt + (f" … (+{len(lista) - n})" if len(lista) > n else "")


def main():
    rows = buscar_todos()
    problemas = []

    def checar(titulo, lista):
        status = "OK " if not lista else "ERRO"
        print(f"[{status}] {titulo}: {len(lista)}" + (f"  → {nomes(lista)}" if lista else ""))
        if lista:
            problemas.append(titulo)

    print(f"municipios_aptidao: {len(rows)} linhas\n")
    for c in OBRIGATORIOS:
        checar(f"{c} nulo", [m for m in rows if m[c] is None])
    checar("altitude <= 0 ou >= 3000 m (Brasil: máx. ~2.995 m)",
           [m for m in rows if m["altitude"] is not None and (m["altitude"] <= 0 or m["altitude"] >= 3000)])
    pos = collections.defaultdict(list)
    for m in rows:
        if m["lat"] is not None:
            pos[(round(m["lat"], 3), round(m["lon"], 3))].append(m)
    checar("coordenadas repetidas entre municípios", [m for g in pos.values() if len(g) > 1 for m in g])
    checar("chuva anual < 300 mm (provável mm/dia não convertido)",
           [m for m in rows if (m["precipitacao_acumulada_anual"] or 999) < 300])
    checar("temperatura média fora de 10–30 °C",
           [m for m in rows if m["temp_media_anual"] is not None and not 10 <= m["temp_media_anual"] <= 30])
    checar('solo estimado por regra "(est.)", não medido',
           [m for m in rows if "(est.)" in (m["tipo_solo"] or "")])
    checar("tem_zarc_cevada não calculado (rodar atualizar_flag_zarc_real.py)",
           [m for m in rows if m["tem_zarc_cevada"] is None])

    print(f"\n{'Nenhum problema encontrado.' if not problemas else f'{len(problemas)} tipo(s) de problema.'}")
    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
