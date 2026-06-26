# SOUFII — Sistema de Aptidão para Cevada Cervejeira
**Desafio 1 · Cooperativa Agrária · Sprint 2**

> Plataforma web que mapeia, classifica e visualiza municípios brasileiros com aptidão para o cultivo de cevada cervejeira, com base em critérios técnicos do ZARC/EMBRAPA.

---

## Como rodar localmente

### Pré-requisitos
- Python 3.10+ (`py` no Windows)
- Node.js 18+
- Conta no [Supabase](https://supabase.com) com as tabelas criadas

### 1. Backend (FastAPI)

```bash
# Na raiz do projeto
pip install -r requirements.txt

# Criar arquivo .env com suas credenciais
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_KEY=sua_chave_aqui

py -m uvicorn main:app --reload
# API disponível em: http://127.0.0.1:8000
# Docs: http://127.0.0.1:8000/docs
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# Site disponível em: http://localhost:5173
```

### 3. Coleta de dados

```bash
# Coleta geral (todos os 5.570 municípios)
py coleta_dados.py

# Coleta prioritária (Sul e Sudeste primeiro)
py coleta_prioritario.py

# Corrigir coordenadas ausentes
py fix_coords.py
```

### 4. Tratamento e classificação

```bash
py tratamento_dados.py
# Gera: dados/municipios_classificados.csv
```

### Credenciais de acesso
- **Usuário:** `agraria`
- **Senha:** `cevada2025`

---

## Estrutura de pastas

```
SOUFII - PROJETO AGRARIA/
│
├── main.py                    # API FastAPI
├── coleta_dados.py            # Coleta principal (5.570 municípios)
├── coleta_prioritario.py      # Coleta prioritária (Sul+Sudeste)
├── fix_coords.py              # Corrige lat/lon ausentes
├── tratamento_dados.py        # Classifica municípios (CSV)
├── requirements.txt           # Dependências Python
├── .env                       # Credenciais Supabase (não versionado)
├── checkpoint_processados.json # IDs já coletados
│
├── dados/
│   ├── municipios_cevada.csv       # 85 municípios Sul+Sudeste
│   └── municipios_classificados.csv # Resultado com classificação
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Rotas e estado global
│   │   ├── context/AuthContext.jsx # Autenticação
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── HomePage.jsx       # Dashboard com KPIs
│   │   │   ├── ZoneamentoPage.jsx # Mapa interativo
│   │   │   ├── HistoricosPage.jsx # Gráficos temporais
│   │   │   ├── VariedadesPage.jsx # Catálogo de cultivares
│   │   │   ├── NoticiasPage.jsx   # Feed de notícias
│   │   │   └── ParceirosPage.jsx  # Logos institucionais
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, AppLayout
│   │   │   ├── map/               # MapComponent, MapaTab
│   │   │   ├── sidebar/           # AptidaoCard, ClimaChart, etc.
│   │   │   ├── simulador/         # SimuladorTab, Cultivares
│   │   │   └── ui/                # Skeleton, SoufiiLogo
│   │   └── index.css              # Tema verde Agrária
│   ├── public/logos/              # Logos dos parceiros (adicionar manualmente)
│   └── package.json
│
└── apresentacao/
    ├── roadmap.md                  # Roadmap completo do projeto
    ├── cronograma_gantt.html       # Gráfico de Gantt interativo
    ├── quadro_tarefas.html         # Kanban estilo Jira
    ├── mapa_mental.html            # Mapa mental interativo (drag+zoom)
    └── slides_sprint2.html         # 15 slides com navegação por teclado
```

---

## Banco de dados — Supabase

### Tabela `municipios_aptidao`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| codigo_ibge | text (PK) | Código IBGE do município |
| nome_municipio | text | Nome oficial |
| uf | text | Sigla do estado |
| lat / lon | float | Coordenadas geográficas |
| altitude | float | Altitude em metros |
| tipo_solo / pct_argila / tipo_solo_zarc | text/float/int | Dados pedológicos |
| temp_media_anual | float | Temperatura média anual (°C) |
| precipitacao_acumulada_anual | float | Precipitação anual (mm) |
| risco_geada_pct | float | % de risco de geada Jul/Ago |
| chuva_colheita_mm | float | Chuva Out/Nov (mm) |
| apto_geral | boolean | Atende todos os 6 critérios ZARC |
| score_aptidao | int | Score 0–100 |

### Tabela `sazonalidade_mensal`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| codigo_ibge + mes | PK composta | Chave única |
| temp_media / temp_min | float | Temperatura mensal (°C) |
| precipitacao | float | Precipitação mensal (mm) |
| apto_no_mes | boolean | Temperatura no intervalo ideal |

---

## Parâmetros técnicos de aptidão (ZARC/EMBRAPA)

| Critério | Faixa Ideal | Fonte |
|----------|-------------|-------|
| Temperatura média | 12–22°C | NASA POWER |
| Precipitação anual | 400–1200mm | NASA POWER |
| Altitude | > 700m | Open-Meteo |
| Tipo de solo | Argiloso (pH 5.5–7.0) | SoilGrids |
| Chuva na colheita | < 250mm (Out/Nov) | NASA POWER |
| Risco de geada | < 30% (Jul/Ago) | NASA POWER |

---

## Fontes de dados

| Fonte | Dado | URL |
|-------|------|-----|
| IBGE | Municípios brasileiros | `servicodados.ibge.gov.br/api/v1/localidades/municipios` |
| Open-Meteo | Geocodificação + altitude | `geocoding-api.open-meteo.com/v1/search` |
| NASA POWER | Clima histórico 30 anos | `power.larc.nasa.gov/api/temporal/monthly/point` |
| SoilGrids ISRIC | Solo — teor de argila | `rest.isric.org/soilgrids/v2.0/properties/query` |
| OpenWeatherMap | Clima em tempo real | `api.openweathermap.org/data/2.5/weather` |

---

## Cultivares disponíveis

| Cultivar | Ciclo | Indicação |
|----------|-------|-----------|
| BRS Princesa | Médio (90–95 dias) | PR, SC, RS — regiões tradicionais |
| BRS Condessa | Médio-tardio (95–100 dias) | PR, SC, RS, GO |
| BRS Duquesa | Precoce (85–90 dias) | PR, SC — altitude ≥ 850m |
| BRS Imperatriz | Curto-médio (85–92 dias) | Cerrado — GO, MG, SP, MS |

---

## Progresso da coleta

| Fase | Status | Municípios |
|------|--------|-----------|
| Total IBGE | — | 5.570 |
| Coletados (Sprint 2) | ✅ Em andamento | 424+ |
| Com coordenadas | ✅ | 300+ |
| Com dados climáticos | ✅ | 424+ |
| Com dados de solo | ⚠️ API offline | ~0 |

---

*SOUFII · UNICENTRO · Sprint 2 · Junho 2026*
