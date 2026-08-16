# -*- coding: utf-8 -*-
"""
validar_serie_nasa.py
========================
Bloco 1.3 — Valida a completude da série histórica NASA POWER (1993-2024,
32 anos = até 384 meses possíveis) para cada município já coletado.

Isso não estava sendo registrado na coleta original: o DataFrame mensal era
usado pra calcular médias e depois descartado, sem guardar quantos meses
realmente tinham dado válido (a NASA POWER retorna -999.0 pra ponto/mês sem
medição, o que pode variar por localização).

Para cada município:
  - n_meses_validos   : quantos dos meses 1993-2024 tinham T2M/T2M_MIN/PRECTOTCORR
                        válidos (não -999, não nulo)
  - serie_incompleta  : TRUE se n_meses_validos < 300 (menos de ~25 anos)
  - risco_geada_auditoria: se TODOS os meses de Jul/Ago da série (sem exceção)
                        vieram como -999.0 (sem nenhuma medição em nenhum dos
                        32 anos), o risco_geada_pct calculado é 0% por padrão
                        (nenhum mês pra reprovar) — o que pode estar subestimando
                        o risco real. Marca "série incompleta em meses críticos".

Uso: python validar_serie_nasa.py
"""
import os
import sys
import time
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client


def buscar_serie_nasa(lat, lon):
    url = "https://power.larc.nasa.gov/api/temporal/monthly/point"
    params = {
        "parameters": "T2M_MIN,T2M,PRECTOTCORR", "community": "ag",
        "longitude": lon, "latitude": lat, "start": "1993", "end": "2024", "format": "JSON",
    }
    for tentativa in range(3):
        try:
            r = requests.get(url, params=params, timeout=60)
            if r.status_code == 429:
                time.sleep(20)
                continue
            if r.status_code != 200:
                return None
            return r.json()["properties"]["parameter"]
        except Exception:
            time.sleep(3)
    return None


def analisar(param_data):
    """Retorna (n_meses_validos, serie_incompleta, risco_geada_auditoria)."""
    dates = [k for k in param_data["T2M"].keys()
             if len(k) == 6 and k.isdigit() and 1 <= int(k[4:]) <= 12]

    validos = 0
    jul_ago_total = 0
    jul_ago_validos = 0
    for k in dates:
        mes = int(k[4:])
        t2m = param_data["T2M"].get(k)
        t2m_min = param_data["T2M_MIN"].get(k)
        prec = param_data["PRECTOTCORR"].get(k)
        eh_valido = all(v is not None and v != -999.0 for v in (t2m, t2m_min, prec))
        if eh_valido:
            validos += 1
        if mes in (7, 8):
            jul_ago_total += 1
            if eh_valido:
                jul_ago_validos += 1

    serie_incompleta = validos < 300
    risco_geada_auditoria = (
        "série incompleta em meses críticos (Jul/Ago sem nenhuma medição válida)"
        if jul_ago_total > 0 and jul_ago_validos == 0 else None
    )
    return validos, serie_incompleta, risco_geada_auditoria


def buscar_todos():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    registros, offset = [], 0
    while True:
        batch = sb.table("municipios_aptidao").select(
            "codigo_ibge, nome_municipio, uf, lat, lon"
        ).range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return registros


def processar_um(m):
    if m.get("lat") is None or m.get("lon") is None:
        return m["codigo_ibge"], False, "sem coordenadas"

    param_data = buscar_serie_nasa(m["lat"], m["lon"])
    if param_data is None:
        return m["codigo_ibge"], False, "erro NASA POWER"

    n_validos, incompleta, geada_auditoria = analisar(param_data)

    cliente = get_client()
    cliente.table("municipios_aptidao").update({
        "n_meses_validos": n_validos,
        "serie_incompleta": incompleta,
        "risco_geada_auditoria": geada_auditoria,
    }).eq("codigo_ibge", m["codigo_ibge"]).execute()

    return m["codigo_ibge"], True, f"{n_validos} meses válidos" + (" [SÉRIE INCOMPLETA]" if incompleta else "")


def main():
    print("=" * 62)
    print("  validar_serie_nasa.py — SOUFII")
    print("=" * 62)

    registros = buscar_todos()
    total = len(registros)
    print(f"[DB] {total} municípios a validar (isso chama a NASA POWER de novo, ~15-25min)\n")

    ok, falhas, incompletos = 0, [], 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        futuros = {executor.submit(processar_um, m): m for m in registros}
        for i, fut in enumerate(as_completed(futuros), 1):
            cod, sucesso, msg = fut.result()
            m = futuros[fut]
            if sucesso:
                ok += 1
                if "INCOMPLETA" in msg:
                    incompletos += 1
            else:
                falhas.append(f"{m['nome_municipio']}/{m['uf']}: {msg}")
            if i % 100 == 0 or i == total:
                print(f"  [{i}/{total}] ok={ok} incompletos={incompletos} falhas={len(falhas)}")

    print(f"\n[OK] {ok}/{total} validados. Séries incompletas: {incompletos}. Falhas: {len(falhas)}")
    for f in falhas[:20]:
        print(f"   - {f}")
    print("=" * 62)


if __name__ == "__main__":
    main()
