import time
import json
import os
import threading
import pandas as pd
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def requisicao_com_retry(url, params=None, tentativas=3, timeout=20):
    """GET com retry: 3 tentativas para erros de rede, pausa fixa de 30s para rate limit (429)."""
    erros_rede = 0
    for _ in range(tentativas):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                print(f"\n  [rate limit] aguardando 30s...", end=" ", flush=True)
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

# ==============================================================================
# CONFIGURAÇÃO DO SUPABASE
# ==============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CHECKPOINT_FILE = "checkpoint_processados.json"
SLEEP_ENTRE_CIDADES = 1.0

# ==============================================================================
# CHECKPOINT
# ==============================================================================
def carregar_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def salvar_checkpoint(processados):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(list(processados), f)

# ==============================================================================
# 1. MUNICÍPIOS (API IBGE)
# ==============================================================================
def buscar_municipios_ibge():
    print("Buscando lista completa de municípios do IBGE...")
    url = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    municipios = []
    for m in response.json():
        try:
            uf = m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
        except (TypeError, KeyError):
            uf = m.get("regiao-imediata", {}).get("regiao-intermediaria", {}).get("UF", {}).get("sigla", "??")
        municipios.append({
            "codigo_ibge": str(m["id"]),
            "nome_municipio": m["nome"],
            "uf": uf,
        })
    print(f"{len(municipios)} municípios encontrados.")
    return municipios

# ==============================================================================
# 2. COORDENADAS E ALTITUDE (Open-Meteo Geocoding)
# ==============================================================================

# Nome completo de cada estado — usado para validar o campo admin1 do geocoder
UF_ESTADO = {
    "AC":"Acre","AL":"Alagoas","AM":"Amazonas","AP":"Amapá","BA":"Bahia",
    "CE":"Ceará","DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás",
    "MA":"Maranhão","MG":"Minas Gerais","MS":"Mato Grosso do Sul",
    "MT":"Mato Grosso","PA":"Pará","PB":"Paraíba","PE":"Pernambuco",
    "PI":"Piauí","PR":"Paraná","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte",
    "RO":"Rondônia","RR":"Roraima","RS":"Rio Grande do Sul",
    "SC":"Santa Catarina","SE":"Sergipe","SP":"São Paulo","TO":"Tocantins",
}

# Bounding boxes aproximadas por estado [lat_min, lat_max, lon_min, lon_max]
BBOX_UF = {
    "AC":(-11.1,-7.1,-74.0,-66.6),"AL":(-10.5,-8.8,-38.2,-35.1),
    "AM":( -9.9, 2.3,-73.8,-56.1),"AP": (-1.3, 4.4,-52.0,-49.9),
    "BA":(-18.4,-8.5,-46.6,-37.3),"CE": (-7.8,-2.8,-41.4,-37.2),
    "DF":(-16.1,-15.5,-48.3,-47.3),"ES":(-21.3,-17.8,-41.9,-39.7),
    "GO":(-19.5,-12.4,-53.3,-45.9),"MA":(-10.4,-1.0,-48.7,-41.8),
    "MG":(-22.9,-14.2,-51.0,-39.9),"MS":(-24.1,-17.2,-57.7,-50.9),
    "MT":(-18.1, -7.4,-61.7,-50.2),"PA": (-9.9, 2.6,-58.7,-46.0),
    "PB": (-8.3,-6.0,-38.8,-34.8),"PE": (-9.5,-7.2,-41.4,-34.9),
    "PI":(-11.1,-2.8,-45.9,-40.4),"PR":(-26.7,-22.5,-54.6,-48.0),
    "RJ":(-23.4,-20.8,-44.9,-40.9),"RN": (-6.9,-4.8,-38.6,-35.0),
    "RO":(-13.7,-7.9,-66.8,-59.8),"RR": (-1.4, 5.3,-64.8,-59.8),
    "RS":(-33.8,-27.1,-57.7,-49.7),"SC":(-29.4,-25.9,-53.9,-48.4),
    "SE":(-11.6,-9.5,-38.2,-36.4),"SP":(-25.3,-19.8,-53.2,-44.2),
    "TO":(-13.5,-5.2,-50.8,-45.7),
}

