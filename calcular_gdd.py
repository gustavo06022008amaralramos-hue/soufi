# -*- coding: utf-8 -*-
"""
calcular_gdd.py
=================
Fase 4 do plano de 10 fases: motor de graus-dia (GDD).

Lógica pura (sem I/O), pra poder testar sem precisar de banco nem rede.
Consome os registros diários já coletados (Fase 3, clima_diario_nasa) e
calcula acúmulo térmico a partir de uma data de semeio — a peça central
do simulador ao vivo (Fase 6).

Decisões tomadas com o usuário (2026-08-22), a partir das anotações de
campo dele:
  - T_b (temperatura base) da cevada = 0°C — "qualquer temperatura acima
    de 0°C o cultivo cresce".
  - T_b do trigo = 0°C — CONFIRMADO em 2026-09-01 contra fonte oficial:
    Embrapa Trigo, "Cultivo de Trigo" (Sistema de Produção, Caierão et al.,
    infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155370/1/Cultivo-de-Trigo.pdf),
    que usa explicitamente "temperatura base de 0°C" no cálculo de
    filocronos (Slafer & Rawson, 1994; Cunha et al., 2009) — substitui o
    valor de 4,5°C que estava proposto sem fonte.
  - T_b da soja: pesquisado em 2026-09-01, mas AO CONTRÁRIO do trigo não
    há um valor único confirmável — a literatura diverge de verdade entre
    estudos reais: Camargo, Brunini & Miranda, "Temperatura-base para
    cálculo dos graus-dia para cultivares de soja em São Paulo" (Pesquisa
    Agropecuária Brasileira, Embrapa/IAC, ensaios em Campinas/Ribeirão
    Preto/Pindamonhangaba, 4 cultivares: UFV-1, Santa Rosa, Viçoja,
    Paraná) achou T_b=14°C pra fase plantio→maturação em TODAS as
    cultivares testadas — é a fonte mais forte encontrada (estudo dedicado
    e revisado por pares, não uma menção de passagem). Outros estudos
    citam 10°C (Embrapa, produtividade em Belterra/PA) e até 7,6°C.
    Adotado 14°C por ser a fonte mais direta e melhor documentada, mas
    ainda é uma aproximação — cultivares modernas (transgênicas RR2/
    Intacta) e regiões fora de SP podem divergir do estudo original.
    Segue como o T_b menos sólido dos três (cevada e trigo têm citação
    única e consistente; soja não).
  - Geada = T2M_MIN (temperatura do ar a 2m, NASA POWER) <= 4°C. Não é
    literalmente a temperatura de relva/solo (que é mais baixa que o ar
    a 2m em noite de céu limpo) — é o proxy já calibrado nas anotações
    de campo pra isso, e é o mesmo critério usado em toda a coleção de
    dados históricos deste projeto. Critério do mapa nacional existente
    (score_ponderado, baseado em médias mensais) não muda — essa regra é
    só pro motor de GDD novo, orientado a dado diário.
"""

TB_POR_CULTURA = {
    "cevada": 0.0,   # confirmado com o usuário — anotações de campo
    "trigo":  0.0,   # confirmado — Embrapa Trigo, "Cultivo de Trigo" (2026-09-01)
    "soja":   14.0,  # Camargo, Brunini & Miranda (Pesq. Agropec. Bras., Embrapa/IAC) — melhor fonte, ainda aproximada
}

LIMIAR_GEADA_C = 4.0  # T2M_MIN <= isso conta como geada (anotações de campo)


def gdd_diario(tmax, tmin, tb):
    """GDD de um único dia: GDD = max(0, ((Tmax+Tmin)/2) - Tb)."""
    if tmax is None or tmin is None:
        return 0.0
    media = (tmax + tmin) / 2
    return max(0.0, media - tb)


def houve_geada(tmin, limiar=LIMIAR_GEADA_C):
    """True se a temperatura mínima do dia indica risco de geada."""
    if tmin is None:
        return False
    return tmin <= limiar


def acumular_gdd(registros_diarios, cultura, data_inicio):
    """Acumula GDD dia a dia a partir de `data_inicio` (inclusive), na ordem
    em que os registros aparecem. `registros_diarios` é uma lista de dicts
    com pelo menos {"data": "YYYY-MM-DD", "tmax": float, "tmin": float}.

    Retorna uma lista de pontos {data, gdd_dia, gdd_acumulado, geada} —
    a série que alimenta a linha do tempo fenológica do simulador."""
    tb = TB_POR_CULTURA.get(cultura)
    if tb is None:
        raise ValueError(f"Cultura '{cultura}' sem T_b definido — ver TB_POR_CULTURA.")

    relevantes = sorted(
        (r for r in registros_diarios if r["data"] >= data_inicio),
        key=lambda r: r["data"],
    )

    pontos = []
    acumulado = 0.0
    for r in relevantes:
        gdd = gdd_diario(r.get("tmax"), r.get("tmin"), tb)
        acumulado += gdd
        pontos.append({
            "data": r["data"],
            "gdd_dia": round(gdd, 2),
            "gdd_acumulado": round(acumulado, 2),
            "geada": houve_geada(r.get("tmin")),
        })
    return pontos


def data_do_estagio(pontos, gdd_alvo):
    """Retorna o primeiro ponto em que gdd_acumulado >= gdd_alvo, ou None se
    a série não chegou lá ainda (dado insuficiente ou estágio não atingido)."""
    for p in pontos:
        if p["gdd_acumulado"] >= gdd_alvo:
            return p
    return None
