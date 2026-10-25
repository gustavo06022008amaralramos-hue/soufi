# -*- coding: utf-8 -*-
"""
tests/test_main_api.py
========================
Testa o comportamento da API (main.py) sem tocar no Supabase real: o client
é trocado por um falso que devolve linhas em memória. Cobre o que foi
adicionado no endurecimento: cache do /municipios/mapa, campo `litoraneo`,
rate limit com 429 + CORS, e o teto de 100% do /coleta/progresso.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# main.py exige essas variáveis no import; load_dotenv() não sobrescreve as já definidas.
os.environ.setdefault("SUPABASE_URL", "https://exemplo.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.YXNzaW5hdHVyYQ")  # JWT falso

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


class _Resultado:
    def __init__(self, data):
        self.data = data


class _ConsultaFalsa:
    def __init__(self, linhas, contador):
        self._linhas = linhas
        self._contador = contador
        self._ini, self._fim = 0, len(linhas) - 1

    def select(self, *_a, **_k):
        return self

    def range(self, ini, fim):
        self._ini, self._fim = ini, fim
        return self

    def execute(self):
        self._contador["consultas"] += 1
        return _Resultado(self._linhas[self._ini:self._fim + 1])


class _SupabaseFalso:
    def __init__(self, linhas):
        self.linhas = linhas
        self.contador = {"consultas": 0}

    def table(self, _nome):
        return _ConsultaFalsa(self.linhas, self.contador)


LINHAS = [
    {"codigo_ibge": "4205407", "nome_municipio": "Florianópolis", "uf": "SC", "lat": -27.6,
     "pct_argila": 30, "temp_media_anual": 20.3, "score_aptidao": 39, "apto_geral": False},
    {"codigo_ibge": "4109401", "nome_municipio": "Guarapuava", "uf": "PR", "lat": -25.4,
     "pct_argila": 60, "temp_media_anual": 17.1, "score_aptidao": 83, "apto_geral": True},
]


@pytest.fixture
def cliente(monkeypatch):
    falso = _SupabaseFalso([dict(l) for l in LINHAS])
    monkeypatch.setattr(main, "get_supabase", lambda: falso)
    monkeypatch.setattr(main, "_mapa_cache", {"ts": 0.0, "dados": None})
    monkeypatch.setattr(main, "_progresso_cache", {"ts": 0.0, "dados": None})
    main._rate_hits.clear()
    return TestClient(main.app), falso


def test_mapa_marca_litoraneo_pela_lista_ibge(cliente):
    c, _ = cliente
    dados = {m["codigo_ibge"]: m for m in c.get("/municipios/mapa").json()["municipios"]}
    assert dados["4205407"]["litoraneo"] is True    # Florianópolis/SC
    assert dados["4109401"]["litoraneo"] is False   # Guarapuava/PR


def test_mapa_segunda_chamada_vem_do_cache(cliente):
    c, falso = cliente
    c.get("/municipios/mapa")
    consultas = falso.contador["consultas"]
    c.get("/municipios/mapa")
    assert falso.contador["consultas"] == consultas


def test_progresso_nunca_passa_de_100_por_cento(cliente, monkeypatch):
    c, _ = cliente
    monkeypatch.setattr(main, "TOTAL_MUNICIPIOS_BRASIL", 1)  # 2 linhas / 1 = 200%
    assert c.get("/coleta/progresso").json()["progresso_pct"] == 100.0


def test_rate_limit_responde_429_com_cors(cliente, monkeypatch):
    c, _ = cliente
    monkeypatch.setattr(main, "RATE_LIMIT_POR_MIN", 3)
    cab = {"Origin": "http://localhost:5173"}
    for _ in range(3):
        assert c.get("/", headers=cab).status_code == 200
    r = c.get("/", headers=cab)
    assert r.status_code == 429
    assert r.headers.get("access-control-allow-origin") == "*"
    assert r.headers.get("retry-after") == "30"
