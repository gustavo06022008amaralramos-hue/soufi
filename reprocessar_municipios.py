# -*- coding: utf-8 -*-
"""
reprocessar_municipios.py
===========================
Reprocessa clima (NASA POWER) + solo (SoilGrids/fallback) + score + frete
para uma lista específica de municípios cujas COORDENADAS mudaram depois da
coleta original (ex: corrigidos por fix_geocodificacao.py ou pela validação
cruzada de altitude/IBGE — Bloco 1.4).

Isso existe porque fix_geocodificacao.py só corrige lat/lon/altitude — não
recalcula clima/solo/score, que ficam desatualizados (calculados pra
coordenada errada antiga) até rodar este script.

Uso:
    python reprocessar_municipios.py --codigos 1200179,3550308
    python reprocessar_municipios.py --arquivo lista_codigos.json
"""
import os
import sys
import json
import time
import argparse
import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

import calcular_score_ponderado as csp
import calcular_frete as cf

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def requisicao_com_retry(url, params=None, tentativas=3, timeout=20):
    for _ in range(tentativas):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                time.sleep(30)
                continue
            return r
        except requests.exceptions.RequestException:
            time.sleep(3)
    return None


def buscar_solo_zarc(lat, lon):
    weights = [5, 10, 5]
    offsets = [(0, 0), (0, .1), (0, -.1), (.1, 0), (-.1, 0),
               (.1, .1), (-.1, -.1), (.2, 0), (0, .2)]
    for dlat, dlon in offsets:
        la, lo = round(lat + dlat, 4), round(lon + dlon, 4)
        query = (f"lon={lo}&lat={la}&property=clay"
                 "&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean")
        r = requisicao_com_retry(
            f"https://rest.isric.org/soilgrids/v2.0/properties/query?{query}", timeout=30)
        if r is None or r.status_code != 200:
            continue
        try:
            layers = r.json()["properties"]["layers"]
            if not layers:
                continue
            depth_vals = [d["values"]["mean"] for d in layers[0]["depths"]
                          if d["values"]["mean"] is not None]
            if not depth_vals:
                continue
            w_sum = sum(weights[:len(depth_vals)])
            pct = round(sum(v * w for v, w in zip(depth_vals, weights[:len(depth_vals)]))
                        / w_sum / 10.0, 1)
            if pct < 15.0:
                return pct, 1, "Tipo 1 - Arenoso"
            elif pct <= 35.0:
                return pct, 2, "Tipo 2 - Textura Média"
            else:
                return pct, 3, "Tipo 3 - Argiloso"
        except Exception:
            continue
    return None, None, None


def buscar_clima_nasa_power(lat, lon):
    url = "https://power.larc.nasa.gov/api/temporal/monthly/point"
    params = {
        "parameters": "T2M_MIN,T2M,PRECTOTCORR", "community": "ag",
        "longitude": lon, "latitude": lat, "start": "1993", "end": "2024", "format": "JSON",
    }
    r = requisicao_com_retry(url, params=params, timeout=60)
    if r is None or r.status_code != 200:
        return None
    try:
        param_data = r.json()["properties"]["parameter"]
        dates = [k for k in param_data["T2M"].keys()
                 if len(k) == 6 and k.isdigit() and 1 <= int(k[4:]) <= 12]
        df = pd.DataFrame({col: {k: param_data[col][k] for k in dates}
                            for col in ["T2M", "T2M_MIN", "PRECTOTCORR"]})
        df.index = pd.to_datetime(df.index, format="%Y%m")
        df = df.replace(-999.0, pd.NA).dropna()
        df["PREC_MM"] = df["PRECTOTCORR"] * df.index.days_in_month
        df["mes"] = df.index.month
        return df
    except Exception:
        return None


def calcular_aptidao(temp, chuva, alt, tipo_zarc, geada, colheita):
    criterios = [
        tipo_zarc is not None and tipo_zarc >= 2,
        10.0 <= temp <= 22.0,
        400.0 <= chuva <= 2000.0,
        alt >= 700.0,
        geada < 30.0,
        colheita is not None and 120.0 <= colheita <= 400.0,
    ]
    return all(criterios), int(round(sum(criterios) / len(criterios) * 100))


