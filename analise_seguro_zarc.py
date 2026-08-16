"""
analise_seguro_zarc.py
======================
Classifica municípios para cevada cruzando dados ZARC/SOUFII com cobertura
de seguro agrícola (PSR/PROAGRO). Identifica vizinhos 'Parcialmente Aptos'
que fazem fronteira com municípios 'Aptos' para priorização de expansão.

Uso:
    python analise_seguro_zarc.py
    python analise_seguro_zarc.py --seguro dados_seguro.csv
    python analise_seguro_zarc.py --saida resultado_seguro.xlsx
"""

import os
import sys
import json
import argparse
import warnings
import pandas as pd
import geopandas as gpd
from shapely.geometry import shape
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore")
load_dotenv()

# ── Configuração ──────────────────────────────────────────────────────────────
GEOJSON_PATH = os.path.join(
    os.path.dirname(__file__),
    "frontend", "public", "geojson", "municipios_br.json",
)

# Score mínimo para considerar "zoneado pelo ZARC" (recomendação da cultura)
SCORE_ZARC_MINIMO = 40   # municípios com score < 40 não têm aptidão ZARC


# ── 1. Carregar dados do SOUFII (Supabase) ───────────────────────────────────
def carregar_dados_soufii() -> pd.DataFrame:
    """Busca dados de aptidão do banco SOUFII (pagina para pegar todos os municípios,
    não só os primeiros 1000 retornados pela API)."""
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    cols = (
        "codigo_ibge, nome_municipio, uf, lat, lon, "
        "score_aptidao, score_ponderado, apto_geral, "
        "temp_media_anual, precipitacao_acumulada_anual, "
        "altitude, tipo_solo_zarc, risco_geada_pct, chuva_colheita_mm, "
        "frete_estimado_sc, zona_logistica, maltaria_referencia"
    )
    registros, offset = [], 0
    while True:
        batch = sb.table("municipios_aptidao").select(cols).range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000

    df = pd.DataFrame(registros)
    df["codigo_ibge"] = df["codigo_ibge"].astype(str).str.zfill(7)

    # score_ponderado (graduado por critério) é mais informativo que score_aptidao
    # (média simples de binários) — usa ponderado quando já foi calculado, com
    # fallback pro score simples pros municípios ainda não recalculados.
    if "score_ponderado" in df.columns:
        df["score_efetivo"] = df["score_ponderado"].fillna(df["score_aptidao"])
    else:
        df["score_efetivo"] = df["score_aptidao"]

    return df


# ── 2. Carregar / simular dados de seguro ────────────────────────────────────
def carregar_dados_seguro(caminho_csv: str | None, df_mun: pd.DataFrame) -> pd.DataFrame:
    """
    Retorna DataFrame com colunas [codigo_ibge, tem_seguro].
    Se um CSV for informado, carrega dele; caso contrário simula com heurística
    baseada nos municípios de maior score em PR/SC/RS (proxy de histórico PSR).
    """
    if caminho_csv and os.path.exists(caminho_csv):
        seg = pd.read_csv(caminho_csv, dtype={"codigo_ibge": str})
        seg["codigo_ibge"] = seg["codigo_ibge"].str.zfill(7)
        print(f"[seguro] {len(seg)} registros carregados de {caminho_csv}")
        return seg[["codigo_ibge", "tem_seguro"]]

    # Simulação: considera com seguro os municípios com score ≥ 70 nos estados
    # com maior histórico de PSR para cevada (PR, SC, RS, GO).
    UFS_COM_SEGURO = {"PR", "SC", "RS", "GO"}
    mask = (
        df_mun["uf"].isin(UFS_COM_SEGURO) &
        (df_mun["score_efetivo"].fillna(0) >= 70)
    )
    seg = df_mun[["codigo_ibge"]].copy()
    seg["tem_seguro"] = mask.values
    n = seg["tem_seguro"].sum()
    print(f"[seguro] SIMULADO — {n} municípios com seguro (score≥70 em PR/SC/RS/GO)")
    print("         Para dados reais: forneça --seguro <arquivo.csv> com colunas")
    print("         [codigo_ibge, tem_seguro] exportado do MAPA/PSR ou SUSEP.\n")
    return seg[["codigo_ibge", "tem_seguro"]]


