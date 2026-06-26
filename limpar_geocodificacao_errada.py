"""
limpar_geocodificacao_errada.py
Identifica municípios no Supabase com temperatura ou altitude incompatível
com o estado → deleta do Supabase e remove do checkpoint para reprocessamento.
"""
import json, os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

TEMP_RANGE_UF = {
    'AC': (23, 28), 'AL': (23, 27), 'AM': (24, 29), 'AP': (25, 29),
    'BA': (17, 28), 'CE': (23, 28), 'DF': (19, 24), 'ES': (21, 26),
    'GO': (19, 26), 'MA': (24, 29), 'MG': (15, 27), 'MS': (20, 27),
    'MT': (22, 28), 'PA': (24, 29), 'PB': (22, 28), 'PE': (22, 28),
    'PI': (24, 29), 'PR': (13, 24), 'RJ': (20, 26), 'RN': (23, 28),
    'RO': (23, 28), 'RR': (24, 29), 'RS': (13, 22), 'SC': (12, 22),
    'SE': (23, 27), 'SP': (17, 25), 'TO': (23, 29),
}
ALT_MAX_UF = {
    'AM': 300, 'PA': 500, 'AP': 200, 'RR': 300,
    'MA': 600, 'PI': 700, 'AL': 400, 'SE': 400, 'RJ': 500,
}
MARGEM_TEMP = 2

def eh_invalido(r):
    uf   = r.get("uf", "")
    temp = r.get("temp_media_anual")
    alt  = r.get("altitude")
    nome = r.get("nome_municipio", "")
    if temp is None:
        return False, ""
    rng = TEMP_RANGE_UF.get(uf)
    if rng:
        tmin, tmax = rng[0] - MARGEM_TEMP, rng[1] + MARGEM_TEMP
        if not (tmin <= temp <= tmax):
            return True, f"temp {temp:.1f}°C fora de {rng[0]}-{rng[1]}°C para {uf}"
    if alt is not None:
        amax = ALT_MAX_UF.get(uf)
        if amax and alt > amax:
            return True, f"altitude {alt:.0f}m > máx {amax}m para {uf}"
    return False, ""

# Buscar todos do Supabase com paginação
print("Buscando municípios no Supabase...")
todos = []
offset = 0
while True:
    batch = supabase.table("municipios_aptidao").select(
        "codigo_ibge, nome_municipio, uf, temp_media_anual, altitude"
    ).range(offset, offset + 999).execute()
    if not batch.data:
        break
    todos.extend(batch.data)
    if len(batch.data) < 1000:
        break
    offset += 1000

print(f"Total no Supabase: {len(todos)}")

invalidos = [(r, motivo) for r in todos for ok, motivo in [eh_invalido(r)] if ok]

if not invalidos:
    print("Nenhum município com geocodificação suspeita encontrado!")
else:
    print(f"\n{len(invalidos)} municípios com dados suspeitos:\n")
    for r, motivo in invalidos:
        print(f"  {r['nome_municipio']}/{r['uf']} ({r['codigo_ibge']}): {motivo}")

    resp = input(f"\nDeletar esses {len(invalidos)} registros do Supabase e remover do checkpoint? (s/n): ")
    if resp.strip().lower() == 's':
        # Carregar checkpoint
        CHECKPOINT = "checkpoint_processados.json"
        if os.path.exists(CHECKPOINT):
            with open(CHECKPOINT, "r", encoding="utf-8") as f:
                processados = set(json.load(f))
        else:
            processados = set()

        removidos = 0
        for r, motivo in invalidos:
            cod = r["codigo_ibge"]
            supabase.table("municipios_aptidao").delete().eq("codigo_ibge", cod).execute()
            supabase.table("sazonalidade_mensal").delete().eq("codigo_ibge", cod).execute()
            processados.discard(cod)
            removidos += 1
            print(f"  Removido: {r['nome_municipio']}/{r['uf']}")

        with open(CHECKPOINT, "w", encoding="utf-8") as f:
            json.dump(list(processados), f)

        print(f"\n{removidos} registros deletados. Checkpoint atualizado ({len(processados)} restantes).")
        print("Esses municípios serão recoletados com a nova validação.")
    else:
        print("Cancelado.")
