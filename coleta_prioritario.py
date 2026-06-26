"""
coleta_prioritario.py — Coleta prioritária para estados relevantes para cevada.

Processa PR, SC, RS, GO, MG, SP antes do script principal chegar neles.
Usa o mesmo checkpoint e Supabase que coleta_dados.py.
"""
import time, json, os
import pandas as pd
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

CHECKPOINT_FILE   = "checkpoint_processados.json"
SLEEP_ENTRE       = 2.5
UFS_PRIORITARIAS  = ['PR', 'SC', 'RS', 'GO', 'MG', 'SP', 'MS', 'MT', 'BA']

def carregar_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def salvar_checkpoint(processados):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(list(processados), f)

def get(url, params=None, tentativas=4, timeout=30):
    for _ in range(tentativas):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                print(" [rate limit 60s]", end="", flush=True)
                time.sleep(60)
                continue
            return r
        except requests.exceptions.RequestException:
            time.sleep(4)
    return None

UF_ESTADO = {
    "AC":"Acre","AL":"Alagoas","AM":"Amazonas","AP":"Amapá","BA":"Bahia",
    "CE":"Ceará","DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás",
    "MA":"Maranhão","MG":"Minas Gerais","MS":"Mato Grosso do Sul",
    "MT":"Mato Grosso","PA":"Pará","PB":"Paraíba","PE":"Pernambuco",
    "PI":"Piauí","PR":"Paraná","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte",
    "RO":"Rondônia","RR":"Roraima","RS":"Rio Grande do Sul",
    "SC":"Santa Catarina","SE":"Sergipe","SP":"São Paulo","TO":"Tocantins",
}
BBOX_UF = {
    "AC":(-11.1,-7.1,-74.0,-66.6),"AL":(-10.5,-8.8,-38.2,-35.1),
    "AM":(-9.9,2.3,-73.8,-56.1),"AP":(-1.3,4.4,-52.0,-49.9),
    "BA":(-18.4,-8.5,-46.6,-37.3),"CE":(-7.8,-2.8,-41.4,-37.2),
    "DF":(-16.1,-15.5,-48.3,-47.3),"ES":(-21.3,-17.8,-41.9,-39.7),
    "GO":(-19.5,-12.4,-53.3,-45.9),"MA":(-10.4,-1.0,-48.7,-41.8),
    "MG":(-22.9,-14.2,-51.0,-39.9),"MS":(-24.1,-17.2,-57.7,-50.9),
    "MT":(-18.1,-7.4,-61.7,-50.2),"PA":(-9.9,2.6,-58.7,-46.0),
    "PB":(-8.3,-6.0,-38.8,-34.8),"PE":(-9.5,-7.2,-41.4,-34.9),
    "PI":(-11.1,-2.8,-45.9,-40.4),"PR":(-26.7,-22.5,-54.6,-48.0),
    "RJ":(-23.4,-20.8,-44.9,-40.9),"RN":(-6.9,-4.8,-38.6,-35.0),
    "RO":(-13.7,-7.9,-66.8,-59.8),"RR":(-1.4,5.3,-64.8,-59.8),
    "RS":(-33.8,-27.1,-57.7,-49.7),"SC":(-29.4,-25.9,-53.9,-48.4),
    "SE":(-11.6,-9.5,-38.2,-36.4),"SP":(-25.3,-19.8,-53.2,-44.2),
    "TO":(-13.5,-5.2,-50.8,-45.7),
}