def _coords_no_estado(lat, lon, uf):
    """Verifica se as coordenadas estão dentro do bounding box do estado."""
    bb = BBOX_UF.get(uf)
    if bb is None:
        return True  # estado desconhecido: aceita
    return bb[0] <= lat <= bb[1] and bb[2] <= lon <= bb[3]

# Nomes alternativos para municípios com geocodificação difícil
NOMES_ALT = {
    'Alexandria':                   'Alexandria Rio Grande do Norte',
    'Januário Cicco':               'Januario Cicco RN',
    'Conde':                        'Conde Paraíba',
    'Belém do São Francisco':       'Belem do Sao Francisco Pernambuco',
    'Iguaracy':                     'Iguaracy Pernambuco',
    'Lagoa de Itaenga':             'Lagoa de Itaenga PE',
    'Graccho Cardoso':              'Gracho Cardoso Sergipe',
    'São Tomé das Letras':          'Sao Tome das Letras MG',
    'Trajano de Moraes':            'Trajano de Morais RJ',
    'Santa Fé':                     'Santa Fe Paraná',
    'Aurora':                       'Aurora Santa Catarina',
    'Monte Carlo':                  'Monte Carlo SC',
    'Presidente Castello Branco':   'Presidente Castelo Branco SC',
    'Dilermando de Aguiar':         'Dilermando de Aguiar RS',
    'Santiago':                     'Santiago Rio Grande do Sul',
    'Figueirópolis D\'Oeste':       'Figueiropolis d Oeste MT',
    'Santo Antônio de Leverger':    'Santo Antonio de Leverger MT',
    'Sítio d\'Abadia':              'Sitio dAbadia GO',
    'Conde':                        'Conde BA',
    # Geocodificados erroneamente para homônimos no sul
    'Bragança':                     'Braganca Para Brasil',
    'Lajeado':                      'Lajeado Tocantins Brasil',
    'Porto':                        'Porto Piaui Brasil',
    'Pacaraima':                    'Pacaraima Roraima Brasil',
}

def buscar_coordenadas(nome, uf=None):
    """Geocodifica um município usando Open-Meteo.
    Prioriza resultados que correspondam ao estado (uf) informado.
    Valida as coordenadas contra o bounding box do estado.
    """
    url = "https://geocoding-api.open-meteo.com/v1/search"
    estado_nome = UF_ESTADO.get(uf, "") if uf else ""

    # Tentativa 1: busca com nome + UF (ex: "Morrinhos GO")
    for query in ([f"{nome} {uf}", nome] if uf else [nome]):
        params = {"name": query, "count": 15, "language": "pt", "format": "json"}
        response = requisicao_com_retry(url, params=params, timeout=15)
        if response is None or response.status_code != 200:
            continue
        resultados = response.json().get("results", [])

        # Passa 1: estado exato pelo campo admin1
        for r in resultados:
            if r.get("country_code") != "BR":
                continue
            admin1 = r.get("admin1", "")
            if uf and estado_nome and estado_nome.lower() in admin1.lower():
                lat = r["latitude"]; lon = r["longitude"]
                if _coords_no_estado(lat, lon, uf):
                    return {"lat": lat, "lon": lon, "altitude": float(r.get("elevation") or 0)}

        # Passa 2: qualquer resultado BR dentro do bounding box
        if uf:
            for r in resultados:
                if r.get("country_code") != "BR":
                    continue
                lat = r["latitude"]; lon = r["longitude"]
                if _coords_no_estado(lat, lon, uf):
                    return {"lat": lat, "lon": lon, "altitude": float(r.get("elevation") or 0)}

        # Passa 3: primeiro resultado BR sem validação de estado
        for r in resultados:
            if r.get("country_code") == "BR":
                return {"lat": r["latitude"], "lon": r["longitude"],
                        "altitude": float(r.get("elevation") or 0)}

    # Tentativa extra: nome alternativo do dicionário
    nome_alt = NOMES_ALT.get(nome)
    if nome_alt:
        params = {"name": nome_alt, "count": 10, "language": "pt", "format": "json"}
        response = requisicao_com_retry(url, params=params, timeout=15)
        if response and response.status_code == 200:
            for r in response.json().get("results", []):
                if r.get("country_code") == "BR":
                    lat = r["latitude"]; lon = r["longitude"]
                    if not uf or _coords_no_estado(lat, lon, uf):
                        return {"lat": lat, "lon": lon, "altitude": float(r.get("elevation") or 0)}

    # Fallback final: Nominatim / OpenStreetMap (melhor cobertura de municípios pequenos)
    try:
        estado_nome = UF_ESTADO.get(uf, "") if uf else ""
        query = f"{nome}, {estado_nome}, Brasil" if estado_nome else f"{nome}, Brasil"
        nom_url = "https://nominatim.openstreetmap.org/search"
        nom_params = {"q": query, "format": "json", "limit": 5,
                      "countrycodes": "br", "addressdetails": 1}
        nom_headers = {"User-Agent": "SOUFII-Agraria/1.0"}
        r_nom = requests.get(nom_url, params=nom_params, headers=nom_headers, timeout=15)
        time.sleep(1.1)  # Nominatim exige ≥1s entre requisições
        if r_nom.status_code == 200:
            for item in r_nom.json():
                lat = float(item["lat"]); lon = float(item["lon"])
                if not uf or _coords_no_estado(lat, lon, uf):
                    # Busca altitude via Open-Meteo elevation API
                    elev_r = requests.get(
                        f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}",
                        timeout=10)
                    alt = 0.0
                    if elev_r.status_code == 200:
                        alt = float(elev_r.json().get("elevation", [0])[0])
                    return {"lat": lat, "lon": lon, "altitude": alt}
    except Exception:
        pass
    return None

