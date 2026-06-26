# -*- coding: utf-8 -*-
"""
fix_geocodificacao.py
Detecta municipios com coordenadas fora do bounding box do estado
e os re-geocodifica usando a busca com UF.
"""
import os, time, requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

SLEEP = 1.2

UF_ESTADO = {
    "AC":"Acre","AL":"Alagoas","AM":"Amazonas","AP":"Amapa","BA":"Bahia",
    "CE":"Ceara","DF":"Distrito Federal","ES":"Espirito Santo","GO":"Goias",
    "MA":"Maranhao","MG":"Minas Gerais","MS":"Mato Grosso do Sul",
    "MT":"Mato Grosso","PA":"Para","PB":"Paraiba","PE":"Pernambuco",
    "PI":"Piaui","PR":"Parana","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte",
    "RO":"Rondonia","RR":"Roraima","RS":"Rio Grande do Sul",
    "SC":"Santa Catarina","SE":"Sergipe","SP":"Sao Paulo","TO":"Tocantins",
}

BBOX_UF = {
    "AC":(-11.1,-7.1,-74.0,-66.6),"AL":(-10.5,-8.8,-38.2,-35.1),
    "AM":(-9.9,2.3,-73.8,-56.1),"AP":(-1.3,4.4,-52.0,-49.9),
    "BA":(-18.4,-8.5,-46.6,-37.3),"CE":(-7.8,-2.8,-41.4,-37.2),
    "DF":(-16.1,-15.5,-48.3,-47.3),"ES":(-21.3,-17.8,-41.9,-39.7),
    "GO":(-19.5,-12.4,-53.3,-45.9),"MA":(-10.4,-1.0,-48.7,-41.8),
    "MG":(-22.9,-14.2,-51.0,-39.9),"MS":(-24.1,-17.2,-57.7,-50.9),
    "MT":(-18.1,-7.4,-61.7,-50.2),"PA":(-9.9,2.6,-58.7,-46.0),
    "PB":(-8.3,-6.0,-38.8,-34.8),"PE":(-9.5,-7.2,-41.4,-34.9),
    "PI":(-11.1,-2.8,-45.9,-40.4),"PR":(-26.7,-22.5,-54.6,-48.0),
    "RJ":(-23.4,-20.8,-44.9,-40.9),"RN":(-6.9,-4.8,-38.6,-35.0),
    "RO":(-13.7,-7.9,-66.8,-59.8),"RR":(-1.4,5.3,-64.8,-59.8),
    "RS":(-33.8,-27.1,-57.7,-49.7),"SC":(-29.4,-25.9,-53.9,-48.4),
    "SE":(-11.6,-9.5,-38.2,-36.4),"SP":(-25.3,-19.8,-53.2,-44.2),
    "TO":(-13.5,-5.2,-50.8,-45.7),
}

def no_bbox(lat, lon, uf):
    bb = BBOX_UF.get(uf)
    if not bb or lat is None or lon is None:
        return False
    return bb[0] <= lat <= bb[1] and bb[2] <= lon <= bb[3]

def geocode(nome, uf):
    estado = UF_ESTADO.get(uf, "")
    for query in [f"{nome} {uf}", f"{nome} {estado}", nome]:
        try:
            r = requests.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": query, "count": 15, "language": "pt", "format": "json"},
                timeout=12,
            )
            if r.status_code != 200:
                continue
        except Exception:
            continue

        resultados = r.json().get("results", [])
        bb = BBOX_UF.get(uf)

        def ok(lat, lon):
            return bb is None or (bb[0] <= lat <= bb[1] and bb[2] <= lon <= bb[3])

        for res in resultados:
            if res.get("country_code") != "BR":
                continue
            admin1 = res.get("admin1", "")
            if estado and estado.lower() in admin1.lower():
                lat, lon = res["latitude"], res["longitude"]
                if ok(lat, lon):
                    return lat, lon, float(res.get("elevation") or 0)

        if uf:
            for res in resultados:
                if res.get("country_code") != "BR":
                    continue
                lat, lon = res["latitude"], res["longitude"]
                if ok(lat, lon):
                    return lat, lon, float(res.get("elevation") or 0)

    return None, None, None


def main():
    print("=" * 60)
    print("  fix_geocodificacao.py  -  SOUFII")
    print("=" * 60)

    todos = supabase.table("municipios_aptidao")\
        .select("codigo_ibge, nome_municipio, uf, lat, lon")\
        .execute().data or []

    print(f"[DB] {len(todos)} municipios no banco")

    errados = [
        m for m in todos
        if m.get("lat") is not None
        and not no_bbox(m["lat"], m["lon"], m["uf"])
    ]
    sem_coords = [m for m in todos if m.get("lat") is None]

    print(f"[!]  Coordenadas fora do estado : {len(errados)}")
    print(f"[!]  Sem coordenadas            : {len(sem_coords)}")
    print(f"[~]  Total a corrigir           : {len(errados) + len(sem_coords)}\n")

    corrigidos = 0
    falhas = 0
    alvo = errados + sem_coords

    for i, m in enumerate(alvo, 1):
        cod  = m["codigo_ibge"]
        nome = m["nome_municipio"]
        uf   = m["uf"]
        lat_atual = m.get("lat")

        print(f"[{i}/{len(alvo)}] {nome}/{uf}  lat_atual={lat_atual:.3f if lat_atual else 'None'} ...",
              end=" ", flush=True)

        new_lat, new_lon, new_alt = geocode(nome, uf)

        if new_lat is None:
            print("FALHA (geocoder sem resultado)")
            falhas += 1
            time.sleep(SLEEP)
            continue

        if not no_bbox(new_lat, new_lon, uf):
            print(f"FALHA (novo resultado {new_lat:.3f},{new_lon:.3f} ainda fora do bbox)")
            falhas += 1
            time.sleep(SLEEP)
            continue

        supabase.table("municipios_aptidao").update({
            "lat": new_lat, "lon": new_lon, "altitude": new_alt,
        }).eq("codigo_ibge", cod).execute()

        print(f"OK ({new_lat:.4f}, {new_lon:.4f}, {new_alt:.0f}m)")
        corrigidos += 1
        time.sleep(SLEEP)

    print()
    print("=" * 60)
    print(f"  Corrigidos : {corrigidos}")
    print(f"  Falhas     : {falhas}")
    print("=" * 60)


if __name__ == "__main__":
    main()
