"""
recoletar_clima.py
==================
Reprocessa APENAS os dados climáticos (NASA POWER) para todos os
municípios já no banco, corrigindo o bug de mm/dia vs mm/mes.
NÃO re-busca SoilGrids para municípios que já têm solo real.

Execução: python recoletar_clima.py
"""
import os, time, requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

SLEEP = 2.0


def get(url, params=None, tentativas=4, timeout=60):
    for _ in range(tentativas):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                print(" [rate limit 60s]", end="", flush=True)
                time.sleep(60)
                continue
            return r
        except requests.exceptions.RequestException:
            time.sleep(4)
    return None


def buscar_clima(lat, lon):
    r = get("https://power.larc.nasa.gov/api/temporal/monthly/point",
            params={"parameters": "T2M_MIN,T2M,PRECTOTCORR", "community": "ag",
                    "longitude": lon, "latitude": lat, "start": "1993", "end": "2024", "format": "JSON"})
    if not r or r.status_code != 200:
        return None
    try:
        p = r.json()["properties"]["parameter"]
        dates = [k for k in p["T2M"] if len(k) == 6 and k.isdigit() and 1 <= int(k[4:]) <= 12]
        df = pd.DataFrame({col: {k: p[col][k] for k in dates} for col in ["T2M", "T2M_MIN", "PRECTOTCORR"]})
        df.index = pd.to_datetime(df.index, format="%Y%m")
        df = df.replace(-999.0, pd.NA).dropna()
        # Converte mm/dia -> mm/mes (NASA POWER retorna taxa diária)
        df["PREC_MM"] = df["PRECTOTCORR"] * df.index.days_in_month
        df["mes"] = df.index.month
        return df
    except Exception:
        return None


def calcular_aptidao(tipo_zarc, temp, chuva, alt, geada, colheita):
    c = [
        tipo_zarc is not None and tipo_zarc >= 2,
        temp is not None and 10.0 <= temp <= 22.0,
        chuva is not None and 400.0 <= chuva <= 2000.0,
        alt is not None and alt >= 700.0,
        geada is not None and geada < 30.0,
        colheita is not None and colheita < 350.0,
    ]
    return all(c), int(round(sum(c) / len(c) * 100))


def main():
    print("Buscando todos os municipios no banco...")
    r = supabase.table("municipios_aptidao") \
        .select("codigo_ibge, nome_municipio, uf, lat, lon, altitude, tipo_solo_zarc, pct_argila, tipo_solo") \
        .not_.is_("lat", "null") \
        .execute()

    todos = r.data or []
    print(f"Total a reprocessar: {len(todos)} municipios")
    print(f"Tempo estimado: ~{len(todos) * SLEEP / 60:.0f} min\n")

    ok_count = 0
    fail_count = 0

    for i, m in enumerate(todos, 1):
        cod  = m["codigo_ibge"]
        nome = m["nome_municipio"]
        uf   = m["uf"]
        lat  = m["lat"]
        lon  = m["lon"]
        alt  = m.get("altitude")

        print(f"[{i}/{len(todos)}] {nome}/{uf} ...", end=" ", flush=True)

        df = buscar_clima(lat, lon)
        if df is None:
            print("FALHA (NASA POWER)")
            fail_count += 1
            time.sleep(SLEEP)
            continue

        medias = df.groupby("mes").agg(
            T2M=("T2M", "mean"),
            T2M_MIN=("T2M_MIN", "mean"),
            PREC_MM=("PREC_MM", "mean"),
        ).reset_index()

        temp_anual  = float(medias["T2M"].mean())
        chuva_anual = float(medias["PREC_MM"].sum())

        ja = df[df["mes"].isin([7, 8])]
        geada = round(ja[ja["T2M_MIN"] <= 2.0].shape[0] / len(ja) * 100, 1) if len(ja) > 0 else 0.0

        on = df[df["mes"].isin([10, 11])]
        colheita = round(on.groupby(on.index.year)["PREC_MM"].sum().mean(), 1) if len(on) > 0 else None

        tipo_zarc = m.get("tipo_solo_zarc")
        apto, score = calcular_aptidao(tipo_zarc, temp_anual, chuva_anual, alt, geada, colheita)

        supabase.table("municipios_aptidao").update({
            "temp_media_anual":               round(temp_anual, 2),
            "precipitacao_acumulada_anual":   round(chuva_anual, 2),
            "risco_geada_pct":                geada,
            "chuva_colheita_mm":              colheita,
            "apto_geral":                     apto,
            "score_aptidao":                  score,
        }).eq("codigo_ibge", cod).execute()

        # Sazonalidade mensal
        registros = [
            {
                "codigo_ibge": cod,
                "mes":          int(row["mes"]),
                "temp_media":   round(row["T2M"], 2),
                "temp_min":     round(row["T2M_MIN"], 2),
                "precipitacao": round(row["PREC_MM"], 2),
                "apto_no_mes":  bool(10.0 <= row["T2M"] <= 22.0),
            }
            for _, row in medias.iterrows()
        ]
        supabase.table("sazonalidade_mensal").upsert(registros, on_conflict="codigo_ibge,mes").execute()

        print(f"OK T={temp_anual:.1f}C P={chuva_anual:.0f}mm geada={geada}% score={score}")
        ok_count += 1

        if i % 50 == 0:
            print(f"\n--- Progresso: {i}/{len(todos)} | OK:{ok_count} FAIL:{fail_count} ---\n")

        time.sleep(SLEEP)

    print(f"\nConcluido: {ok_count} atualizados, {fail_count} falhas.")


if __name__ == "__main__":
    main()
