# -*- coding: utf-8 -*-
"""
solo_regional.py
================
Estima tipo de solo ZARC para cevada usando padrões pedologicos regionais
baseados no Mapa Pedologico Nacional IBGE 2020 + EMBRAPA BrasilSoils.

Quando o SoilGrids estiver disponivel, esses valores serao sobrescritos
pelos dados reais. Por enquanto permite calcular score_aptidao e apto_geral.

ZARC (Portaria MAPA):
  Tipo 1: argila < 15%  - Arenoso   - nao recomendado para cevada
  Tipo 2: argila 15-35% - Medio     - aceito com manejo
  Tipo 3: argila > 35%  - Argiloso  - ideal para cevada
"""

import os, time
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

SLEEP_LOTE = 0.3  # pausa entre lotes de upsert


# ==============================================================================
# MODELO REGIONAL
# Fontes: IBGE Mapa Pedologico Nacional 2020; EMBRAPA Sistema Brasileiro de
# Classificacao de Solos (SiBCS) 2018; ZARC Portaria MAPA no 232/2018.
# ==============================================================================
def estimar_solo(uf, lat, lon, alt):
    """Retorna (pct_argila, tipo_zarc, nome_solo)."""
    alt = alt or 0
    lat = lat or 0.0
    lon = lon or 0.0

    # ── Sul ─────────────────────────────────────────────────────
    # PR e SC: Latossolos Bruno e Roxo dominantes no Planalto; argilosos
    if uf in ("PR", "SC"):
        if alt > 900:
            return 46.0, 3, "Latossolo Bruno (est.)"
        elif alt > 600:
            return 40.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 300:
            return 33.0, 2, "Nitossolo Vermelho (est.)"
        else:
            return 25.0, 2, "Argissolo Vermelho (est.)"

    # RS: Latossolos no norte; Argissolos e Luvissolos no sul
    if uf == "RS":
        if alt > 700:
            return 42.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 400:
            return 32.0, 2, "Argissolo Vermelho (est.)"
        else:
            return 22.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # ── Cerrado / Centro-Oeste ──────────────────────────────────
    # GO e DF: Latossolos Vermelhos e Vermelho-Amarelos domina no Planalto Central
    if uf in ("GO", "DF"):
        if alt > 900:
            return 44.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 700:
            return 38.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 500:
            return 30.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 22.0, 2, "Argissolo Vermelho (est.)"

    # MG: Sul e Triangulo - Latossolos argilosos; centro/norte - mais variado
    if uf == "MG":
        if alt > 900 and lat < -17.0:
            return 42.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 700:
            return 35.0, 3, "Latossolo Vermelho (est.)"
        elif alt > 500:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 20.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # MS: Sul argiloso (extensao do Parana); norte arenoso
    if uf == "MS":
        if lat < -20.0:
            return 38.0, 3, "Latossolo Vermelho (est.)"
        elif lat < -17.0:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 18.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # MT: Chapada dos Guimaraes argilosa; baixadas arenosas
    if uf == "MT":
        if alt > 500 and lat < -13.0:
            return 34.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        elif alt > 400:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 16.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # ── Sudeste ─────────────────────────────────────────────────
    # SP: interior alto - Latossolo Roxo; litoral/baixadas - Argissolo
    if uf == "SP":
        if alt > 700 and lon < -47.0:
            return 36.0, 3, "Latossolo Roxo (est.)"
        elif alt > 500:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 20.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    if uf == "RJ":
        if alt > 500:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 22.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    if uf == "ES":
        if alt > 600:
            return 30.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 20.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # ── Nordeste ────────────────────────────────────────────────
    # BA: Oeste (Cerrado baiano) - Latossolo argiloso; Caatinga/litoral - Neossolo
    if uf == "BA":
        if lon < -44.0 and alt > 700:
            return 38.0, 3, "Latossolo Vermelho (est.)"
        elif lon < -44.0:
            return 28.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        elif alt > 500:
            return 18.0, 2, "Argissolo Vermelho-Amarelo (est.)"
        else:
            return 11.0, 1, "Neossolo Litotico (est.)"

    # MA e TO: Cerrado com Latossolos; faixas de transicao
    if uf in ("MA", "TO"):
        if alt > 500:
            return 26.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 18.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # PI: Caatinga/Cerrado - Argissolos e Neossolos
    if uf == "PI":
        if alt > 400:
            return 20.0, 2, "Argissolo Vermelho-Amarelo (est.)"
        else:
            return 12.0, 1, "Neossolo Fluvico (est.)"

    # CE, RN, PB, PE, AL, SE: predominio Caatinga - Luvissolos e Neossolos
    if uf in ("CE", "RN", "PB", "PE", "AL", "SE"):
        if alt > 600:
            return 18.0, 2, "Argissolo Vermelho-Amarelo (est.)"
        elif alt > 300:
            return 14.0, 1, "Luvissolo Hipocromatico (est.)"
        else:
            return 10.0, 1, "Neossolo Fluvico (est.)"

    # ── Norte (Amazonia) ────────────────────────────────────────
    # AM, PA, AC, AP, RO, RR: Latossolo Amarelo e Argissolo Amarelo
    if uf in ("AM", "PA", "AC", "AP", "RR"):
        if alt > 100:
            return 20.0, 2, "Latossolo Amarelo (est.)"
        else:
            return 12.0, 1, "Gleissolo Haftico (est.)"

    if uf == "RO":
        if alt > 200:
            return 24.0, 2, "Latossolo Vermelho-Amarelo (est.)"
        else:
            return 16.0, 2, "Argissolo Vermelho-Amarelo (est.)"

    # Padrao para estados nao mapeados
    return 22.0, 2, "Solo estimado (padrao regional)"


