# -*- coding: utf-8 -*-
"""
tratamento_dados.py - Sprint 2 - SOUFII - Desafio Agraria
Classifica municipios por aptidao para cultivo de cevada cervejeira.

Criterios tecnicos (ZARC/EMBRAPA):
  temperatura_media : 12-22 C
  precipitacao_anual: 400-1200mm
  altitude          : > 700m
  ph_solo           : 5.5-7.0

Classificacao:
  Apto              - atende 4 criterios
  Parcialmente Apto - atende 2-3 criterios
  Inapto            - atende 0-1 criterio
"""

import pandas as pd
import os
import sys

SEP = "=" * 62
SEP2 = "-" * 62

ENTRADA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados", "municipios_cevada.csv")
SAIDA   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados", "municipios_classificados.csv")

CRITERIOS = {
    "temperatura_media":  lambda v: 12.0 <= v <= 22.0,
    "precipitacao_anual": lambda v: 400  <= v <= 2000,
    "altitude":           lambda v: v >= 700,
    "ph_solo":            lambda v: 5.5  <= v <= 7.0,
}

TOTAL_CRITERIOS = len(CRITERIOS)


def classificar(n_aptos):
    if n_aptos == TOTAL_CRITERIOS:
        return "Apto"
    elif n_aptos >= 2:
        return "Parcialmente Apto"
    else:
        return "Inapto"


def main():
    if not os.path.exists(ENTRADA):
        print("[ERRO] Arquivo nao encontrado: " + ENTRADA)
        sys.exit(1)

    df = pd.read_csv(ENTRADA, encoding="utf-8")

    print("\n" + SEP)
    print("  SOUFII - Analise de Aptidao para Cevada - Sprint 2")
    print(SEP)
    print("[CSV] Carregado: " + ENTRADA)
    print("[DB]  Total de municipios: " + str(len(df)))

    # Aplicar criterios
    for col, fn in CRITERIOS.items():
        df["apto_" + col] = df[col].apply(lambda v: fn(v) if pd.notna(v) else False)

    df["criterios_atendidos"] = df[["apto_" + c for c in CRITERIOS]].sum(axis=1).astype(int)
    df["classificacao"]       = df["criterios_atendidos"].apply(classificar)
    df["score_aptidao"]       = (df["criterios_atendidos"] / TOTAL_CRITERIOS * 100).round(0).astype(int)

    total    = len(df)
    aptos    = (df["classificacao"] == "Apto").sum()
    parciais = (df["classificacao"] == "Parcialmente Apto").sum()
    inaptos  = (df["classificacao"] == "Inapto").sum()

    print("\n" + SEP2)
    print("  RESUMO DE CLASSIFICACAO")
    print(SEP2)
    print("  [+] Aptos              : {:5d}  ({:.1f}%)".format(aptos,    aptos/total*100))
    print("  [~] Parcialmente Aptos : {:5d}  ({:.1f}%)".format(parciais, parciais/total*100))
    print("  [-] Inaptos            : {:5d}  ({:.1f}%)".format(inaptos,  inaptos/total*100))
    print("      Total analisado    : {:5d}".format(total))

    print("\n" + SEP2)
    print("  DISTRIBUICAO POR ESTADO")
    print(SEP2)
    por_estado = df.groupby("estado")["classificacao"].value_counts().unstack(fill_value=0)
    for estado, row in por_estado.iterrows():
        a = row.get("Apto", 0)
        p = row.get("Parcialmente Apto", 0)
        i = row.get("Inapto", 0)
        print("  {:3s}  Aptos:{:3d}  Parciais:{:3d}  Inaptos:{:3d}".format(estado, a, p, i))

    print("\n" + SEP2)
    print("  TOP 10 MUNICIPIOS MAIS APTOS")
    print(SEP2)
    cols_top = ["municipio","estado","altitude","temperatura_media",
                "precipitacao_anual","ph_solo","criterios_atendidos","classificacao"]
    top10 = df.nlargest(10, ["criterios_atendidos","score_aptidao"])[cols_top]
    for i, (_, r) in enumerate(top10.iterrows(), 1):
        print("  {:2d}. {:<28} {}  Alt:{:5.0f}m  T:{:.1f}C  P:{:.0f}mm  pH:{:.1f}  [{}/{}] {}".format(
            i, r["municipio"], r["estado"], r["altitude"],
            r["temperatura_media"], r["precipitacao_anual"], r["ph_solo"],
            r["criterios_atendidos"], TOTAL_CRITERIOS, r["classificacao"]))

    print("\n" + SEP2)
    print("  CRITERIO MAIS LIMITANTE")
    print(SEP2)
    for col in CRITERIOS:
        reprovados = (~df["apto_" + col]).sum()
        print("  {:<25}: {:3d} reprovados ({:.1f}%)".format(col, reprovados, reprovados/total*100))

    # Salvar
    colunas_saida = ["municipio","estado","latitude","longitude",
                     "temperatura_media","precipitacao_anual","altitude","tipo_solo",
                     "ph_solo","periodo_seco","risco_geada",
                     "criterios_atendidos","score_aptidao","classificacao",
                     "apto_temperatura_media","apto_precipitacao_anual",
                     "apto_altitude","apto_ph_solo"]
    colunas_saida = [c for c in colunas_saida if c in df.columns]
    df[colunas_saida].sort_values(["criterios_atendidos","score_aptidao"], ascending=False)\
                     .to_csv(SAIDA, index=False, encoding="utf-8-sig")

    print("\n[OK] Resultado salvo em: " + SAIDA)
    print(SEP + "\n")


if __name__ == "__main__":
    main()
