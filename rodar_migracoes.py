# -*- coding: utf-8 -*-
"""
rodar_migracoes.py
==================
Aplica no Supabase (Postgres) os arquivos de migrations/*.sql que ainda não
rodaram, em ordem, registrando cada um na tabela `_migracoes_aplicadas`.

A chave REST (SUPABASE_KEY) não executa DDL — este script usa conexão direta
ao Postgres. Defina no .env:

    DATABASE_URL=postgresql://postgres.<ref>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:5432/postgres

(Supabase > Project Settings > Database > Connection string > Session pooler.)

Uso:
    python rodar_migracoes.py            # aplica as pendentes
    python rodar_migracoes.py --listar   # só mostra o que está pendente
    python rodar_migracoes.py --baseline 009   # marca 001..009 como já aplicadas (sem rodar)

Dependência: pip install "psycopg[binary]"
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")


def main():
    args = sys.argv[1:]
    arquivos = sorted((RAIZ / "migrations").glob("*.sql"))

    if not DATABASE_URL:
        sys.exit("DATABASE_URL não definido no .env (veja o docstring deste arquivo).")
    try:
        import psycopg
    except ImportError:
        sys.exit('Falta a dependência: pip install "psycopg[binary]"')

    with psycopg.connect(DATABASE_URL, autocommit=True) as con:
        con.execute(
            "create table if not exists _migracoes_aplicadas ("
            "arquivo text primary key, aplicada_em timestamptz not null default now())"
        )
        feitas = {r[0] for r in con.execute("select arquivo from _migracoes_aplicadas")}

        if "--baseline" in args:
            limite = args[args.index("--baseline") + 1]
            for f in arquivos:
                if f.name[:3] <= limite and f.name not in feitas:
                    con.execute("insert into _migracoes_aplicadas(arquivo) values (%s)", (f.name,))
                    print(f"[baseline] {f.name}")
            return

        pendentes = [f for f in arquivos if f.name not in feitas]
        if not pendentes:
            print("Nenhuma migration pendente.")
            return
        if "--listar" in args:
            for f in pendentes:
                print("pendente:", f.name)
            return

        for f in pendentes:
            print(f"[rodando] {f.name} ...", end=" ", flush=True)
            with con.transaction():
                con.execute(f.read_text(encoding="utf-8"))
                con.execute("insert into _migracoes_aplicadas(arquivo) values (%s)", (f.name,))
            print("ok")
        con.execute("notify pgrst, 'reload schema'")  # PostgREST recarrega o schema cache
        print(f"{len(pendentes)} migration(s) aplicada(s).")


if __name__ == "__main__":
    main()
