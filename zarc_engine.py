# -*- coding: utf-8 -*-
"""
zarc_engine.py
===============
Lógica pura (sem I/O) pra consultar elegibilidade ZARC por município,
decêndio a decêndio — Fase 1 do plano de 10 fases.

Mantido separado de main.py pra poder ser testado sem precisar de
FastAPI nem de um client Supabase real.
"""
from datetime import date


def data_para_decendio(data: date) -> int:
    """Converte uma data em decêndio (1-36): 3 decêndios por mês
    (dias 1-10, 11-20, 21-fim), confirmado no dicionário de dados oficial
    do MAPA (dec1-3=Jan, dec4-6=Fev, ..., dec34-36=Dez)."""
    terco_do_mes = 0 if data.day <= 10 else (1 if data.day <= 20 else 2)
    return (data.month - 1) * 3 + terco_do_mes + 1


def classificar_risco(nivel_risco):
    """Traduz o nível de risco bruto (20/30/40) pra rótulo de elegibilidade,
    ou RISCO_ELEVADO quando não há indicação de plantio (sem registro)."""
    if nivel_risco is None:
        return "RISCO_ELEVADO"
    if nivel_risco not in (20, 30, 40):
        return "RISCO_ELEVADO"
    return f"ELEGIVEL_{nivel_risco}"


def montar_resposta(codigo_ibge, municipio, uf, data_plantio, decendio, registros, safra):
    """Monta a resposta final do endpoint /zarc/elegibilidade a partir dos
    registros já filtrados (mesmo município + decêndio, de zarc_cevada)."""
    resultados = [
        {
            "grupo": r["grupo"],
            "solo_ad": r["solo_ad"],
            "manejo": r["manejo"],
            "nivel_risco": r["nivel_risco"],
            "classificacao": classificar_risco(r["nivel_risco"]),
            "portaria": r.get("portaria"),
        }
        for r in registros
    ]
    return {
        "codigo_ibge": codigo_ibge,
        "municipio": municipio,
        "uf": uf,
        "data_plantio": data_plantio.isoformat(),
        "decendio": decendio,
        "safra": safra,
        "elegivel": len(resultados) > 0,
        "resultados": resultados,
    }