# ==============================================================================
# APTIDAO (replica logica do coleta_dados.py)
# ==============================================================================
def calcular_aptidao(temp, chuva, alt, tipo_zarc, geada, colheita):
    criterios = [
        tipo_zarc is not None and tipo_zarc >= 2,
        temp is not None and 10.0 <= temp <= 22.0,
        chuva is not None and 400.0 <= chuva <= 2000.0,
        alt is not None and alt >= 700.0,
        geada is not None and geada < 30.0,
        colheita is not None and colheita < 350.0,
    ]
    return all(criterios), int(round(sum(criterios) / len(criterios) * 100))


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    print("=" * 62)
    print("  solo_regional.py  -  SOUFII")
    print("  Estimativa pedologica regional para solo ZARC")
    print("=" * 62)

    # Busca municipios sem dados de solo
    resultado = supabase.table("municipios_aptidao").select(
        "codigo_ibge, nome_municipio, uf, lat, lon, altitude, "
        "temp_media_anual, precipitacao_acumulada_anual, "
        "risco_geada_pct, chuva_colheita_mm, pct_argila"
    ).is_("pct_argila", "null").execute()

    pendentes = resultado.data or []
    total = len(pendentes)
    print(f"[DB] Municipios sem solo: {total}")

    if total == 0:
        print("[OK] Todos os municipios ja tem dados de solo.")
        return

    ok = 0
    atualizados_aptos = 0
    lote = []
    LOTE_SIZE = 50

    for i, m in enumerate(pendentes, 1):
        uf  = m["uf"]
        lat = m.get("lat")
        lon = m.get("lon")
        alt = m.get("altitude")

        pct, tipo, nome = estimar_solo(uf, lat, lon, alt)

        # Recalcula score com solo agora disponivel
        apto, score = calcular_aptidao(
            m.get("temp_media_anual"),
            m.get("precipitacao_acumulada_anual"),
            alt,
            tipo,
            m.get("risco_geada_pct"),
            m.get("chuva_colheita_mm"),
        )

        lote.append({
            "codigo_ibge":    m["codigo_ibge"],
            "tipo_solo":      nome,
            "pct_argila":     pct,
            "tipo_solo_zarc": tipo,
            "score_aptidao":  score,
            "apto_geral":     apto,
        })

        if apto:
            atualizados_aptos += 1

        # Envia em lotes para nao sobrecarregar o Supabase
        if len(lote) >= LOTE_SIZE or i == total:
            for reg in lote:
                cod = reg.pop("codigo_ibge")
                supabase.table("municipios_aptidao")\
                    .update(reg).eq("codigo_ibge", cod).execute()
            ok += len(lote)
            lote = []
            print(f"  [{i}/{total}]  {ok} atualizados  |  aptos ate agora: {atualizados_aptos}",
                  end="\r", flush=True)
            time.sleep(SLEEP_LOTE)

    print()
    print("-" * 62)
    print(f"  Municipios atualizados : {ok}")
    print(f"  Aptos (score >= 70)    : {(pendentes[0]['uf'] and atualizados_aptos)}")
    print("  Nota: valores estimados serao substituidos pelo")
    print("  SoilGrids quando a API voltar ao ar.")
    print("=" * 62)


if __name__ == "__main__":
    main()
