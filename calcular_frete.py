# -*- coding: utf-8 -*-
"""
calcular_frete.py
===================
Bloco 3.4 — Calcula distância e frete estimado de cada município até as
3 maltarias de referência, em lote, só com matemática (sem chamar API externa).

Maltarias de referência:
  - Cooperativa Agrária Maltaria (Guarapuava/PR)
  - AmBev Maltaria Lages (SC)
  - Cargill Ponta Grossa (PR)

Fórmula:
  dist_km  = haversine(lat1,lon1,lat2,lon2) * 1.35   # fator de sinuosidade rodoviária
  frete_sc = R$2,00 (custo fixo carga/descarga) + dist_km * R$0,03/km

  Nota: a fórmula original do prompt master (dist_km * R$0,23/km/ton / 16,67 sc/ton
  * 1,30 fator retorno) é matematicamente incompatível com as faixas de R$/sc que o
  mesmo prompt define por zona (ex.: a 600km ela dá ~R$10,76/sc, mas a Zona 3 é
  descrita como R$12–22/sc). Recalibramos para custo fixo + variável por km, que é o
  modelo mais realista de frete rodoviário (sempre há custo de carga/descarga
  independente da distância) e que reproduz as faixas de R$/sc do prompt nos limites
  de cada zona (100km→~R$5, 300km→~R$11, 600km→~R$20).

Zona logística (pela distância até a maltaria de referência mais próxima):
  <= 100km  -> Zona 1 - Logistica favoravel
  101-300km -> Zona 2 - Custo moderado
  301-600km -> Zona 3 - Custo elevado
  > 600km   -> Zona 4 - Inviavel sem contrato

Pré-requisito: rodar migrations/001_bloco1_score_frete_auditoria.sql no Supabase
antes deste script (cria as colunas dist_*, frete_estimado_sc, maltaria_referencia,
zona_logistica).

Uso: python calcular_frete.py
"""
import os
import sys
import math
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cada thread usa seu proprio client (o client sincrono da supabase-py nao e
# thread-safe para uso concorrente no Windows — gera httpx.ReadError WinError 10035).
_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client

MALTARIAS = {
    # Sede real: Rua 5 de Maio, 745, Colônia Vitória — Entre Rios, Guarapuava/PR
    # (distrito de Entre Rios, ~19km do centro de Guarapuava — geocodificado via Nominatim)
    "Cooperativa Agraria (Guarapuava/PR)": (-25.5630, -51.4898, "dist_guarapuava_km"),
    "AmBev Lages (SC)":                    (-27.8147, -50.3260, "dist_lages_km"),
    "Cargill Ponta Grossa (PR)":           (-25.0945, -50.1633, "dist_ponta_grossa_km"),
}

FATOR_SINUOSIDADE   = 1.35
FRETE_FIXO_SC       = 2.00   # R$/sc — custo fixo de carga/descarga, ~independente da distância
FRETE_VARIAVEL_SC_KM = 0.03  # R$/sc/km — recalibrado para bater com as faixas de zona do prompt

RAIO_TERRA_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = la2 - la1
    dlon = lo2 - lo1
    a = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return 2 * RAIO_TERRA_KM * math.asin(math.sqrt(a))


def zona_logistica(dist_km):
    if dist_km <= 100:
        return "Zona 1 - Logistica favoravel"
    elif dist_km <= 300:
        return "Zona 2 - Custo moderado"
    elif dist_km <= 600:
        return "Zona 3 - Custo elevado"
    else:
        return "Zona 4 - Inviavel sem contrato"


def calcular_logistica(lat, lon):
    """Retorna dict pronto para upsert: distâncias às 3 maltarias + a mais
    próxima como referência para frete e zona."""
    dists = {}
    for nome, (mlat, mlon, col) in MALTARIAS.items():
        dist_reta = haversine_km(lat, lon, mlat, mlon)
        dist_km = round(dist_reta * FATOR_SINUOSIDADE, 1)
        dists[col] = dist_km
        dists[nome] = dist_km

    mais_proxima = min(MALTARIAS.keys(), key=lambda n: dists[n])
    dist_ref = dists[mais_proxima]

    frete_sc = round(FRETE_FIXO_SC + dist_ref * FRETE_VARIAVEL_SC_KM, 2)

    return {
        "dist_guarapuava_km":  dists["dist_guarapuava_km"],
        "dist_lages_km":       dists["dist_lages_km"],
        "dist_ponta_grossa_km": dists["dist_ponta_grossa_km"],
        "frete_estimado_sc":   frete_sc,
        "maltaria_referencia": mais_proxima,
        "zona_logistica":      zona_logistica(dist_ref),
    }


def buscar_todos():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, lat, lon"
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
    print("  calcular_frete.py — SOUFII")
    print("=" * 62)

    registros = buscar_todos()
    total = len(registros)
    print(f"[DB] {total} municípios\n")

    pendentes = [m for m in registros if m.get("lat") is not None and m.get("lon") is not None]
    sem_coords = total - len(pendentes)

    def atualizar(m):
        dados = calcular_logistica(m["lat"], m["lon"])
        cliente = get_client()
        for tentativa in range(3):
            try:
                cliente.table("municipios_aptidao").update(dados).eq(
                    "codigo_ibge", m["codigo_ibge"]
                ).execute()
                return m["codigo_ibge"]
            except Exception:
                if tentativa == 2:
                    raise
                time.sleep(1.5 * (tentativa + 1))

    atualizados = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(atualizar, m) for m in pendentes]
        for fut in as_completed(futuros):
            fut.result()
            atualizados += 1
            if atualizados % 50 == 0 or atualizados == len(pendentes):
                print(f"  [{atualizados}/{len(pendentes)}] atualizados", end="\r", flush=True)

    print(f"\n\n[OK] Logística calculada para {atualizados} municípios "
          f"({sem_coords} sem coordenadas, ignorados).")
    print("=" * 62)


if __name__ == "__main__":
    main()