# ==============================================================================
# 3. SOLO — SoilGrids v2.0 Properties API
# Teor de argila (0-20cm) → Classificação ZARC para Cevada
#   Tipo 1: argila < 15%  — arenoso, não recomendado
#   Tipo 2: 15–35%        — textura média
#   Tipo 3: > 35%         — argiloso, ideal para cevada
# ==============================================================================
def buscar_solo_zarc(lat, lon):
    # SoilGrids não aceita "0-20cm" — usa profundidades padrão e média ponderada.
    # Alguns pixels têm NODATA; percorre pequenos offsets até achar dado válido.
    weights = [5, 10, 5]  # cm de cada profundidade dentro do intervalo 0-20cm
    offsets = [(0,0),(0,.1),(0,-.1),(.1,0),(-.1,0),(.1,.1),(-.1,-.1),(.2,0),(0,.2)]

    for dlat, dlon in offsets:
        la = round(lat + dlat, 4)
        lo = round(lon + dlon, 4)
        query = (f"lon={lo}&lat={la}&property=clay"
                 "&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean")
        response = requisicao_com_retry(
            f"https://rest.isric.org/soilgrids/v2.0/properties/query?{query}",
            timeout=30,
        )
        if response is None or response.status_code != 200:
            continue
        try:
            layers = response.json()["properties"]["layers"]
            if not layers:
                continue
            depth_vals = [d["values"]["mean"] for d in layers[0]["depths"]
                          if d["values"]["mean"] is not None]
            if not depth_vals:
                continue
            w_sum = sum(weights[:len(depth_vals)])
            pct_argila = round(
                sum(v * w for v, w in zip(depth_vals, weights[:len(depth_vals)]))
                / w_sum / 10.0, 1
            )
            if pct_argila < 15.0:
                return pct_argila, 1, "Tipo 1 - Arenoso"
            elif pct_argila <= 35.0:
                return pct_argila, 2, "Tipo 2 - Textura Média"
            else:
                return pct_argila, 3, "Tipo 3 - Argiloso"
        except Exception:
            continue

    return None, None, "Não informado"

