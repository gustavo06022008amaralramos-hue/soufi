# -*- coding: utf-8 -*-
"""
coletar_solo_poligono.py
==========================
Teor de argila REAL do SoilGrids (ISRIC), calculado como a MÉDIA DOS PIXELS
dentro do polígono oficial do município (malha IBGE usada pelo mapa,
frontend/public/geojson/municipios_br.json), em vez de um único ponto na sede.

Por quê: a sede de muitos municípios da Amazônia fica na beira de rio, e o
SoilGrids não tem dado sobre água — esses municípios ficavam sem solo ou com
solo ESTIMADO por regra regional (o antigo solo_regional.py, marcado "(est.)").

Como: baixa o mapa de argila pelo serviço WCS do ISRIC em tiles de 5°x5° na
resolução de 0,01° (~1 km), para as 3 camadas 0-5, 5-15 e 15-30 cm (pesos
5/10/5, os mesmos da coleta original), e faz a média dos pixels com dado cujo
centro cai dentro do polígono. Pixel 0 = sem dado (água) e é ignorado.
Os tiles ficam em cache (pasta cache_soilgrids/, fora do git).

Uso:
    python coletar_solo_poligono.py --estimados          # todos com "(est.)" ou sem argila
    python coletar_solo_poligono.py --codigos 1302405,1303536

Depois rode recalcular_altitude_800m.py e calcular_score_multicultura_db.py.
"""
import argparse
import json
import math
import os
import sys
import time

import numpy as np
import requests
import tifffile
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(RAIZ, ".env"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

GEOJSON = os.path.join(RAIZ, "frontend", "public", "geojson", "municipios_br.json")
CACHE = os.path.join(RAIZ, "cache_soilgrids")
WCS = "https://maps.isric.org/mapserv?map=/map/clay.map"
CAMADAS = [("clay_0-5cm_mean", 5), ("clay_5-15cm_mean", 10), ("clay_15-30cm_mean", 5)]
TILE = 5          # graus
RES = 0.01        # graus por pixel


def classificar(pct):
    if pct < 15.0:
        return 1, "Tipo 1 - Arenoso"
    if pct <= 35.0:
        return 2, "Tipo 2 - Textura Média"
    return 3, "Tipo 3 - Argiloso"


def baixar_tile(camada, lon0, lat0):
    """Tile [lon0, lon0+TILE] x [lat0, lat0+TILE]; devolve (array g/kg, lon0, lat_topo, dx, dy)."""
    os.makedirs(CACHE, exist_ok=True)
    caminho = os.path.join(CACHE, f"{camada}_{lon0}_{lat0}.tif")
    if not os.path.exists(caminho):
        n = int(TILE / RES)
        url = (f"{WCS}&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID={camada}"
               f"&FORMAT=image/tiff&SUBSET=long({lon0},{lon0 + TILE})&SUBSET=lat({lat0},{lat0 + TILE})"
               f"&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
               f"&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
               f"&SCALESIZE=long({n}),lat({n})")
        for tentativa in range(4):
            r = requests.get(url, timeout=180)
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image/tiff"):
                open(caminho, "wb").write(r.content)
                break
            time.sleep(10 * (tentativa + 1))
        else:
            raise RuntimeError(f"WCS falhou: {camada} {lon0},{lat0} ({r.status_code})")
    pagina = tifffile.TiffFile(caminho).pages[0]
    tags = {t.name: t.value for t in pagina.tags.values()}
    dx, dy = tags["ModelPixelScaleTag"][:2]
    _, _, _, x0, y0, _ = tags["ModelTiepointTag"]
    return pagina.asarray().astype(np.float64), x0, y0, dx, dy


def aneis(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [np.asarray(p[0], dtype=np.float64)[:, :2] for p in polys]


def dentro(xs, ys, geom):
    """Ray casting vetorizado: máscara dos pontos (xs, ys) dentro do polígono (só anel externo)."""
    final = np.zeros(xs.shape, dtype=bool)
    for anel in aneis(geom):
        ins = np.zeros(xs.shape, dtype=bool)
        x1, y1 = anel[:, 0], anel[:, 1]
        x2, y2 = np.roll(x1, 1), np.roll(y1, 1)
        for a, b, c, d in zip(x1, y1, x2, y2):
            if b == d:
                continue
            cruza = ((b > ys) != (d > ys)) & (xs < (c - a) * (ys - b) / (d - b) + a)
            ins ^= cruza
        final |= ins
    return final


def argila_media(geom):
    pts = np.vstack(aneis(geom))
    lon_min, lat_min = pts.min(axis=0)
    lon_max, lat_max = pts.max(axis=0)
    tiles = [(lo, la) for lo in range(math.floor(lon_min / TILE) * TILE, math.ceil(lon_max / TILE) * TILE, TILE)
             for la in range(math.floor(lat_min / TILE) * TILE, math.ceil(lat_max / TILE) * TILE, TILE)]
    total, peso_total = 0.0, 0.0
    n_pixels = 0
    for lo, la in tiles:
        camadas = [baixar_tile(c, lo, la) for c, _ in CAMADAS]
        arr0, x0, y0, dx, dy = camadas[0]
        lin, col = np.indices(arr0.shape)
        xs, ys = x0 + (col + 0.5) * dx, y0 - (lin + 0.5) * dy
        caixa = (xs >= lon_min) & (xs <= lon_max) & (ys >= lat_min) & (ys <= lat_max)
        if not caixa.any():
            continue
        idx = np.where(caixa)
        mask = dentro(xs[idx], ys[idx], geom)
        if not mask.any():
            continue
        vals = np.stack([arr[idx][mask] for arr, *_ in camadas])   # (3, n)
        validos = (vals > 0).all(axis=0)                               # pixel com dado nas 3 camadas
        if not validos.any():
            continue
        pesos = np.array([p for _, p in CAMADAS], dtype=np.float64)[:, None]
        ponderado = (vals[:, validos] * pesos).sum(axis=0) / pesos.sum()  # g/kg por pixel
        total += ponderado.sum()
        n_pixels += ponderado.size
    if n_pixels == 0:
        return None, 0
    return round(total / n_pixels / 10.0, 1), n_pixels   # g/kg -> %


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
        pct, n = argila_media(geom) if geom else (None, 0)
        if pct is None:
            falha += 1
            print(f"  [{i}/{len(alvos)}] {m['nome_municipio']}/{m['uf']}: sem pixel válido — mantido", flush=True)
            continue
        tipo, nome = classificar(pct)
        supabase.table("municipios_aptidao").update(
            {"pct_argila": pct, "tipo_solo_zarc": tipo, "tipo_solo": nome}
        ).eq("codigo_ibge", m["codigo_ibge"]).execute()
        ok += 1
        print(f"  [{i}/{len(alvos)}] {m['nome_municipio']}/{m['uf']}: {pct}% ({n} pixels) {nome}"
              f"  [antes: {m['pct_argila']} {m['tipo_solo']}]", flush=True)

    print(f"\n[OK] {ok} atualizados com SoilGrids real; {falha} sem pixel válido (mantidos).")


if __name__ == "__main__":
    main()
