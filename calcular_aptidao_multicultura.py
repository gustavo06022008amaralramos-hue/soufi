# -*- coding: utf-8 -*-
"""
calcular_aptidao_multicultura.py
===================================
Fase 7 do plano de 10 fases: motor de aptidão por cultura (cevada, trigo,
soja) — cada cultura com seus PRÓPRIOS critérios, não a fórmula da cevada
com números trocados.

Decisão explícita do usuário (2026-08-25): pesquisar fontes reais (Embrapa
Trigo, Embrapa Soja) antes de definir qualquer faixa climática nova, em vez
de reaproveitar os números da cevada. Resultado da pesquisa, com fonte:

TRIGO — Embrapa Trigo, "Cultivo de Trigo" (Sistema de Produção, Caierão, E.
et al., Embrapa Trigo, acessado 2026-09-01, seção "Zoneamento agrícola",
infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155370/1/Cultivo-de-Trigo.pdf):
  - Solo: mesma tipologia ZARC universal do documento — Tipo 3 (argiloso)
    = argila >= 35%. Mesmo critério, mesma fonte-tipo já usada em cevada.
  - Temperatura: critério do Paraná/MG usa "temperatura média mensal do ar
    abaixo de 25°C durante a fase de perfilhamento"; critério de São Paulo
    usa "temperatura mínima média do ar durante todo o ciclo, igual ou
    acima de 9°C". Faixa adotada: 9-25°C.
  - Altitude: critério de MG/GO/MT usa "altitude igual ou superior a 800
    metros" — mesmo valor já usado pra cevada, agora com citação própria.
  - Geada: critério do Paraná usa "risco de ocorrência de geada no
    espigamento inferior a 20%" — mais rígido que o de cevada (30%).
  - NÃO há, no documento, uma faixa de chuva ANUAL nem um valor único de mm
    de chuva na colheita — os critérios reais são índices decendiais
    (ISNA >= 0,55 na fase de floração/enchimento; índice de risco de chuva
    na colheita) que exigem balanço hídrico decendial, dado que este projeto
    não tem. Por isso os critérios "chuva" e "colheita" ficam DE FORA do
    modelo de trigo — melhor omitir do que inventar um número anual.

SOJA — Embrapa Soja, Ageitec ("Temperatura" e "Água", autores Farias,
Neumaier, Nepomuceno, Embrapa Soja, conteúdo migrado 08/12/2021,
embrapa.br/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/
caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas):
  - Temperatura: "se adapta melhor às regiões onde as temperaturas oscilam
    entre 20°C e 30°C" (ideal ~30°C); "regiões com temperaturas menores ou
    iguais a 10°C são impróprias"; "temperaturas acima de 40°C têm efeito
    adverso". Faixa ideal 20-30°C, decai a zero em 10°C/40°C (10°C de
    tolerância nas duas bordas).
  - Água: necessidade de 450 a 800 mm POR CICLO (não anual) — este projeto
    só tem precipitação ANUAL coletada, então não dá pra aplicar esse
    número sem inventar uma conversão. Omitido.
  - Não há, nas páginas de solo/geada da Ageitec Soja, nenhum valor
    numérico de argila ou de risco de geada — a página de zoneamento da
    própria Embrapa Soja diz que o zoneamento real é sobre risco de
    DÉFICIT HÍDRICO (ISNA decendial), não sobre geada (a época de
    semeadura já é escolhida pra evitar geada inteiramente) nem sobre
    altitude. Por isso soja fica com só 1 critério climático numérico
    citável (temperatura) — o resto do peso vai pro ZARC real (Fase 1/7),
    que é exatamente essa modelagem de risco hídrico decendial que a
    própria Embrapa aponta como a ferramenta certa, já ingerida em
    zarc_soja.

Reaproveita as funções de nota graduada (_plato/_rampa_alta/_rampa_baixa)
de calcular_score_ponderado.py — mesma matemática, sem duplicar.
"""
from calcular_score_ponderado import _plato, _rampa_alta, _rampa_baixa

