# -*- coding: utf-8 -*-
"""
auditoria_dados.py
===================
Audita a qualidade dos dados em `municipios_aptidao` no Supabase.
Não corrige nada — apenas reporta. Rode após qualquer script de coleta/correção
para confirmar que nada foi corrompido e para decidir o próximo passo de limpeza.

Uso: python auditoria_dados.py
"""
import os
import sys
from collections import Counter
from dotenv import load_dotenv
from supabase import create_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

TOTAL_MUNICIPIOS_BRASIL = 5570

# Estados com ZARC publicado para cevada (referência conhecida do projeto)
UFS_ZARC_PUBLICADO = {"PR", "SC", "RS", "SP", "MG", "GO"}

# Mesmo bounding box usado em coleta_dados.py / fix_geocodificacao.py
BBOX_UF = {
    "AC": (-11.1, -7.1, -74.0, -66.6), "AL": (-10.5, -8.8, -38.2, -35.1),
    "AM": (-9.9, 2.3, -73.8, -56.1), "AP": (-1.3, 4.4, -52.0, -49.9),
    "BA": (-18.4, -8.5, -46.6, -37.3), "CE": (-7.8, -2.8, -41.4, -37.2),
    "DF": (-16.1, -15.5, -48.3, -47.3), "ES": (-21.3, -17.8, -41.9, -39.7),
    "GO": (-19.5, -12.4, -53.3, -45.9), "MA": (-10.4, -1.0, -48.7, -41.8),
    "MG": (-22.9, -14.2, -51.0, -39.9), "MS": (-24.1, -17.2, -57.7, -50.9),
    "MT": (-18.1, -7.4, -61.7, -50.2), "PA": (-9.9, 2.6, -58.7, -46.0),
    "PB": (-8.3, -6.0, -38.8, -34.8), "PE": (-9.5, -7.2, -41.4, -34.9),
    "PI": (-11.1, -2.8, -45.9, -40.4), "PR": (-26.7, -22.5, -54.6, -48.0),
    "RJ": (-23.4, -20.8, -44.9, -40.9), "RN": (-6.9, -4.8, -38.6, -35.0),
    "RO": (-13.7, -7.9, -66.8, -59.8), "RR": (-1.4, 5.3, -64.8, -59.8),
    "RS": (-33.8, -27.1, -57.7, -49.7), "SC": (-29.4, -25.9, -53.9, -48.4),
    "SE": (-11.6, -9.5, -38.2, -36.4), "SP": (-25.3, -19.8, -53.2, -44.2),
    "TO": (-13.5, -5.2, -50.8, -45.7),
}


def fora_do_bbox(lat, lon, uf):
    bb = BBOX_UF.get(uf)
    if bb is None or lat is None or lon is None:
        return False
    return not (bb[0] <= lat <= bb[1] and bb[2] <= lon <= bb[3])


def buscar_todos():
    registros = []
    offset = 0
    while True:
        batch = supabase.table("municipios_aptidao").select(
            "codigo_ibge, nome_municipio, uf, lat, lon, altitude, "
            "tipo_solo, pct_argila, tipo_solo_zarc, "
            "temp_media_anual, precipitacao_acumulada_anual, "
            "risco_geada_pct, chuva_colheita_mm, apto_geral, score_aptidao"
        ).range(offset, offset + 999).execute()
        if not batch.data:
            break
        registros.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return registros


def main():
    sep = "=" * 70
    print(sep)
    print("  auditoria_dados.py — SOUFII")
    print(sep)

    registros = buscar_todos()
    total_db = len(registros)
    print(f"\n[cobertura] {total_db}/{TOTAL_MUNICIPIOS_BRASIL} municípios no banco "
          f"({total_db / TOTAL_MUNICIPIOS_BRASIL * 100:.1f}%)")

    # 1) Campos críticos nulos
    sem_argila = [r for r in registros if r.get("pct_argila") is None]
    sem_tipo_zarc = [r for r in registros if r.get("tipo_solo_zarc") is None]
    sem_coords = [r for r in registros if r.get("lat") is None or r.get("lon") is None]
    sem_clima = [r for r in registros if r.get("temp_media_anual") is None]

    print(f"\n[nulls] pct_argila IS NULL          : {len(sem_argila)}")
    print(f"[nulls] tipo_solo_zarc IS NULL       : {len(sem_tipo_zarc)}")
    print(f"[nulls] lat/lon IS NULL              : {len(sem_coords)}")
    print(f"[nulls] temp_media_anual IS NULL     : {len(sem_clima)}")

    # 2) Solo estimado via fallback regional (não é medição real do SoilGrids)
    solo_estimado = [r for r in registros if "(est.)" in (r.get("tipo_solo") or "")]
    print(f"\n[fallback] solo estimado (regional, não SoilGrids): {len(solo_estimado)} "
          f"({len(solo_estimado) / total_db * 100:.1f}%)")

    # 3) Falsos positivos: score alto mas campo crítico nulo
    CAMPOS_CRITICOS = ["pct_argila", "tipo_solo_zarc", "temp_media_anual",
                        "precipitacao_acumulada_anual", "altitude",
                        "risco_geada_pct", "chuva_colheita_mm"]
    falsos_positivos = [
        r for r in registros
        if (r.get("score_aptidao") or 0) > 67
        and any(r.get(c) is None for c in CAMPOS_CRITICOS)
    ]
    print(f"\n[falsos positivos] score > 67 com campo crítico NULL: {len(falsos_positivos)}")
    for r in falsos_positivos[:15]:
        faltando = [c for c in CAMPOS_CRITICOS if r.get(c) is None]
        print(f"   {r['nome_municipio']}/{r['uf']} ({r['codigo_ibge']}): "
              f"score={r.get('score_aptidao')} | faltando: {', '.join(faltando)}")
    if len(falsos_positivos) > 15:
        print(f"   ... e mais {len(falsos_positivos) - 15}")

    # 4) Municípios em estados com ZARC publicado mas marcados inaptos
    zarc_mas_inapto = [
        r for r in registros
        if r.get("uf") in UFS_ZARC_PUBLICADO and r.get("apto_geral") is False
    ]
    print(f"\n[possível inconsistência] estados com ZARC publicado {sorted(UFS_ZARC_PUBLICADO)} "
          f"mas apto_geral=False: {len(zarc_mas_inapto)}")
    por_uf = Counter(r["uf"] for r in zarc_mas_inapto)
    for uf in sorted(UFS_ZARC_PUBLICADO):
        print(f"   {uf}: {por_uf.get(uf, 0)}")

    # 5) Geocodificação fora do bounding box do estado (reaplicando a validação)
    fora_bbox = [r for r in registros if fora_do_bbox(r.get("lat"), r.get("lon"), r.get("uf"))]
    print(f"\n[geocodificação] coordenadas fora do bbox da UF: {len(fora_bbox)}")
    for r in fora_bbox[:15]:
        print(f"   {r['nome_municipio']}/{r['uf']} ({r['codigo_ibge']}): "
              f"lat={r.get('lat')}, lon={r.get('lon')}")
    if len(fora_bbox) > 15:
        print(f"   ... e mais {len(fora_bbox) - 15}")

    # 6) Resumo de aptidão
    aptos = sum(1 for r in registros if r.get("apto_geral") is True)
    print(f"\n[resumo] apto_geral=True: {aptos} ({aptos / total_db * 100:.1f}%)")

    print("\n" + sep)
    print("  FIM DA AUDITORIA")
    print(sep)


if __name__ == "__main__":
    main()