def buscar_coordenadas(nome, uf=None):
    estado_nome = UF_ESTADO.get(uf, "") if uf else ""
    for query in ([f"{nome} {uf}", nome] if uf else [nome]):
        resp = get("https://geocoding-api.open-meteo.com/v1/search",
                   params={"name": query, "count": 15, "language": "pt", "format": "json"}, timeout=15)
        if not resp or resp.status_code != 200:
            continue
        resultados = resp.json().get("results", [])
        bb = BBOX_UF.get(uf)
        def ok_bbox(lat, lon):
            return bb is None or (bb[0]<=lat<=bb[1] and bb[2]<=lon<=bb[3])
        # Passa 1: admin1 + bbox
        for res in resultados:
            if res.get("country_code") != "BR": continue
            if uf and estado_nome and estado_nome.lower() in res.get("admin1","").lower():
                lat, lon = res["latitude"], res["longitude"]
                if ok_bbox(lat, lon):
                    return {"lat": float(lat), "lon": float(lon), "altitude": float(res.get("elevation") or 0)}
        # Passa 2: só bbox
        if uf:
            for res in resultados:
                if res.get("country_code") != "BR": continue
                lat, lon = res["latitude"], res["longitude"]
                if ok_bbox(lat, lon):
                    return {"lat": float(lat), "lon": float(lon), "altitude": float(res.get("elevation") or 0)}
        # Passa 3: primeiro BR
        for res in resultados:
            if res.get("country_code") == "BR":
                return {"lat": float(res["latitude"]), "lon": float(res["longitude"]),
                        "altitude": float(res.get("elevation") or 0)}
    return None

def buscar_solo_zarc(lat, lon):
    # SoilGrids não aceita "0-20cm"; usa profundidades padrão + média ponderada.
    # Percorre offsets pequenos para contornar pixels NODATA no raster.
    weights = [5, 10, 5]
    offsets = [(0,0),(0,.1),(0,-.1),(.1,0),(-.1,0),(.1,.1),(-.1,-.1),(.2,0),(0,.2)]

    for dlat, dlon in offsets:
        la = round(lat + dlat, 4)
        lo = round(lon + dlon, 4)
        query = (f"lon={lo}&lat={la}&property=clay"
                 "&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean")
        r = get(f"https://rest.isric.org/soilgrids/v2.0/properties/query?{query}", timeout=30)
        if not r or r.status_code != 200:
            continue
        try:
            layers = r.json()["properties"]["layers"]
            if not layers:
                continue
            depth_vals = [d["values"]["mean"] for d in layers[0]["depths"]
                          if d["values"]["mean"] is not None]
            if not depth_vals:
                continue
            w_sum = sum(weights[:len(depth_vals)])
            pct = round(
                sum(v * w for v, w in zip(depth_vals, weights[:len(depth_vals)]))
                / w_sum / 10.0, 1
            )
            tipo = 1 if pct < 15 else (2 if pct <= 35 else 3)
            return pct, tipo
        except Exception:
            continue

    return None, None

def buscar_clima(lat, lon):
    r = get("https://power.larc.nasa.gov/api/temporal/monthly/point",
            params={"parameters": "T2M_MIN,T2M,PRECTOTCORR", "community": "ag",
                    "longitude": lon, "latitude": lat, "start": "1993", "end": "2024", "format": "JSON"}, timeout=60)
    if not r or r.status_code != 200:
        return None
    try:
        p = r.json()["properties"]["parameter"]
        dates = [k for k in p["T2M"] if len(k) == 6 and k.isdigit() and 1 <= int(k[4:]) <= 12]
        df = pd.DataFrame({col: {k: p[col][k] for k in dates} for col in ["T2M", "T2M_MIN", "PRECTOTCORR"]})
        df.index = pd.to_datetime(df.index, format="%Y%m")
        df = df.replace(-999.0, pd.NA).dropna()
        # NASA POWER retorna PRECTOTCORR em mm/dia — converter para mm/mes
        df["PREC_MM"] = df["PRECTOTCORR"] * df.index.days_in_month
        return df
    except Exception:
        return None

