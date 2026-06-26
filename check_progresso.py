import requests, json
from collections import Counter

r = requests.get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios', timeout=30)
todos = []
for m in r.json():
    try: uf = m['microrregiao']['mesorregiao']['UF']['sigla']
    except: uf = '??'
    todos.append({'codigo_ibge': str(m['id']), 'uf': uf})

UFS = ['PR','SC','RS','SP','MG','BA','MS','MT','GO']
prioritarios = [m for m in todos if m['uf'] in UFS]

with open('checkpoint_processados.json', 'r', encoding='utf-8') as f:
    processados = set(json.load(f))

pendentes = [m for m in prioritarios if m['codigo_ibge'] not in processados]

uf_pend  = Counter(m['uf'] for m in pendentes)
uf_proc  = Counter(m['uf'] for m in prioritarios if m['codigo_ibge'] in processados)
uf_total = Counter(m['uf'] for m in prioritarios)

UF_ORDEM = ['PR','SC','RS','SP','MG','BA','MS','MT','GO']
print(f"Total prioritarios: {len(prioritarios)} | Checkpoint: {len(processados)} | Pendentes: {len(pendentes)}")
print()
print(f"{'UF':<5} {'Total':<7} {'Coletados':<12} {'Pendentes':<10} {'%'}")
for uf in UF_ORDEM:
    t = uf_total.get(uf, 0)
    c = uf_proc.get(uf, 0)
    p = uf_pend.get(uf, 0)
    pct = c/t*100 if t else 0
    bar = '#' * int(pct/5)
    print(f"{uf:<5} {t:<7} {c:<12} {p:<10} {pct:5.1f}% {bar}")

import time
mins = len(pendentes) * 2.5 / 60
print(f"\nTempo estimado restante: ~{mins:.0f} minutos ({len(pendentes)} municipios x 2.5s)")
