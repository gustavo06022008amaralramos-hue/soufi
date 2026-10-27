# -*- coding: utf-8 -*-
"""
coletar_solo_poligono.py
==========================
Teor de argila REAL (SoilGrids/ISRIC, 0-30cm) amostrado em vários pontos
DENTRO do polígono oficial do município (malha IBGE usada pelo mapa,
frontend/public/geojson/municipios_br.json), em vez de só no ponto da sede.

Por quê: a sede de muitos municípios da Amazônia fica na beira de rio, e o
SoilGrids não tem dado sobre água — esses municípios ficavam sem solo ou com
solo ESTIMADO por regra regional (solo_regional.py, marcado "(est.)"). Aqui a
argila é a média de até N pontos válidos numa grade dentro do município.

Uso:
    python coletar_solo_poligono.py --estimados          # todos com "(est.)" ou sem argila
    python coletar_solo_poligono.py --codigos 1302405,1303536
    python coletar_solo_poligono.py --estimados --pontos 3

Depois rode recalcular_altitude_800m.py e calcular_score_multicultura_db.py
para atualizar os scores.
"""
import argparse
import json
import os
import sys
import time

import requests
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(RAIZ, ".env"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

GEOJSON = os.path.join(RAIZ, "frontend", "public", "geojson", "municipios_br.json")
SOILGRIDS = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PESOS_PROFUNDIDADE = [5, 10, 5]  # 0-5, 5-15, 15-30 cm (mesmo peso da coleta original)


def classificar(pct):
    if pct < 15.0:
        return 1, "Tipo 1 - Arenoso"
    if pct <= 35.0:
        return 2, "Tipo 2 - Textura Média"
    return 3, "Tipo 3 - Argiloso"


def _aneis(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [poly[0] for poly in polys]


def dentro(x, y, geom):
    for anel in _aneis(geom):
        ins = False
        for i in range(len(anel)):
            x1, y1 = anel[i][:2]
            x2, y2 = anel[i - 1][:2]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                ins = not ins
        if ins:
            return True
    return False


def pontos_internos(geom, divisoes=6):
    """Grade regular sobre o retângulo do município, só os pontos internos.
    Ordenada do centro para fora (os primeiros pontos são os mais centrais)."""
    pts = [c[:2] for anel in _aneis(geom) for c in anel]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    cand = []
    for i in range(1, divisoes):
        for j in range(1, divisoes):
            x = min(xs) + (max(xs) - min(xs)) * i / divisoes
            y = min(ys) + (max(ys) - min(ys)) * j / divisoes
            if dentro(x, y, geom):
                cand.append((round(y, 4), round(x, 4)))
    return sorted(cand, key=lambda p: (p[0] - cy) ** 2 + (p[1] - cx) ** 2)


def argila_ponto(lat, lon):
    params = [("lon", lon), ("lat", lat), ("property", "clay"),
              ("depth", "0-5cm"), ("depth", "5-15cm"), ("depth", "15-30cm"), ("value", "mean")]
    for _ in range(4):
        try:
            r = requests.get(SOILGRIDS, params=params, timeout=40)
            if r.status_code == 429:   # limite da API pública
                time.sleep(20)
                continue
            if r.status_code != 200:
                return None
            vals = [d["values"]["mean"] for d in r.json()["properties"]["layers"][0]["depths"]
                    if d["values"]["mean"] is not None]
            if not vals:
                return None                       # pixel sem solo (água)
            w = PESOS_PROFUNDIDADE[:len(vals)]
            return sum(v * k for v, k in zip(vals, w)) / sum(w) / 10.0  # g/kg -> %
        except Exception:
            time.sleep(5)
    return None


def coletar(m, geom, n_pontos):
    vals = []
    for lat, lon in pontos_internos(geom):
        v = argila_ponto(lat, lon)
        time.sleep(1.5)
        if v is not None:
            vals.append(v)
        if len(vals) >= n_pontos:
            break
    return (round(sum(vals) / len(vals), 1), len(vals)) if vals else (None, 0)


def buscar_alvos(args):
    cols = "codigo_ibge, nome_municipio, uf, tipo_solo, pct_argila"
    if args.codigos:
        return supabase.table("municipios_aptidao").select(cols).in_(
            "codigo_ibge", [c.strip() for c in args.codigos.split(",")]).execute().data
    alvos, offset = [], 0
    while True:
        lote = supabase.table("municipios_aptidao").select(cols).range(offset, offset + 999).execute().data
        alvos += [m for m in lote if m["pct_argila"] is None or "(est.)" in (m["tipo_solo"] or "")]
        if len(lote) < 1000:
            break
        offset += 1000
    return alvos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--codigos")
    ap.add_argument("--estimados", action="store_true")
    ap.add_argument("--pontos", type=int, default=3)
    args = ap.parse_args()
    if not args.codigos and not args.estimados:
        ap.error("use --codigos ou --estimados")

    feats = {str(f["properties"]["codarea"]): f["geometry"]
             for f in json.load(open(GEOJSON, encoding="utf-8"))["features"]}
    alvos = buscar_alvos(args)
    print(f"[solo] {len(alvos)} municípios", flush=True)

    ok = falha = 0
    for i, m in enumerate(alvos, 1):
        geom = feats.get(str(m["codigo_ibge"]))
        pct, n = coletar(m, geom, args.pontos) if geom else (None, 0)
        if pct is None:
            falha += 1
            print(f"  [{i}/{len(alvos)}] {m['nome_municipio']}/{m['uf']}: sem ponto válido — mantido", flush=True)
            continue
        tipo, nome = classificar(pct)
        supabase.table("municipios_aptidao").update(
            {"pct_argila": pct, "tipo_solo_zarc": tipo, "tipo_solo": nome}
        ).eq("codigo_ibge", m["codigo_ibge"]).execute()
        ok += 1
        print(f"  [{i}/{len(alvos)}] {m['nome_municipio']}/{m['uf']}: {pct}% ({n} pontos) {nome}"
              f"  [antes: {m['pct_argila']} {m['tipo_solo']}]", flush=True)

    print(f"\n[OK] {ok} atualizados com SoilGrids real; {falha} sem ponto válido (mantidos).")


if __name__ == "__main__":
    main()