# ==============================================================================
# 4. CLIMA — NASA POWER API (histórico mensal 1993–2024, ~30 anos)
# Parâmetros:
#   T2M        — temperatura média diária média mensal (°C)
#   T2M_MIN    — temperatura mínima diária média mensal (°C)
#   PRECTOTCORR — precipitação mensal acumulada (mm)
# ==============================================================================
def buscar_clima_nasa_power(lat, lon):
    url = "https://power.larc.nasa.gov/api/temporal/monthly/point"
    params = {
        "parameters": "T2M_MIN,T2M,PRECTOTCORR",
        "community": "ag",
        "longitude": lon,
        "latitude": lat,
        "start": "1993",
        "end": "2024",
        "format": "JSON",
    }
    response = requisicao_com_retry(url, params=params, timeout=60)
    if response is None or response.status_code != 200:
        return None
    try:
        param_data = response.json()["properties"]["parameter"]
        # Filtra apenas chaves YYYYMM válidas (remove "ANN" e mês 13 = média anual da NASA POWER)
        dates = [k for k in param_data["T2M"].keys()
                 if len(k) == 6 and k.isdigit() and 1 <= int(k[4:]) <= 12]
        df = pd.DataFrame(
            {col: {k: param_data[col][k] for k in dates}
             for col in ["T2M", "T2M_MIN", "PRECTOTCORR"]}
        )
        df.index = pd.to_datetime(df.index, format="%Y%m")
        df = df.replace(-999.0, pd.NA).dropna()
        # NASA POWER retorna PRECTOTCORR em mm/dia — converter para mm/mes
        df["PREC_MM"] = df["PRECTOTCORR"] * df.index.days_in_month
        df["mes"] = df.index.month
        return df
    except Exception:
        return None

# ==============================================================================
# 4b. VALIDAÇÃO DE GEOCODIFICAÇÃO
# Detecta coordenadas erradas comparando temperatura com faixas esperadas por UF.
# ==============================================================================
TEMP_RANGE_UF = {
    'AC': (23, 28), 'AL': (23, 27), 'AM': (24, 29), 'AP': (25, 29),
    'BA': (17, 28), 'CE': (23, 28), 'DF': (19, 24), 'ES': (21, 26),
    'GO': (19, 26), 'MA': (24, 29), 'MG': (15, 27), 'MS': (20, 27),
    'MT': (22, 28), 'PA': (24, 29), 'PB': (22, 28), 'PE': (22, 28),
    'PI': (24, 29), 'PR': (13, 24), 'RJ': (20, 26), 'RN': (23, 28),
    'RO': (23, 28), 'RR': (24, 29), 'RS': (13, 22), 'SC': (12, 22),
    'SE': (23, 27), 'SP': (17, 25), 'TO': (23, 29),
}
MARGEM_TEMP = 2
# Estados amazônicos têm margem menor — raramente têm municípios com clima frio
MARGEM_UF = {
    'AM':1,'PA':1,'RO':1,'RR':1,'AP':1,'AC':1,'MA':1,'PI':1,'TO':1,
}

def validar_geocodificacao(temp_anual, alt, uf, nome):
    rng = TEMP_RANGE_UF.get(uf)
    if rng:
        margem = MARGEM_UF.get(uf, MARGEM_TEMP)
        tmin, tmax = rng[0] - margem, rng[1] + margem
        if not (tmin <= temp_anual <= tmax):
            return False, (
                f"temperatura {temp_anual:.1f}C fora do esperado para {uf} "
                f"({rng[0]}-{rng[1]}C) — provavel erro de geocodificacao"
            )
    ALT_MAX_UF = {
        'AM': 300, 'PA': 500, 'AP': 200, 'RR': 700,
        'MA': 600, 'PI': 850, 'AL': 700, 'SE': 400, 'RJ': 1000,
    }
    alt_max = ALT_MAX_UF.get(uf)
    if alt_max and alt > alt_max:
        return False, (
            f"altitude {alt:.0f}m improvavel para {uf} "
            f"(max esperado ~{alt_max}m) — possivel erro de geocodificacao"
        )
    return True, ''

