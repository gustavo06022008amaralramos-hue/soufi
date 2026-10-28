# -*- coding: utf-8 -*-
"""
Entrada da API na Vercel, no MESMO projeto do site (soufi-sigma).

A Vercel publica api/index.py como função Python e o vercel.json da raiz
manda /api/* para cá. O app FastAPI (main.py) tem as rotas sem prefixo
(/municipios/mapa…), então este adaptador tira o "/api" do caminho antes
de repassar — o site chama a API em /api, no mesmo endereço, sem CORS.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app as _api  # noqa: E402


async def app(scope, receive, send):
    if scope.get("type") in ("http", "websocket"):
        caminho = scope.get("path", "")
        if caminho == "/api" or caminho.startswith("/api/"):
            scope = dict(scope)
            scope["path"] = caminho[4:] or "/"
            scope["raw_path"] = scope["path"].encode()
    await _api(scope, receive, send)