# ==============================================================================
# PESOS por cultura — cada uma com seus próprios critérios (ver fontes acima)
# ==============================================================================
PESOS_TRIGO = {
    "solo": 0.20, "temp": 0.25, "altitude": 0.20, "geada": 0.20, "zarc": 0.15,
}
PESOS_SOJA = {
    "temp": 0.40, "zarc": 0.60,
}
assert abs(sum(PESOS_TRIGO.values()) - 1.0) < 1e-9
assert abs(sum(PESOS_SOJA.values()) - 1.0) < 1e-9


def nota_zarc(registros):
    """Nota 0.0-1.0 a partir dos registros reais de zarc_<cultura> de um
    município (lista de dicts com pelo menos {"decendio": int,
    "nivel_risco": 20|30|40}). Sem dado real inventado: 20=mais seguro,
    30/40=mais arriscado (semântica oficial do MAPA), combinado com quantos
    dos 36 decêndios do ano ficam elegíveis (mais janela de semeadura segura
    = melhor). Sem nenhum registro -> 0.0 (não indicado pra essa cultura
    nesse município, pela fonte oficial)."""
    if not registros:
        return 0.0
    pontuacao_risco = {20: 1.0, 30: 0.7, 40: 0.4}
    melhor_risco = max(pontuacao_risco.get(r["nivel_risco"], 0.0) for r in registros)
    decendios_elegiveis = len({r["decendio"] for r in registros})
    cobertura = min(1.0, decendios_elegiveis / 36.0)
    return round(melhor_risco * 0.7 + cobertura * 0.3, 4)


def notas_trigo(m, registros_zarc):
    """m: dict com pct_argila, temp_media_anual, altitude, risco_geada_pct."""
    pct_argila = m.get("pct_argila")
    temp       = m.get("temp_media_anual")
    alt        = m.get("altitude")
    geada      = m.get("risco_geada_pct")

    nota_solo     = 0.0 if pct_argila is None else max(0.0, min(1.0, pct_argila / 35.0))
    nota_temp     = _plato(temp, 9.0, 25.0, 3.0)
    nota_altitude = _rampa_alta(alt, 800.0, 50.0)
    nota_geada    = _rampa_baixa(geada, 0.0, 20.0)
    nota_z        = nota_zarc(registros_zarc)

    return {"solo": nota_solo, "temp": nota_temp, "altitude": nota_altitude, "geada": nota_geada, "zarc": nota_z}


def notas_soja(m, registros_zarc):
    """m: dict com temp_media_anual."""
    temp = m.get("temp_media_anual")
    nota_temp = _plato(temp, 20.0, 30.0, 10.0)
    nota_z    = nota_zarc(registros_zarc)
    return {"temp": nota_temp, "zarc": nota_z}


def score_trigo(m, registros_zarc):
    notas = notas_trigo(m, registros_zarc)
    return int(round(sum(PESOS_TRIGO[k] * notas[k] for k in PESOS_TRIGO) * 100))


def score_soja(m, registros_zarc):
    notas = notas_soja(m, registros_zarc)
    return int(round(sum(PESOS_SOJA[k] * notas[k] for k in PESOS_SOJA) * 100))


# ==============================================================================
# Classificação em 3 níveis por CONTAGEM de critérios binários reprovados —
# decisão do usuário (2026-08-25): 0 reprovados = Apta; até 2 reprovados =
# Parcial; mais de 2 reprovados = Inapta.
# ==============================================================================
def classificar_aptidao(criterios_aprovados):
    """`criterios_aprovados`: lista de bool (True = passou no critério).
    Retorna 'Apta' | 'Parcial' | 'Inapta'."""
    reprovados = sum(1 for c in criterios_aprovados if not c)
    if reprovados == 0:
        return "Apta"
    if reprovados <= 2:
        return "Parcial"
    return "Inapta"


def criterios_binarios_trigo(m):
    pct_argila = m.get("pct_argila")
    temp       = m.get("temp_media_anual")
    alt        = m.get("altitude")
    geada      = m.get("risco_geada_pct")
    return [
        pct_argila is not None and pct_argila >= 15.0,   # ao menos Tipo 2 (textura média)
        temp is not None and 9.0 <= temp <= 25.0,
        alt is not None and alt >= 800.0,
        geada is not None and geada < 20.0,
    ]


def criterios_binarios_soja(m):
    temp = m.get("temp_media_anual")
    return [
        temp is not None and 20.0 <= temp <= 30.0,
    ]