# Faixa de temperatura anual esperada (min, max) por UF.
# Usada para detectar geocodificação errada: se a temperatura
# retornada pela NASA POWER for incompatível com o clima real do estado,
# as coordenadas encontradas quase certamente são de outro lugar.
TEMP_RANGE_UF = {
    'AC': (23, 28), 'AL': (23, 27), 'AM': (24, 29), 'AP': (25, 29),
    'BA': (17, 28), 'CE': (23, 28), 'DF': (19, 24), 'ES': (21, 26),
    'GO': (19, 26), 'MA': (24, 29), 'MG': (15, 27), 'MS': (20, 27),
    'MT': (22, 28), 'PA': (24, 29), 'PB': (22, 28), 'PE': (22, 28),
    'PI': (24, 29), 'PR': (13, 24), 'RJ': (20, 26), 'RN': (23, 28),
    'RO': (23, 28), 'RR': (24, 29), 'RS': (13, 22), 'SC': (12, 22),
    'SE': (23, 27), 'SP': (17, 25), 'TO': (23, 29),
}
MARGEM_TEMP = 2  # graus de tolerância além do range esperado

def validar_geocodificacao(temp_anual, alt, uf, nome):
    """
    Retorna (True, '') se os dados climáticos fazem sentido para o estado,
    ou (False, motivo) se parecer um erro de geocodificação.
    """
    rng = TEMP_RANGE_UF.get(uf)
    if rng:
        tmin, tmax = rng[0] - MARGEM_TEMP, rng[1] + MARGEM_TEMP
        if not (tmin <= temp_anual <= tmax):
            return False, (
                f"temperatura {temp_anual:.1f}C fora do esperado para {uf} "
                f"({rng[0]}-{rng[1]}C) — provavel erro de geocodificacao"
            )
    # Altitudes absurdas para estados planos do Norte/Nordeste costeiro
    ALT_MAX_UF = {
        'AM': 300, 'PA': 500, 'AP': 200, 'RR': 300,
        'MA': 600, 'PI': 700, 'AL': 400, 'SE': 400, 'RJ': 500,
    }
    alt_max = ALT_MAX_UF.get(uf)
    if alt_max and alt > alt_max:
        return False, (
            f"altitude {alt:.0f}m improvavel para {uf} "
            f"(max esperado ~{alt_max}m) — possivel erro de geocodificacao"
        )
    return True, ''

def calcular_aptidao(temp, chuva, alt, tipo_zarc, geada, colheita):
    c = [
        tipo_zarc is not None and tipo_zarc >= 2,
        10.0 <= temp <= 22.0,
        400.0 <= chuva <= 2000.0,
        alt >= 700.0,
        geada < 30.0,
        colheita is not None and 120.0 <= colheita <= 400.0,
    ]
    return all(c), int(round(sum(c) / len(c) * 100))

def processar(municipio):
    cod, nome, uf = municipio["codigo_ibge"], municipio["nome_municipio"], municipio["uf"]

    coords = buscar_coordenadas(nome, uf)
    if not coords:
        return False, "sem coordenadas"
    lat, lon, alt = coords["lat"], coords["lon"], coords["altitude"]

    pct_argila, tipo_zarc = buscar_solo_zarc(lat, lon)
    df = buscar_clima(lat, lon)
    if df is None:
        return False, "sem dados climáticos"

    df["mes"] = df.index.month
    medias = df.groupby("mes").agg(T2M=("T2M","mean"), T2M_MIN=("T2M_MIN","mean"), PREC=("PREC_MM","mean")).reset_index()

    temp_anual  = float(medias["T2M"].mean())
    chuva_anual = float(medias["PREC"].sum())

    ok, motivo = validar_geocodificacao(temp_anual, alt, uf, nome)
    if not ok:
        return False, motivo

    ja = df[df["mes"].isin([7,8])]
    geada = round(ja[ja["T2M_MIN"] <= 2.0].shape[0] / len(ja) * 100, 1) if len(ja) > 0 else 0.0

    on = df[df["mes"].isin([10,11])]
    colheita = round(on.groupby(on.index.year)["PREC_MM"].sum().mean(), 1) if len(on) > 0 else None

    apto, score = calcular_aptidao(temp_anual, chuva_anual, alt, tipo_zarc, geada, colheita or 0.0)

    # Solo name
    nomes_solo = {1: "Tipo 1 - Arenoso", 2: "Tipo 2 - Textura Média", 3: "Tipo 3 - Argiloso"}
    nome_solo = nomes_solo.get(tipo_zarc, "Não informado")

    supabase.table("municipios_aptidao").upsert({
        "codigo_ibge": cod, "nome_municipio": nome, "uf": uf,
        "lat": lat, "lon": lon, "altitude": alt,
        "tipo_solo": nome_solo,
        "pct_argila": float(pct_argila) if pct_argila is not None else None,
        "tipo_solo_zarc": int(tipo_zarc) if tipo_zarc is not None else None,
        "temp_media_anual": round(temp_anual, 2),
        "precipitacao_acumulada_anual": round(chuva_anual, 2),
        "risco_geada_pct": geada,
        "chuva_colheita_mm": float(colheita) if colheita is not None else None,
        "apto_geral": bool(apto), "score_aptidao": score,
    }, on_conflict="codigo_ibge").execute()

    # Sazonalidade
    registros = [{"codigo_ibge": cod, "mes": int(r["mes"]), "temp_media": round(r["T2M"],2),
                  "temp_min": round(r["T2M_MIN"],2), "precipitacao": round(r["PREC"],2),
                  "apto_no_mes": bool(10.0 <= r["T2M"] <= 22.0)} for _, r in medias.iterrows()]
    supabase.table("sazonalidade_mensal").upsert(registros, on_conflict="codigo_ibge,mes").execute()

    return True, f"score {score}/100 | apto:{apto} | geada:{geada}% | colheita:{colheita}mm"