# ── 3. Classificar aptidão ────────────────────────────────────────────────────
def classificar(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica as três categorias ZARC × Seguro:
      Apto            : zoneado_zarc AND tem_seguro
      Parcialmente Apto: zoneado_zarc AND NOT tem_seguro
      Inapto          : NOT zoneado_zarc
    """
    df = df.copy()
    df["zoneado_zarc"] = df["score_efetivo"].fillna(0) >= SCORE_ZARC_MINIMO

    def regra(row):
        if not row["zoneado_zarc"]:
            return "Inapto"
        return "Apto" if row["tem_seguro"] else "Parcialmente Apto"

    df["status_aptidao"] = df.apply(regra, axis=1)
    return df


# ── 4. Carregar geometrias ────────────────────────────────────────────────────
def carregar_geometrias() -> gpd.GeoDataFrame | None:
    """Carrega o GeoJSON de municípios e retorna um GeoDataFrame."""
    if not os.path.exists(GEOJSON_PATH):
        print(f"[geo] GeoJSON não encontrado em {GEOJSON_PATH} — análise de vizinhança desativada.")
        return None

    print(f"[geo] Carregando {GEOJSON_PATH} ...")
    gdf = gpd.read_file(GEOJSON_PATH)

    # Normaliza coluna de código IBGE (pode variar por versão do arquivo —
    # o municipios_br.json usado pelo mapa do frontend usa "codarea")
    for col in ["codarea", "CD_MUN", "CD_GEOCMU", "codigo_ibge", "id", "CD_GEOCODM"]:
        if col in gdf.columns:
            gdf = gdf.rename(columns={col: "codigo_ibge"})
            break

    gdf["codigo_ibge"] = gdf["codigo_ibge"].astype(str).str.zfill(7)
    print(f"[geo] {len(gdf)} polígonos carregados.")
    return gdf


# ── 5. Análise de vizinhança ──────────────────────────────────────────────────
def analisar_vizinhanca(df: pd.DataFrame, gdf: gpd.GeoDataFrame) -> pd.DataFrame:
    """
    Para cada município 'Parcialmente Apto', encontra vizinhos 'Aptos'
    e retorna um DataFrame com oportunidades de expansão de seguro.
    """
    # Junta status ao GeoDataFrame
    cols = ["codigo_ibge", "nome_municipio", "uf", "score_efetivo", "status_aptidao",
            "frete_estimado_sc", "zona_logistica", "maltaria_referencia"]
    geo = gdf.merge(df[cols], on="codigo_ibge", how="left")
    geo["status_aptidao"] = geo["status_aptidao"].fillna("Sem dados")

    # Reprojetar para métrico (SIRGAS 2000 UTM Zone 23S) para buffer correto
    geo_proj = geo.to_crs(epsg=31983)

    # Buffer mínimo para garantir toque mesmo em fronteiras simplificadas
    geo_proj["geometry"] = geo_proj.geometry.buffer(200)

    parciais = geo_proj[geo_proj["status_aptidao"] == "Parcialmente Apto"].copy()
    aptos    = geo_proj[geo_proj["status_aptidao"] == "Apto"].copy()

    if parciais.empty or aptos.empty:
        print("[viz] Nenhum par Parcialmente Apto ↔ Apto encontrado.")
        return pd.DataFrame()

    # Spatial join: parciais que tocam/intersectam aptos
    adjacencias = gpd.sjoin(
        parciais[["codigo_ibge", "nome_municipio", "uf", "score_efetivo",
                  "frete_estimado_sc", "zona_logistica", "maltaria_referencia", "geometry"]],
        aptos[["codigo_ibge", "nome_municipio", "uf", "geometry"]],
        how="left",
        predicate="intersects",
        lsuffix="parcial",
        rsuffix="apto",
    ).dropna(subset=["codigo_ibge_apto"])

    # Remove auto-matches (mesmo município)
    adjacencias = adjacencias[
        adjacencias["codigo_ibge_parcial"] != adjacencias["codigo_ibge_apto"]
    ]

    # Agrupa: para cada parcial, lista vizinhos aptos.
    # Só codigo_ibge/nome_municipio/uf colidem entre os dois lados do sjoin
    # (por isso ganham sufixo _parcial); score/frete/zona são exclusivos do
    # lado "parciais" e mantêm o nome original.
    resultado = (
        adjacencias
        .groupby(["codigo_ibge_parcial", "nome_municipio_parcial", "uf_parcial",
                  "score_efetivo", "frete_estimado_sc",
                  "zona_logistica", "maltaria_referencia"], dropna=False)
        .agg(
            vizinhos_aptos=("nome_municipio_apto", lambda x: "; ".join(sorted(x.unique()))),
            n_vizinhos_aptos=("codigo_ibge_apto", "nunique"),
        )
        .reset_index()
        .rename(columns={
            "codigo_ibge_parcial":    "codigo_ibge",
            "nome_municipio_parcial": "nome_municipio",
            "uf_parcial":             "uf",
            "score_efetivo":          "score_aptidao",
        })
    )

    # ── Score de prioridade de expansão ──────────────────────────────────────
    # Combina 3 fatores que importam pra Agrária decidir onde expandir seguro
    # primeiro: (1) quão apto agronomicamente o município já é, (2) quantos
    # vizinhos já aptos/segurados ele tem por perto (efeito de cluster —
    # mais fácil levar ATER/EMATER pra uma região já em expansão), e
    # (3) o quão barato é escoar a produção até a maltaria mais próxima
    # (frete alto inviabiliza mesmo um município agronomicamente bom).
    score_norm     = (resultado["score_aptidao"].fillna(0) / 100).clip(0, 1)
    vizinhos_norm  = (resultado["n_vizinhos_aptos"] / resultado["n_vizinhos_aptos"].max()).clip(0, 1) \
        if resultado["n_vizinhos_aptos"].max() else 0
    # Frete ausente (município ainda sem cálculo de logística) não penaliza nem beneficia
    frete_norm = 1 - (resultado["frete_estimado_sc"].fillna(resultado["frete_estimado_sc"].median() or 0) / 25).clip(0, 1)

    resultado["prioridade_expansao"] = (
        0.5 * score_norm + 0.3 * vizinhos_norm + 0.2 * frete_norm
    ).round(3)

    return resultado.sort_values(
        ["prioridade_expansao", "n_vizinhos_aptos", "score_aptidao"],
        ascending=[False, False, False],
    )


# ── 6. Resumo estatístico ─────────────────────────────────────────────────────
def imprimir_resumo(df: pd.DataFrame):
    sep = "=" * 65
    print(f"\n{sep}")
    print("  SOUFII × SEGURO — Análise de Aptidão para Cevada")
    print(sep)

    total = len(df)
    for status in ["Apto", "Parcialmente Apto", "Inapto", "Sem dados"]:
        n = (df["status_aptidao"] == status).sum()
        pct = n / total * 100 if total else 0
        print(f"  {status:<20}: {n:>5}  ({pct:.1f}%)")
    print(f"  {'Total analisado':<20}: {total:>5}")

    print(f"\n  POR UF (top 12 — Aptos + Parcialmente Aptos):")
    uf_tab = (
        df[df["status_aptidao"].isin(["Apto", "Parcialmente Apto"])]
        .groupby("uf")["status_aptidao"]
        .value_counts()
        .unstack(fill_value=0)
    )
    for uf, row in uf_tab.sort_values("Apto", ascending=False).head(12).iterrows():
        a = row.get("Apto", 0)
        p = row.get("Parcialmente Apto", 0)
        print(f"  {uf}  Aptos:{a:>4}  Parcialmente Aptos:{p:>4}")
    print(sep)


# ── 7. Exportar resultados ────────────────────────────────────────────────────
def exportar(df_classificado: pd.DataFrame, df_vizinhanca: pd.DataFrame, caminho: str):
    """Salva classificação completa + oportunidades de expansão em Excel ou CSV."""
    ext = os.path.splitext(caminho)[1].lower()

    if ext == ".xlsx":
        with pd.ExcelWriter(caminho, engine="openpyxl") as writer:
            df_classificado.to_excel(writer, sheet_name="Classificacao", index=False)
            if not df_vizinhanca.empty:
                df_vizinhanca.to_excel(writer, sheet_name="Expansao_Seguro", index=False)
        print(f"\n[export] Salvo em {caminho} (abas: Classificacao, Expansao_Seguro)")
    else:
        base = caminho.replace(".csv", "")
        df_classificado.to_csv(f"{base}_classificacao.csv", index=False, encoding="utf-8-sig")
        if not df_vizinhanca.empty:
            df_vizinhanca.to_csv(f"{base}_expansao.csv", index=False, encoding="utf-8-sig")
        print(f"\n[export] Salvos: {base}_classificacao.csv e {base}_expansao.csv")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Classificação ZARC × Seguro para Cevada")
    parser.add_argument("--seguro", default=None,
                        help="CSV com colunas [codigo_ibge, tem_seguro]. Omitir para simular.")
    parser.add_argument("--saida", default="resultado_seguro_zarc.xlsx",
                        help="Arquivo de saída (.xlsx ou .csv). Padrão: resultado_seguro_zarc.xlsx")
    parser.add_argument("--sem-geo", action="store_true",
                        help="Pular análise de vizinhança geoespacial.")
    args = parser.parse_args()

    # 1. Dados SOUFII
    print("[1/5] Carregando dados SOUFII do Supabase...")
    df_mun = carregar_dados_soufii()
    print(f"      {len(df_mun)} municípios carregados.\n")

    # 2. Dados de seguro
    print("[2/5] Carregando dados de seguro...")
    df_seg = carregar_dados_seguro(args.seguro, df_mun)

    # 3. Merge e classificação
    print("[3/5] Classificando municípios...")
    df = df_mun.merge(df_seg, on="codigo_ibge", how="left")
    df["tem_seguro"] = df["tem_seguro"].fillna(False)
    df = classificar(df)

    # 4. Análise de vizinhança
    df_viz = pd.DataFrame()
    if not args.sem_geo:
        print("[4/5] Análise de vizinhança geoespacial...")
        gdf = carregar_geometrias()
        if gdf is not None:
            df_viz = analisar_vizinhanca(df, gdf)
            print(f"      {len(df_viz)} municípios 'Parcialmente Aptos' com vizinhos 'Aptos' encontrados.")
    else:
        print("[4/5] Análise de vizinhança pulada (--sem-geo).")

    # 5. Resumo + exportação
    print("\n[5/5] Gerando resumo...")
    imprimir_resumo(df)

    if not df_viz.empty:
        print(f"\n  TOP 10 OPORTUNIDADES DE EXPANSÃO DE SEGURO "
              f"(ordenado por prioridade = 50% aptidão + 30% cluster de vizinhos + 20% frete):")
        print(f"  {'Município':<26} {'UF':<3} {'Score':>5} {'Vizinhos':>8} {'Frete R$/sc':>11} {'Prioridade':>10}")
        print(f"  {'-'*68}")
        for _, r in df_viz.head(10).iterrows():
            frete = r.get("frete_estimado_sc")
            frete_str = f"{frete:.2f}" if pd.notna(frete) else "—"
            print(f"  {r['nome_municipio']:<26} {r['uf']:<3} {int(r['score_aptidao'] or 0):>5} "
                  f"{r['n_vizinhos_aptos']:>8} {frete_str:>11} {r['prioridade_expansao']:>10.3f}")

    exportar(df, df_viz, args.saida)


if __name__ == "__main__":
    main()