def reprocessar_um(m):
    cod, nome, uf = m["codigo_ibge"], m["nome_municipio"], m["uf"]
    lat, lon = m["lat"], m["lon"]

    pct_argila, tipo_zarc, nome_solo = buscar_solo_zarc(lat, lon)
    df_clima = buscar_clima_nasa_power(lat, lon)
    if df_clima is None:
        return False, f"{nome}/{uf}: erro NASA POWER"

    medias = df_clima.groupby("mes").agg(
        T2M=("T2M", "mean"), T2M_MIN=("T2M_MIN", "mean"), PREC_MM=("PREC_MM", "mean")
    ).reset_index()
    temp_anual = float(medias["T2M"].mean())
    chuva_anual = float(medias["PREC_MM"].sum())

    meses_jul_ago = df_clima[df_clima["mes"].isin([7, 8])]
    total_ja = len(meses_jul_ago)
    geada_pct = round((meses_jul_ago[meses_jul_ago["T2M_MIN"] <= 2.0].shape[0] / total_ja * 100), 1) \
        if total_ja > 0 else 0.0

    df_out_nov = df_clima[df_clima["mes"].isin([10, 11])]
    colheita_mm = round(df_out_nov.groupby(df_out_nov.index.year)["PREC_MM"].sum().mean(), 1) \
        if len(df_out_nov) > 0 else None

    apto, score = calcular_aptidao(temp_anual, chuva_anual, m["altitude"], tipo_zarc,
                                    geada_pct, colheita_mm or 0.0)

    registro_dados = {
        "pct_argila": pct_argila, "tipo_solo_zarc": tipo_zarc,
        "tipo_solo": nome_solo or m.get("tipo_solo"),
        "temp_media_anual": round(temp_anual, 2),
        "precipitacao_acumulada_anual": round(chuva_anual, 2),
        "risco_geada_pct": geada_pct, "chuva_colheita_mm": colheita_mm,
        "apto_geral": apto, "score_aptidao": score,
    }
    score_pond = csp.calcular_score_ponderado({**m, **registro_dados})
    registro_dados["score_ponderado"] = score_pond

    logistica = cf.calcular_logistica(lat, lon)
    registro_dados.update(logistica)

    supabase.table("municipios_aptidao").update(registro_dados).eq("codigo_ibge", cod).execute()

    registros_mes = [{
        "codigo_ibge": cod, "mes": int(row["mes"]),
        "temp_media": round(float(row["T2M"]), 2), "temp_min": round(float(row["T2M_MIN"]), 2),
        "precipitacao": round(float(row["PREC_MM"]), 2),
        "apto_no_mes": bool(10.0 <= row["T2M"] <= 22.0),
    } for _, row in medias.iterrows()]
    supabase.table("sazonalidade_mensal").upsert(registros_mes, on_conflict="codigo_ibge,mes").execute()

    return True, f"{nome}/{uf}: score={score} score_pond={score_pond} apto={apto}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--codigos", default=None, help="Lista de codigo_ibge separados por vírgula")
    parser.add_argument("--arquivo", default=None, help="JSON com lista de codigo_ibge")
    args = parser.parse_args()

    if args.codigos:
        codigos = [c.strip() for c in args.codigos.split(",")]
    elif args.arquivo:
        with open(args.arquivo, encoding="utf-8") as f:
            codigos = json.load(f)
    else:
        print("Informe --codigos ou --arquivo")
        sys.exit(1)

    print(f"[reprocessar] {len(codigos)} municípios")
    registros = []
    for cod in codigos:
        r = supabase.table("municipios_aptidao").select(
            "codigo_ibge, nome_municipio, uf, lat, lon, altitude, tipo_solo"
        ).eq("codigo_ibge", cod).maybe_single().execute()
        if r.data:
            registros.append(r.data)
        else:
            print(f"  [!] {cod} não encontrado no banco")

    ok, falhas = 0, []
    for i, m in enumerate(registros, 1):
        try:
            sucesso, msg = reprocessar_um(m)
        except Exception as e:
            sucesso, msg = False, f"{m['nome_municipio']}/{m['uf']}: {e}"
        print(f"  [{i}/{len(registros)}] {msg}")
        if sucesso:
            ok += 1
        else:
            falhas.append(msg)
        time.sleep(0.5)

    print(f"\n[OK] {ok}/{len(registros)} reprocessados. Falhas: {len(falhas)}")
    for f in falhas:
        print(f"   - {f}")


if __name__ == "__main__":
    main()