# === MAIN ===
print("Buscando municípios prioritários do IBGE...")
r = requests.get("https://servicodados.ibge.gov.br/api/v1/localidades/municipios", timeout=30)
r.raise_for_status()

todos = []
for m in r.json():
    try:    uf = m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
    except: uf = "??"
    todos.append({"codigo_ibge": str(m["id"]), "nome_municipio": m["nome"], "uf": uf})

# Filtra apenas UFs prioritárias
prioritarios = [m for m in todos if m["uf"] in UFS_PRIORITARIAS]

# Remove os já no checkpoint
processados = carregar_checkpoint()
pendentes   = [m for m in prioritarios if m["codigo_ibge"] not in processados]

# Ordena por prioridade agrícola: Sul (principais produtoras) → Sudeste → Centro-Oeste/NE
UF_ORDEM = ['PR', 'SC', 'RS', 'SP', 'MG', 'BA', 'MS', 'MT', 'GO']
pendentes.sort(key=lambda m: UF_ORDEM.index(m['uf']) if m['uf'] in UF_ORDEM else 99)

por_uf = {}
for m in pendentes:
    por_uf[m['uf']] = por_uf.get(m['uf'], 0) + 1

print(f"Total {', '.join(UFS_PRIORITARIAS)}: {len(prioritarios)} municípios")
print(f"Já processados: {len(prioritarios) - len(pendentes)}")
print(f"A coletar agora: {len(pendentes)}")
print(f"Ordem: {' > '.join(f'{uf}({n})' for uf, n in sorted(por_uf.items(), key=lambda x: UF_ORDEM.index(x[0]) if x[0] in UF_ORDEM else 99))}")
print(f"Tempo estimado: ~{len(pendentes) * SLEEP_ENTRE / 60:.0f} min\n")

for i, m in enumerate(pendentes, 1):
    print(f"[{i}/{len(pendentes)}] {m['nome_municipio']}/{m['uf']} ...", end=" ", flush=True)
    try:
        ok, msg = processar(m)
    except Exception as e:
        ok, msg = False, str(e)

    if ok:
        print(f"OK {msg}")
        processados.add(m["codigo_ibge"])
        if i % 10 == 0:
            salvar_checkpoint(processados)
    else:
        print(f"ERRO {msg}")

    time.sleep(SLEEP_ENTRE)

salvar_checkpoint(processados)
print(f"\nConcluído: {len(processados)} municípios no checkpoint.")