# ==============================================================================
# 5. CRITÉRIOS DE APTIDÃO — ZARC/EMBRAPA para Cevada
#
#   Solo    : Tipo 2 ou 3 (argila ≥ 15%)
#   Temp    : 10–22°C (média anual)
#   Chuva   : 400-2000mm (acumulado anual; PR/SC/RS recebem 1400-2000mm)
#   Altitude: >= 700m
#   Geada   : < 30% dos meses Jul/Ago com T_min ≤ 2°C (risco no espigamento)
#   Colheita: < 250mm acumulado médio em Out/Nov (risco de germinação na espiga)
# ==============================================================================
def calcular_aptidao(temp_anual, chuva_anual, altitude, tipo_zarc, risco_geada_pct, chuva_colheita_mm):
    apto_solo     = tipo_zarc is not None and tipo_zarc >= 2
    apto_temp     = 10.0 <= temp_anual <= 22.0
    apto_chuva    = 400.0 <= chuva_anual <= 2000.0
    apto_alt      = altitude >= 700.0
    apto_geada    = risco_geada_pct < 30.0
    apto_colheita = chuva_colheita_mm is not None and 120.0 <= chuva_colheita_mm <= 400.0

    criterios  = [apto_solo, apto_temp, apto_chuva, apto_alt, apto_geada, apto_colheita]
    apto_final = all(criterios)
    score      = int(round(sum(criterios) / len(criterios) * 100))
    return apto_final, score

# ==============================================================================
# 6. PROCESSAR E SALVAR UM MUNICÍPIO NO SUPABASE
# ==============================================================================
def processar_municipio(municipio):
    cod_ibge = municipio["codigo_ibge"]
    nome     = municipio["nome_municipio"]
    uf       = municipio["uf"]

    # Coordenadas (passa UF para evitar homônimos entre estados)
    coords = buscar_coordenadas(nome, uf)
    if coords is None:
        return False, "coordenadas não encontradas"
    lat, lon, altitude = coords["lat"], coords["lon"], coords["altitude"]

    # Solo ZARC (SoilGrids — teor de argila)
    pct_argila, tipo_zarc, nome_solo = buscar_solo_zarc(lat, lon)

    # Clima histórico (NASA POWER — 30 anos mensais)
    df_clima = buscar_clima_nasa_power(lat, lon)
    if df_clima is None:
        return False, "erro na NASA POWER API"

    # Médias mensais (PREC_MM = mm/mes, já convertido de mm/dia)
    medias = df_clima.groupby("mes").agg(
        T2M=("T2M", "mean"),
        T2M_MIN=("T2M_MIN", "mean"),
        PREC_MM=("PREC_MM", "mean"),
    ).reset_index()

    temp_anual_media  = float(medias["T2M"].mean())
    chuva_anual_media = float(medias["PREC_MM"].sum())

    ok, motivo = validar_geocodificacao(temp_anual_media, altitude, uf, nome)
    if not ok:
        return False, motivo

    # Risco de geada: % dos meses Jul/Ago em que T_min médio ≤ 2°C
    meses_jul_ago  = df_clima[df_clima["mes"].isin([7, 8])]
    total_jul_ago  = len(meses_jul_ago)
    meses_c_geada  = meses_jul_ago[meses_jul_ago["T2M_MIN"] <= 2.0].shape[0]
    risco_geada_pct = round((meses_c_geada / total_jul_ago * 100), 1) if total_jul_ago > 0 else 0.0

    # Chuva na colheita: média anual acumulada Out+Nov (em mm)
    df_out_nov = df_clima[df_clima["mes"].isin([10, 11])]
    if len(df_out_nov) > 0:
        chuva_colheita_mm = round(
            df_out_nov.groupby(df_out_nov.index.year)["PREC_MM"].sum().mean(), 1
        )
    else:
        chuva_colheita_mm = None

    # Aptidão final
    apto_geral, score_final = calcular_aptidao(
        temp_anual_media, chuva_anual_media, altitude,
        tipo_zarc, risco_geada_pct, chuva_colheita_mm or 0.0,
    )

    # Upsert tabela principal
    supabase.table("municipios_aptidao").upsert({
        "codigo_ibge":                  cod_ibge,
        "nome_municipio":               nome,
        "uf":                           uf,
        "lat":                          float(lat),
        "lon":                          float(lon),
        "altitude":                     float(altitude),
        "tipo_solo":                    nome_solo,
        "pct_argila":                   float(pct_argila) if pct_argila is not None else None,
        "tipo_solo_zarc":               int(tipo_zarc) if tipo_zarc is not None else None,
        "temp_media_anual":             float(round(temp_anual_media, 2)),
        "precipitacao_acumulada_anual": float(round(chuva_anual_media, 2)),
        "risco_geada_pct":              float(risco_geada_pct),
        "chuva_colheita_mm":            float(chuva_colheita_mm) if chuva_colheita_mm is not None else None,
        "apto_geral":                   bool(apto_geral),
        "score_aptidao":                int(score_final),
    }, on_conflict="codigo_ibge").execute()

    # Upsert sazonalidade mensal (12 registros, agora com temp_min)
    registros = []
    for _, linha in medias.iterrows():
        registros.append({
            "codigo_ibge":  cod_ibge,
            "mes":          int(linha["mes"]),
            "temp_media":   float(round(linha["T2M"], 2)),
            "temp_min":     float(round(linha["T2M_MIN"], 2)),
            "precipitacao": float(round(linha["PREC_MM"], 2)),
            "apto_no_mes":  bool(10.0 <= linha["T2M"] <= 22.0),
        })
    supabase.table("sazonalidade_mensal").upsert(
        registros, on_conflict="codigo_ibge,mes"
    ).execute()

    return True, (
        f"score {score_final}/100 | apto: {apto_geral} | "
        f"{nome_solo} ({pct_argila}% argila) | "
        f"geada: {risco_geada_pct}% | colheita: {chuva_colheita_mm}mm"
    )

