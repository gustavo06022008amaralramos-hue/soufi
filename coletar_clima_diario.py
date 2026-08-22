# -*- coding: utf-8 -*-
"""
coletar_clima_diario.py
=========================
Fase 3 do plano de 10 fases: coleta de clima diário (NASA POWER), escopada.

Não mexe em coleta_dados.py (que continua responsável pela média mensal de
32 anos usada no score de aptidão) — este script é só pro dado diário que
alimenta o motor de graus-dia (Fase 4) e o simulador ao vivo (Fase 6).

Escopo: municípios de PR/SC/RS (onde a cevada realmente é cultivada),
de 01/01 do ano corrente até hoje — não o histórico de 32 anos inteiro
(inviável em resolução diária: ~65 milhões de linhas).

Regra de cache: se um município já tem o número esperado de dias salvos
no intervalo, pula a requisição externa (evita throttle da API da NASA).

Uso: python coletar_clima_diario.py
"""
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime

import requests
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

_thread_local = threading.local()


def get_client():
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client


UFS_ESCOPO = ["PR", "SC", "RS"]
INICIO = date(date.today().year, 1, 1)
FIM = date.today()
DIAS_ESPERADOS = (FIM - INICIO).days + 1
WORKERS = 4


def requisicao_com_retry(url, params=None, tentativas=3, timeout=60):
    """Mesmo padrão de retry usado em coleta_dados.py: 3 tentativas pra erro
    de rede, pausa fixa de 30s se a NASA responder rate limit (429)."""
    erros_rede = 0
    for _ in range(tentativas):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                time.sleep(30)
                continue
            return r
        except requests.exceptions.RequestException:
            erros_rede += 1
            if erros_rede < 3:
                time.sleep(3 * erros_rede)
            else:
                return None
    return None


def parse_resposta_nasa(json_data):
    """Lógica pura de transformação — separada da chamada de rede pra poder
    ser testada sem depender de internet. Recebe o JSON já decodificado da
    API diária da NASA POWER e devolve a lista de registros por dia, com os
    dias sem dado (-999.0, sentinela da NASA) descartados."""
    p = json_data["properties"]["parameter"]
    registros = []
    for chave_data in p["T2M_MAX"].keys():
        tmax = p["T2M_MAX"].get(chave_data)
        tmin = p["T2M_MIN"].get(chave_data)
        prec = p["PRECTOTCORR"].get(chave_data)
        umid = p["RH2M"].get(chave_data)
        if tmax == -999.0 or tmin == -999.0:
            continue
        registros.append({
            "data": datetime.strptime(chave_data, "%Y%m%d").date().isoformat(),
            "tmax": tmax, "tmin": tmin,
            "precipitacao": None if prec == -999.0 else prec,
            "umidade": None if umid == -999.0 else umid,
        })
    return registros


def buscar_clima_diario_nasa(lat, lon, inicio, fim):
    """Chama a API diária real da NASA POWER (community=AG) pra um município."""
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": inicio.strftime("%Y%m%d"),
        "end": fim.strftime("%Y%m%d"),
        "format": "JSON",
    }
    response = requisicao_com_retry(url, params=params)
    if response is None or response.status_code != 200:
        return None
    try:
        return parse_resposta_nasa(response.json())
    except Exception:
        return None


def buscar_municipios_escopo():
    registros = []
    offset = 0
    while True:
        batch = (
            supabase.table("municipios_aptidao")
            .select("codigo_ibge, nome_municipio, uf, lat, lon")
            .in_("uf", UFS_ESCOPO)
            .range(offset, offset + 999)
            .execute()
        )
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return [m for m in registros if m.get("lat") and m.get("lon")]


def ja_esta_em_cache(codigo_ibge):
    """Regra de cache: se já temos os dias esperados salvos, não busca de novo."""
    r = (
        supabase.table("clima_diario_nasa")
        .select("id", count="exact")
        .eq("codigo_ibge", codigo_ibge)
        .gte("data", INICIO.isoformat())
        .lte("data", FIM.isoformat())
        .limit(1)
        .execute()
    )
    return (r.count or 0) >= DIAS_ESPERADOS * 0.9  # 90% de tolerância (dias com -999 filtrados)


def processar_municipio(m):
    codigo_ibge = m["codigo_ibge"]
    if ja_esta_em_cache(codigo_ibge):
        return codigo_ibge, "cache", 0

    registros = buscar_clima_diario_nasa(m["lat"], m["lon"], INICIO, FIM)
    if not registros:
        return codigo_ibge, "erro", 0

    linhas = [{"codigo_ibge": codigo_ibge, **r} for r in registros]
    cliente = get_client()
    for tentativa in range(3):
        try:
            cliente.table("clima_diario_nasa").upsert(
                linhas, on_conflict="codigo_ibge,data"
            ).execute()
            return codigo_ibge, "ok", len(linhas)
        except Exception:
            if tentativa == 2:
                return codigo_ibge, "erro_db", 0
            time.sleep(1.5 * (tentativa + 1))


def main():
    print("=" * 62)
    print("  coletar_clima_diario.py — SOUFII (Fase 3)")
    print("=" * 62)
    print(f"  Escopo: {', '.join(UFS_ESCOPO)} · {INICIO} a {FIM} ({DIAS_ESPERADOS} dias)\n")

    municipios = buscar_municipios_escopo()
    print(f"[DB] {len(municipios)} municípios no escopo\n")

    contagem = {"ok": 0, "cache": 0, "erro": 0, "erro_db": 0}
    total_linhas = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futuros = {executor.submit(processar_municipio, m): m for m in municipios}
        for i, fut in enumerate(as_completed(futuros), 1):
            codigo_ibge, status, n = fut.result()
            contagem[status] = contagem.get(status, 0) + 1
            total_linhas += n
            if i % 20 == 0 or i == len(municipios):
                print(f"  [{i}/{len(municipios)}] ok={contagem['ok']} cache={contagem['cache']} erro={contagem['erro']+contagem['erro_db']}", end="\r", flush=True)

    print(f"\n\n[OK] {contagem['ok']} municípios coletados agora ({total_linhas} linhas), "
          f"{contagem['cache']} já em cache, {contagem['erro']+contagem['erro_db']} com erro.")
    print("=" * 62)


if __name__ == "__main__":
    main()
