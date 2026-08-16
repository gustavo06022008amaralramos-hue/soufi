# -*- coding: utf-8 -*-
"""
validar_altitude_ibge.py
==========================
Bloco 1.4 — Validação cruzada de coordenadas/altitude contra o centróide
oficial do IBGE.

Em vez de bater na API de malhas do IBGE 5.571 vezes (pesada — cada resposta
é uma geometria completa), usamos o GeoJSON de municípios do IBGE que já está
em frontend/public/geojson/municipios_br.json (a mesma fonte que desenha o
mapa) e calculamos o centróide de cada polígono localmente.

Se a coordenada usada na coleta estiver a mais de 50km do centróide oficial:
  - marca coordenada_divergente = TRUE
  - substitui lat/lon pelo centróide do IBGE
  - busca uma nova altitude (Open-Meteo elevation) para a coordenada corrigida
  - marca fonte_altitude = "IBGE centroide (malha municipal)"
Senão:
  - coordenada_divergente = FALSE
  - fonte_altitude = "Open-Meteo/SRTM" (mantém o que já tinha)

Municípios corrigidos aqui precisam ser reprocessados depois (clima/solo/score
ficaram calculados pra coordenada antiga) — ver reprocessar_municipios.py.
O script salva a lista de codigo_ibge corrigidos em
scratch_codigos_divergentes.json pra alimentar o reprocessamento.

Uso: python validar_altitude_ibge.py
"""
import os
import sys
import json
import math
import time
import requests
import geopandas as gpd
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "frontend", "public", "geojson", "municipios_br.json")
LIMIAR_KM = 50.0
RAIO_TERRA_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = la2 - la1, lo2 - lo1
    a = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return 2 * RAIO_TERRA_KM * math.asin(math.sqrt(a))


def carregar_centroides():
    print("[geo] Carregando GeoJSON e calculando centróides...")
    gdf = gpd.read_file(GEOJSON_PATH)
    gdf["codigo_ibge"] = gdf["codarea"].astype(str).str.zfill(7)
    centroides = gdf.geometry.centroid
    return {
        cod: (pt.y, pt.x)  # (lat, lon)
        for cod, pt in zip(gdf["codigo_ibge"], centroides)
    }


def buscar_altitude(lat, lon):
    try:
        r = requests.get(
            f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}",
            timeout=15,
        )
        if r.status_code == 200:
            vals = r.json().get("elevation", [0])
            return float(vals[0]) if vals else 0.0
    except Exception:
        pass
    return None


def buscar_todos():
    registros, offset = [], 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, nome_municipio, uf, lat, lon, altitude"
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
    print("  validar_altitude_ibge.py — SOUFII")
    print("=" * 62)

    centroides = carregar_centroides()
    print(f"[geo] {len(centroides)} centróides calculados\n")

    registros = buscar_todos()
    total = len(registros)
    print(f"[DB] {total} municípios a validar\n")

    divergentes = []
    sem_geometria = 0
    ok_sem_mudanca = 0

    for i, m in enumerate(registros, 1):
        cod = m["codigo_ibge"]
        centro = centroides.get(cod)
        if centro is None:
            sem_geometria += 1
            continue

        clat, clon = centro
        lat, lon = m.get("lat"), m.get("lon")

        if lat is None or lon is None:
            dist = 9999.0
        else:
            dist = haversine_km(lat, lon, clat, clon)

        if dist > LIMIAR_KM:
            nova_alt = buscar_altitude(clat, clon)
            supabase.table("municipios_aptidao").update({
                "lat": clat, "lon": clon,
                "altitude": nova_alt if nova_alt is not None else m.get("altitude"),
                "coordenada_divergente": True,
                "fonte_altitude": "IBGE centroide (malha municipal)",
            }).eq("codigo_ibge", cod).execute()
            divergentes.append(cod)
            print(f"  [{i}/{total}] {m['nome_municipio']}/{m['uf']}: "
                  f"{dist:.0f}km do centróide -> corrigido p/ ({clat:.4f},{clon:.4f})")
            time.sleep(0.3)
        else:
            supabase.table("municipios_aptidao").update({
                "coordenada_divergente": False,
                "fonte_altitude": "Open-Meteo/SRTM",
            }).eq("codigo_ibge", cod).execute()
            ok_sem_mudanca += 1

        if i % 200 == 0:
            print(f"  ... [{i}/{total}] processados, {len(divergentes)} divergentes até agora")

    with open("scratch_codigos_divergentes.json", "w", encoding="utf-8") as f:
        json.dump(divergentes, f)

    print("\n" + "=" * 62)
    print(f"  Divergentes (>{LIMIAR_KM:.0f}km, corrigidos)     : {len(divergentes)}")
    print(f"  OK (dentro do limiar)                : {ok_sem_mudanca}")
    print(f"  Sem geometria no GeoJSON              : {sem_geometria}")
    print(f"  Lista salva em scratch_codigos_divergentes.json")
    print("  PRÓXIMO PASSO: rodar reprocessar_municipios.py --arquivo scratch_codigos_divergentes.json")
    print("=" * 62)


if __name__ == "__main__":
    main()
