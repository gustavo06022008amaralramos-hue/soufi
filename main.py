import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# CONFIGURAÇÃO DO SUPABASE
# ==============================================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mkyzdzvhmhmmvvuuzbsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1reXpkenZobWhtbXZ2dXV6YnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxMzE4NSwiZXhwIjoyMDk0NDg5MTg1fQ.Wkda4OT3BEtug2aAaEuddAjwkYIFybV1IM3IlcHr_PI")

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
            batch = supabase.table("municipios_aptidao").select(
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
            supabase.table("municipios_aptidao")
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
                supabase.table("municipios_aptidao")
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
            supabase.table("municipios_aptidao")
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
            supabase.table("sazonalidade_mensal")
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
def municipios_top(limit: int = Query(default=5, ge=1, le=50)):
    """Retorna os municípios com maior score de aptidão."""
    try:
        resultado = (
            supabase.table("municipios_aptidao")
            .select("codigo_ibge, nome_municipio, uf, score_aptidao, apto_geral, temp_media_anual, precipitacao_acumulada_anual, altitude")
            .not_.is_("score_aptidao", "null")
            .order("score_aptidao", desc=True)
            .limit(limit)
            .execute()
        )
        return {"municipios": resultado.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/municipios/estatisticas", tags=["Municípios"])
def municipios_estatisticas():
    """Estatísticas gerais: totais por classificação."""
    try:
        resultado = supabase.table("municipios_aptidao") \
            .select("score_aptidao, apto_geral").execute()
        dados = resultado.data or []
        aptos    = sum(1 for r in dados if (r.get("score_aptidao") or 0) >= 70)
        parciais = sum(1 for r in dados if 40 <= (r.get("score_aptidao") or 0) < 70)
        inaptos  = sum(1 for r in dados if (r.get("score_aptidao") or 0) < 40)
        scores   = [r["score_aptidao"] for r in dados if r.get("score_aptidao") is not None]
        return {
            "total":       len(dados),
            "aptos":       aptos,
            "parciais":    parciais,
            "inaptos":     inaptos,
            "score_medio": round(sum(scores) / len(scores), 1) if scores else None,
            "score_max":   max(scores) if scores else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
