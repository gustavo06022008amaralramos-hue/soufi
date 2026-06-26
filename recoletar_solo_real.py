"""
recoletar_solo_real.py
======================
Substitui dados de solo ESTIMADOS por medições reais do SoilGrids ISRIC.
Processa apenas municípios com "(est.)" no campo tipo_solo e UF fora das
prioritárias (as prioritárias são tratadas pelo coleta_prioritario.py).

Execução: python recoletar_solo_real.py
"""
import os, time, requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Estados já tratados por coleta_prioritario.py — não processar aqui
UFS_PRIORITARIAS = {'PR', 'SC', 'RS', 'GO', 'MG', 'SP', 'MS', 'MT', 'BA'}
SLEEP = 2.0


def get(url, tentativas=4, timeout=30):
    for _ in range(tentativas):
        try:
            r = requests.get(url, timeout=timeout)
            if r.status_code == 429:
                print(" [rate limit 60s]", end="", flush=True)
                time.sleep(60)
                continue
            return r
        except requests.exceptions.RequestException:
            time.sleep(4)
    return None


def buscar_solo_zarc(lat, lon):
    weights = [5, 10, 5]
    offsets = [(0, 0), (0, .1), (0, -.1), (.1, 0), (-.1, 0),
               (.1, .1), (-.1, -.1), (.2, 0), (0, .2)]

    for dlat, dlon in offsets:
        la = round(lat + dlat, 4)
        lo = round(lon + dlon, 4)
        url = (f"https://rest.isric.org/soilgrids/v2.0/properties/query?"
               f"lon={lo}&lat={la}&property=clay"
               "&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean")
        r = get(url, timeout=30)
        if not r or r.status_code != 200:
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
            pct = round(
                sum(v * w for v, w in zip(depth_vals, weights[:len(depth_vals)]))
                / w_sum / 10.0, 1
            )
            tipo = 1 if pct < 15 else (2 if pct <= 35 else 3)
            nomes = {1: "Tipo 1 - Arenoso", 2: "Tipo 2 - Textura Media", 3: "Tipo 3 - Argiloso"}
            return pct, tipo, nomes[tipo]
        except Exception:
            continue

    return None, None, None


def calcular_score(m, tipo_zarc):
    temp   = m.get("temp_media_anual")
    chuva  = m.get("precipitacao_acumulada_anual")
    alt    = m.get("altitude")
    geada  = m.get("risco_geada_pct")
    colh   = m.get("chuva_colheita_mm")

    criterios = [
        tipo_zarc is not None and tipo_zarc >= 2,
        temp is not None and 10.0 <= temp <= 22.0,
        chuva is not None and 400.0 <= chuva <= 2000.0,
        alt is not None and alt >= 700.0,
        geada is not None and geada < 30.0,
        colh is not None and colh < 250.0,
    ]
    apto  = all(criterios)
    score = int(round(sum(criterios) / len(criterios) * 100))
    return apto, score


def main():
    print("Buscando municipios com solo estimado (non-prioritarios)...")
    r = supabase.table("municipios_aptidao") \
        .select("codigo_ibge, nome_municipio, uf, lat, lon, tipo_solo, "
                "temp_media_anual, precipitacao_acumulada_anual, altitude, "
                "risco_geada_pct, chuva_colheita_mm") \
        .execute()

    todos = r.data or []
    pendentes = [
        m for m in todos
        if "(est.)" in (m.get("tipo_solo") or "")
        and m.get("uf") not in UFS_PRIORITARIAS
        and m.get("lat") is not None
    ]

    print(f"Municipios com solo estimado non-prioritarios: {len(pendentes)}")
    if not pendentes:
        print("Nada a processar.")
        return

    atualizados = 0
    falhas = 0

    for i, m in enumerate(pendentes, 1):
        cod  = m["codigo_ibge"]
        nome = m["nome_municipio"]
        uf   = m["uf"]
        lat  = m["lat"]
        lon  = m["lon"]

        print(f"[{i}/{len(pendentes)}] {nome}/{uf} ({lat},{lon}) ...", end=" ", flush=True)

        pct, tipo, nome_solo = buscar_solo_zarc(lat, lon)

        if pct is None:
            print("FALHA (SoilGrids sem resposta)")
            falhas += 1
            time.sleep(SLEEP)
            continue

        apto, score = calcular_score(m, tipo)

        supabase.table("municipios_aptidao").update({
            "pct_argila":     pct,
            "tipo_solo_zarc": tipo,
            "tipo_solo":      nome_solo,
            "apto_geral":     apto,
            "score_aptidao":  score,
        }).eq("codigo_ibge", cod).execute()

        print(f"OK argila={pct}% tipo={tipo} score={score}")
        atualizados += 1
        time.sleep(SLEEP)

    print(f"\nConcluido: {atualizados} atualizados, {falhas} falhas.")


if __name__ == "__main__":
    main()
