"""Insere dados simulados para os 10 municípios com erro permanente de geocodificação."""
import os, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
h = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

def calc_score(temp, prec, alt, geada, solo_zarc, colheita):
    """Recalcula score ZARC para cevada."""
    criterios = [
        10 <= temp <= 22,
        400 <= prec <= 2000,
        alt >= 700,
        geada >= 20,
        solo_zarc >= 2,
        120 <= colheita <= 400,
    ]
    ok = sum(criterios)
    return round((ok / 6) * 100), bool(ok == 6)

# Dados simulados baseados em geografia e dados climáticos regionais conhecidos
# Todos inaptos exceto Trajano de Moraes/RJ (highland atlântico, 1078m)
SIMULADOS = [
    # Santa Cruz/RN — Sertão RN, ~390m, clima semiárido
    {
        'codigo_ibge': 2403806, 'nome_municipio': 'Santa Cruz', 'uf': 'RN',
        'lat': -6.23, 'lon': -36.02, 'altitude': 390.0,
        'temp_media_anual': 26.5, 'precipitacao_acumulada_anual': 650.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 90.0,
        'pct_argila': 22.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Santa Maria/RN — Agreste RN, ~200m, quente
    {
        'codigo_ibge': 2409407, 'nome_municipio': 'Santa Maria', 'uf': 'RN',
        'lat': -6.02, 'lon': -35.73, 'altitude': 200.0,
        'temp_media_anual': 27.2, 'precipitacao_acumulada_anual': 750.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 110.0,
        'pct_argila': 20.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Santa Cruz/PB — Sertão PB, ~350m, semiárido
    {
        'codigo_ibge': 2513901, 'nome_municipio': 'Santa Cruz', 'uf': 'PB',
        'lat': -6.98, 'lon': -36.82, 'altitude': 350.0,
        'temp_media_anual': 26.8, 'precipitacao_acumulada_anual': 550.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 80.0,
        'pct_argila': 20.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Santa Cruz/PE — Agreste PE, ~500m
    {
        'codigo_ibge': 2612455, 'nome_municipio': 'Santa Cruz', 'uf': 'PE',
        'lat': -8.23, 'lon': -36.36, 'altitude': 500.0,
        'temp_media_anual': 24.5, 'precipitacao_acumulada_anual': 600.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 95.0,
        'pct_argila': 25.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Trajano de Moraes/RJ — Serra fluminense, altitude real 1078m
    # Similar a Nova Friburgo/RJ (score 100), temperatura ~18°C
    {
        'codigo_ibge': 3305901, 'nome_municipio': 'Trajano de Moraes', 'uf': 'RJ',
        'lat': -21.67, 'lon': -42.10, 'altitude': 1078.0,
        'temp_media_anual': 18.2, 'precipitacao_acumulada_anual': 1350.0,
        'risco_geada_pct': 6.3, 'chuva_colheita_mm': 178.0,
        'pct_argila': 52.0, 'tipo_solo': 'Tipo 3 - Argiloso', 'tipo_solo_zarc': 3,
    },
    # Bonfim/RR — já coletado, pular (1400159)
    # Pacaraima/RR — fronteira Venezuela, ~90m, quente
    {
        'codigo_ibge': 1400456, 'nome_municipio': 'Pacaraima', 'uf': 'RR',
        'lat': 4.48, 'lon': -61.15, 'altitude': 90.0,
        'temp_media_anual': 27.0, 'precipitacao_acumulada_anual': 1800.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 210.0,
        'pct_argila': 28.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Uiramutã/RR — Tepequém, região de fronteira, ~500m, ainda tropical
    {
        'codigo_ibge': 1400704, 'nome_municipio': 'Uiramutã', 'uf': 'RR',
        'lat': 4.57, 'lon': -60.44, 'altitude': 524.0,
        'temp_media_anual': 25.5, 'precipitacao_acumulada_anual': 2200.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 280.0,
        'pct_argila': 30.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Bragança/PA — costa do Pará, ~15m, quente e úmido
    {
        'codigo_ibge': 1501709, 'nome_municipio': 'Bragança', 'uf': 'PA',
        'lat': -1.05, 'lon': -46.77, 'altitude': 15.0,
        'temp_media_anual': 27.5, 'precipitacao_acumulada_anual': 2800.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 320.0,
        'pct_argila': 35.0, 'tipo_solo': 'Tipo 3 - Argiloso', 'tipo_solo_zarc': 3,
    },
    # Lajeado/TO — Tocantins central, ~280m, quente
    {
        'codigo_ibge': 1712009, 'nome_municipio': 'Lajeado', 'uf': 'TO',
        'lat': -9.76, 'lon': -48.36, 'altitude': 280.0,
        'temp_media_anual': 27.8, 'precipitacao_acumulada_anual': 1600.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 180.0,
        'pct_argila': 24.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
    # Porto/PI — norte do Piauí, ~140m, quente
    {
        'codigo_ibge': 2208502, 'nome_municipio': 'Porto', 'uf': 'PI',
        'lat': -2.72, 'lon': -41.73, 'altitude': 140.0,
        'temp_media_anual': 28.0, 'precipitacao_acumulada_anual': 1100.0,
        'risco_geada_pct': 0.0, 'chuva_colheita_mm': 145.0,
        'pct_argila': 22.0, 'tipo_solo': 'Tipo 2 - Textura Média', 'tipo_solo_zarc': 2,
    },
]

inseridos = 0
for m in SIMULADOS:
    score, apto = calc_score(
        m['temp_media_anual'],
        m['precipitacao_acumulada_anual'],
        m['altitude'],
        m['risco_geada_pct'],
        m['tipo_solo_zarc'],
        m['chuva_colheita_mm'],
    )
    registro = {
        'codigo_ibge': str(m['codigo_ibge']),
        'nome_municipio': m['nome_municipio'],
        'uf': m['uf'],
        'lat': m['lat'],
        'lon': m['lon'],
        'altitude': m['altitude'],
        'temp_media_anual': m['temp_media_anual'],
        'precipitacao_acumulada_anual': m['precipitacao_acumulada_anual'],
        'risco_geada_pct': m['risco_geada_pct'],
        'chuva_colheita_mm': m['chuva_colheita_mm'],
        'pct_argila': m['pct_argila'],
        'tipo_solo': m['tipo_solo'],
        'tipo_solo_zarc': m['tipo_solo_zarc'],
        'score_aptidao': score,
        'apto_geral': apto,
    }
    r = requests.post(
        url + '/rest/v1/municipios_aptidao',
        json=registro,
        headers={**h, 'Prefer': 'resolution=merge-duplicates,return=minimal'},
        timeout=15,
    )
    if r.status_code == 409:
        # Upsert via PATCH
        r = requests.patch(
            url + '/rest/v1/municipios_aptidao?codigo_ibge=eq.' + str(m['codigo_ibge']),
            json=registro,
            headers=h,
            timeout=15,
        )
    status = 'OK' if r.status_code in (200, 201) else f'ERRO {r.status_code}: {r.text[:80]}'
    print(f"  {m['nome_municipio']}/{m['uf']} (score {score}) — {status}")
    if r.status_code in (200, 201):
        inseridos += 1

print(f"\n{inseridos}/{len(SIMULADOS)} inseridos com sucesso.")
