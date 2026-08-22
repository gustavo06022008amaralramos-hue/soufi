import os
import threading
from datetime import date
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv

from zarc_engine import data_para_decendio, montar_resposta

load_dotenv()

# ==============================================================================
# CONFIGURAÇÃO DO SUPABASE
# ==============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL e SUPABASE_KEY devem estar definidos nas variáveis de ambiente (.env)."
    )

# FastAPI roda endpoints sync (def, não async def) numa threadpool (Starlette
# run_in_threadpool) — um client supabase-py COMPARTILHADO entre threads
# diferentes causa erro intermitente no Windows (WinError 10035, socket sem
# bloqueio), o mesmo problema já visto nos scripts de coleta em lote. Cada
# thread do pool recebe seu próprio client via threading.local().
_thread_local = threading.local()


def get_supabase() -> Client:
    if not hasattr(_thread_local, "client"):
        _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _thread_local.client


# Mantido por compatibilidade com o startup (não usar dentro de endpoints —
# use get_supabase() em cada request pra ser thread-safe).
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==============================================================================
# APLICAÇÃO FASTAPI
# ==============================================================================
app = FastAPI(
    title="SOUFII - API Agrária",
    description="API de aptidão climática para cultivo de cevada no Brasil.",
    version="1.0.0",
)

# CORS — permite acesso do frontend Lovable (e qualquer origin em dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# ROTAS
# ==============================================================================

TOTAL_MUNICIPIOS_BRASIL = 5570  # IBGE 2024

