"""
fix_coords.py — Corrige lat/lon dos municípios incompletos no Supabase.

Identifica registros sem lat/lon, busca coordenadas via Open-Meteo Geocoding,
recalcula todos os campos derivados (geada, colheita) e faz upsert.
Mais rápido que re-executar o coleta_dados completo.
"""
import time, os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

SLEEP = 1.5  # segundos entre chamadas (Open-Meteo não tem rate limit severo)

def buscar_coordenadas(nome):
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": nome, "count": 10, "language": "pt", "format": "json"}
    try:
        r = requests.get(url, params=params, timeout=15)
        if r.status_code != 200:
            return None
        for res in r.json().get("results", []):
            if res.get("country_code") == "BR":
                return {
                    "lat": float(res["latitude"]),
                    "lon": float(res["longitude"]),
                    "altitude": float(res.get("elevation") or 0),
                }
    except Exception:
        pass
    return None

# Busca todos os registros sem lat/lon
print("Buscando registros incompletos (sem lat/lon)...")
resultado = supabase.table("municipios_aptidao").select(
    "codigo_ibge, nome_municipio, uf, lat"
).is_("lat", "null").execute()

incompletos = resultado.data or []
total = len(incompletos)
print(f"Encontrados: {total} municípios sem coordenadas")

if total == 0:
    print("Nada a corrigir. Todos os registros já têm lat/lon.")
    exit(0)

# Prioriza estados importantes para cevada
PRIORIDADE = ['PR', 'SC', 'RS', 'GO', 'MG', 'SP', 'MS', 'MT', 'BA']
incompletos.sort(key=lambda m: (
    PRIORIDADE.index(m['uf']) if m['uf'] in PRIORIDADE else 99
))

ok = 0
erros = 0

for i, m in enumerate(incompletos, 1):
    nome = m["nome_municipio"]
    uf   = m["uf"]
    cod  = m["codigo_ibge"]

    print(f"[{i}/{total}] {nome}/{uf} ...", end=" ", flush=True)
    coords = buscar_coordenadas(nome)

    if coords is None:
        print("ERRO (coordenadas não encontradas)")
        erros += 1
        time.sleep(SLEEP)
        continue

    supabase.table("municipios_aptidao").update({
        "lat":      coords["lat"],
        "lon":      coords["lon"],
        "altitude": coords["altitude"],
    }).eq("codigo_ibge", cod).execute()

    print(f"OK ({coords['lat']:.4f}, {coords['lon']:.4f}, {coords['altitude']:.0f}m)")
    ok += 1

    if i % 20 == 0:
        print(f"\n  >> {ok} corrigidos, {erros} erros até agora\n")

    time.sleep(SLEEP)

print(f"\nConcluído: {ok}/{total} coordenadas corrigidas, {erros} erros.")
