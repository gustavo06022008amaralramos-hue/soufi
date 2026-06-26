import json, os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

TEMP_RANGE_UF = {
    'AC':(23,28),'AL':(23,27),'AM':(24,29),'AP':(25,29),'BA':(17,28),
    'CE':(23,28),'DF':(19,24),'ES':(21,26),'GO':(19,26),'MA':(24,29),
    'MG':(15,27),'MS':(20,27),'MT':(22,28),'PA':(24,29),'PB':(22,28),
    'PE':(22,28),'PI':(24,29),'PR':(13,24),'RJ':(20,26),'RN':(23,28),
    'RO':(23,28),'RR':(24,29),'RS':(13,22),'SC':(12,22),'SE':(23,27),
    'SP':(17,25),'TO':(23,29),
}
ALT_MAX_UF = {'AM':300,'PA':500,'AP':200,'RR':300,'MA':600,'PI':700,'AL':400,'SE':400,'RJ':500}
MARGEM = 2

todos = []
offset = 0
while True:
    b = supabase.table('municipios_aptidao').select(
        'codigo_ibge,nome_municipio,uf,temp_media_anual,altitude'
    ).range(offset, offset+999).execute()
    if not b.data: break
    todos.extend(b.data)
    if len(b.data) < 1000: break
    offset += 1000

print(f"Total no Supabase: {len(todos)}")

invalidos = []
for r in todos:
    uf = r.get('uf','')
    temp = r.get('temp_media_anual')
    alt = r.get('altitude') or 0
    if temp is None:
        continue
    rng = TEMP_RANGE_UF.get(uf)
    if rng and not (rng[0]-MARGEM <= temp <= rng[1]+MARGEM):
        invalidos.append(r['codigo_ibge'])
        print(f"  DEL {r['nome_municipio']}/{uf}: temp {temp:.1f}C (esperado {rng[0]}-{rng[1]}C)")
        continue
    amax = ALT_MAX_UF.get(uf)
    if amax and alt > amax:
        invalidos.append(r['codigo_ibge'])
        print(f"  DEL {r['nome_municipio']}/{uf}: altitude {alt:.0f}m > max {amax}m")

with open('checkpoint_processados.json','r',encoding='utf-8') as f:
    ck = set(json.load(f))

for cod in invalidos:
    supabase.table('municipios_aptidao').delete().eq('codigo_ibge', cod).execute()
    supabase.table('sazonalidade_mensal').delete().eq('codigo_ibge', cod).execute()
    ck.discard(cod)

with open('checkpoint_processados.json','w',encoding='utf-8') as f:
    json.dump(list(ck), f)

print(f"\nRemovidos {len(invalidos)} registros invalidos do Supabase.")
print(f"Checkpoint atualizado: {len(ck)} municipios.")