@app.get("/coleta/progresso", tags=["Coleta"])
def coleta_progresso():
    """Estatísticas de progresso da coleta de dados climáticos e pedológicos."""
    try:
        registros = []
        offset = 0
        while True:
            batch = get_supabase().table("municipios_aptidao").select(
                "codigo_ibge, lat, pct_argila, temp_media_anual, score_aptidao, apto_geral"
            ).range(offset, offset + 999).execute()
            if not batch.data:
                break
            registros.extend(batch.data)
            if len(batch.data) < 1000:
                break
            offset += 1000
        total_db      = len(registros)
        com_coords    = sum(1 for r in registros if r.get("lat") is not None)
        com_solo      = sum(1 for r in registros if r.get("pct_argila") is not None)
        com_clima     = sum(1 for r in registros if r.get("temp_media_anual") is not None)
        com_score     = sum(1 for r in registros if r.get("score_aptidao") is not None)
        aptos         = sum(1 for r in registros if r.get("apto_geral") is True)
        return {
            "total_brasil":  TOTAL_MUNICIPIOS_BRASIL,
            "processados":   total_db,
            "com_coords":    com_coords,
            "com_solo":      com_solo,
            "com_clima":     com_clima,
            "com_score":     com_score,
            "aptos":         aptos,
            "progresso_pct": round(total_db / TOTAL_MUNICIPIOS_BRASIL * 100, 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", tags=["Status"])
def status():
    """Verifica se a API está online."""
    return {
        "status": "online",
        "projeto": "SOUFII - Aptidão Agrária",
        "versao": "1.0.0",
    }


@app.get("/municipios/aptos", tags=["Municípios"])
def municipios_aptos(uf: Optional[str] = Query(default=None, description="Filtrar por UF (ex: PR, SP, MG)")):
    """
    Retorna municípios com apto_geral = true.
    Aceita filtro opcional por UF via query param: /municipios/aptos?uf=PR
    """
    try:
        query = (
            get_supabase().table("municipios_aptidao")
            .select("codigo_ibge, nome_municipio, uf, altitude, temp_media_anual, precipitacao_acumulada_anual, score_aptidao, apto_geral")
            .eq("apto_geral", True)
            .order("score_aptidao", desc=True)
        )

        if uf:
            query = query.eq("uf", uf.upper())

        resultado = query.execute()

        return {
            "total": len(resultado.data),
            "filtro_uf": uf.upper() if uf else None,
            "municipios": resultado.data,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/municipios/mapa", tags=["Municípios"])
def municipios_mapa():
    """
    Retorna todos os municípios com coordenadas e dados de aptidão.
    Usado para renderizar o mapa interativo e o simulador de cenários.
    """
    try:
        COLS = (
            "codigo_ibge, nome_municipio, uf, lat, lon, altitude, "
            "tipo_solo, pct_argila, tipo_solo_zarc, "
            "temp_media_anual, precipitacao_acumulada_anual, "
            "risco_geada_pct, chuva_colheita_mm, "
            "apto_geral, score_aptidao"
        )
        PAGE = 1000
        todos = []
        offset = 0
        while True:
            batch = (
                get_supabase().table("municipios_aptidao")
                .select(COLS)
                .range(offset, offset + PAGE - 1)
                .execute()
            )
            if not batch.data:
                break
            todos.extend(batch.data)
            if len(batch.data) < PAGE:
                break
            offset += PAGE
        return {
            "total": len(todos),
            "municipios": todos,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sazonalidade/{codigo_ibge}", tags=["Sazonalidade"])
def sazonalidade(codigo_ibge: str):
    """
    Retorna os 12 meses de dados climáticos e aptidão mensal de um município.
    Usado para montar o calendário de plantio.
    """
    try:
        # Dados do município
        mun = (
            get_supabase().table("municipios_aptidao")
            .select("codigo_ibge, nome_municipio, uf, score_aptidao, apto_geral")
            .eq("codigo_ibge", codigo_ibge)
            .maybe_single()
            .execute()
        )

        if mun.data is None:
            raise HTTPException(
                status_code=404,
                detail=f"Município com código IBGE '{codigo_ibge}' não encontrado.",
            )

        # Dados de sazonalidade mensal
        sazon = (
            get_supabase().table("sazonalidade_mensal")
            .select("mes, temp_media, temp_min, precipitacao, apto_no_mes")
            .eq("codigo_ibge", codigo_ibge)
            .order("mes")
            .execute()
        )

        return {
            "municipio": mun.data,
            "calendario": sazon.data,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/municipios/top", tags=["Municípios"])
def municipios_top(limit: int = Query(default=5, ge=1, le=50), uf: str | None = Query(default=None)):
    """Retorna os municípios com maior score de aptidão. Opcionalmente filtra por UF."""
    try:
        query = (
            get_supabase().table("municipios_aptidao")
            .select("codigo_ibge, nome_municipio, uf, score_aptidao, apto_geral, temp_media_anual, precipitacao_acumulada_anual, altitude")
            .not_.is_("score_aptidao", "null")
        )
        if uf:
            query = query.eq("uf", uf.upper())
        resultado = query.order("score_aptidao", desc=True).limit(limit).execute()
        return {"municipios": resultado.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/municipios/estatisticas", tags=["Municípios"])
def municipios_estatisticas():
    """Estatísticas gerais rápidas: contagens por score sem carregar todos os dados."""
    try:
        from supabase import PostgrestAPIError
        import requests as _req

        base = get_supabase().table("municipios_aptidao")

        total    = base.select("codigo_ibge", count="exact").execute().count or 0
        aptos    = base.select("codigo_ibge", count="exact").gte("score_aptidao", 70).execute().count or 0
        parciais = base.select("codigo_ibge", count="exact").gte("score_aptidao", 40).lt("score_aptidao", 70).execute().count or 0
        inaptos  = base.select("codigo_ibge", count="exact").lt("score_aptidao", 40).execute().count or 0

        top = base.select("nome_municipio, uf, score_aptidao").not_.is_("score_aptidao", "null") \
            .order("score_aptidao", desc=True).limit(1).execute()
        melhor = top.data[0] if top.data else None

        return {
            "total":       total,
            "aptos":       aptos,
            "parciais":    parciais,
            "inaptos":     inaptos,
            "score_max":   melhor["score_aptidao"] if melhor else None,
            "melhor_municipio": f"{melhor['nome_municipio']}/{melhor['uf']}" if melhor else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/zarc/elegibilidade", tags=["ZARC"])
def zarc_elegibilidade(
    codigo_ibge: int = Query(...),
    data_plantio: date = Query(..., description="Data de semeio pretendida, formato YYYY-MM-DD"),
    solo_ad: str | None = Query(default=None, description="Filtra por classe de solo (AD1..AD6). Sem filtro, retorna todas as classes."),
    cultura: str = Query(default="cevada", description="Só 'cevada' disponível por enquanto (Fase 1 do plano multicultura)."),
):
    """Elegibilidade ZARC oficial por município, decêndio a decêndio —
    fonte: MAPA (dados.agricultura.gov.br), safra 2025/2026, cevada cervejeira.
    Substitui o proxy por estado usado na aba Seguro do painel do município."""
    if cultura != "cevada":
        raise HTTPException(status_code=400, detail=f"Cultura '{cultura}' ainda não ingerida — só cevada está disponível nesta fase.")
    try:
        decendio = data_para_decendio(data_plantio)

        municipio_row = (
            get_supabase().table("zarc_cevada")
            .select("municipio, uf")
            .eq("codigo_ibge", codigo_ibge)
            .limit(1)
            .execute()
        )
        if not municipio_row.data:
            # Município fora da abrangência do ZARC de cevada nesta safra
            return montar_resposta(codigo_ibge, None, None, data_plantio, decendio, [], "2025/2026")

        query = (
            get_supabase().table("zarc_cevada")
            .select("grupo, solo_ad, manejo, nivel_risco, portaria")
            .eq("codigo_ibge", codigo_ibge)
            .eq("decendio", decendio)
        )
        if solo_ad:
            query = query.eq("solo_ad", solo_ad.upper())
        registros = query.execute().data

        row = municipio_row.data[0]
        return montar_resposta(codigo_ibge, row["municipio"], row["uf"], data_plantio, decendio, registros, "2025/2026")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