# ==============================================================================
# 7. LOOP PRINCIPAL — PARALELO (4 workers)
# ==============================================================================
WORKERS = 4

municipios  = buscar_municipios_ibge()
total       = len(municipios)
processados = carregar_checkpoint()
pendentes   = [m for m in municipios if m["codigo_ibge"] not in processados]

print(f"Ja processados anteriormente: {len(processados)}")
print(f"Pendentes nesta execucao:     {len(pendentes)}")
print(f"Workers paralelos:            {WORKERS}")
print(f"Tempo estimado:               ~{len(pendentes) * 8 / WORKERS / 60:.0f} min\n")

lock      = threading.Lock()
erros     = []
concluidos = 0
inicio    = datetime.now()

def processar_com_lock(municipio):
    nome = municipio["nome_municipio"]
    uf   = municipio["uf"]
    try:
        sucesso, msg = processar_municipio(municipio)
    except Exception as e:
        sucesso, msg = False, str(e)
    return municipio, sucesso, msg

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futuros = {executor.submit(processar_com_lock, m): m for m in pendentes}

    for fut in as_completed(futuros):
        municipio, sucesso, msg = fut.result()
        nome = municipio["nome_municipio"]
        uf   = municipio["uf"]

        with lock:
            concluidos += 1
            idx = len(processados) + concluidos
            if sucesso:
                processados.add(municipio["codigo_ibge"])
                print(f"[{idx}/{total}] {nome}/{uf} OK ({msg})", flush=True)
                if concluidos % 10 == 0:
                    salvar_checkpoint(processados)
            else:
                erros.append(f"{nome}/{uf}: {msg}")
                print(f"[{idx}/{total}] {nome}/{uf} ERRO ({msg})", flush=True)

            if concluidos % 50 == 0:
                elapsed = (datetime.now() - inicio).total_seconds()
                taxa    = concluidos / elapsed if elapsed > 0 else 0
                rest    = len(pendentes) - concluidos
                eta     = timedelta(seconds=int(rest / taxa)) if taxa > 0 else "?"
                print(f"\n  >> {len(processados)}/{total} no Supabase | ETA: {eta}\n", flush=True)

salvar_checkpoint(processados)
print("\n" + "=" * 60)
print(f"Concluido: {len(processados)}/{total} municipios no Supabase.")
if erros:
    print(f"Erros ({len(erros)}):")
    for e in erros[:30]:
        print(f"  - {e}")
    if len(erros) > 30:
        print(f"  ... e mais {len(erros) - 30} erros.")
