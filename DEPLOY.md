# Deploy do SOUFII

São dois projetos separados na Vercel, a partir do mesmo repositório:

| Projeto | Pasta raiz | O que é |
|---|---|---|
| `soufi-sigma` (já existe) | `frontend` | o site (React/Vite) |
| `soufi-api` (novo) | `./` (raiz) | a API (FastAPI, `main.py`) |

## 1. Criar o projeto da API

1. Em vercel.com: **Add New → Project** → importe o repositório `soufi`.
2. **Project Name:** `soufi-api`.
3. **Framework Preset:** `FastAPI` (se não aparecer, `Other`).
4. **Root Directory:** deixe `./` (não troque para `frontend`).
5. **Build and Output Settings:** deixe tudo no padrão.
6. **Environment Variables** (as mesmas do `.env` local ou do painel do Render):
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - opcionais: `ALLOWED_ORIGINS` (ex.: `https://soufi-sigma.vercel.app`), `RATE_LIMIT_POR_MIN` (padrão 300)
7. **Deploy.**
8. Teste abrindo `https://soufi-api.vercel.app/` (ou a URL que a Vercel mostrar). Tem que aparecer
   `"commit"` com o último commit do GitHub e `"rotas": 14` ou mais.

## 2. Apontar o site para a API nova

1. No projeto `soufi-sigma`: **Settings → Environment Variables → Add**
   - Key: `VITE_API_URL`
   - Value: a URL da API do passo 1 (sem barra no final)
   - Environment: Production (e Preview, se quiser)
2. **Deployments** → no deploy mais recente, **⋯ → Redeploy** (desmarque "Use existing Build Cache").
3. Teste no site: Zoneamento → abra Guarapuava → aba **Seguro**. A barra "Época de semeadura" e o
   card de GDD têm que aparecer (antes mostravam "Não foi possível consultar").

A variável `VITE_API_URL` da Vercel tem prioridade sobre o `frontend/.env.production` do repositório.

## 3. Conferências depois do deploy

- `GET /` da API: `commit` e `rotas`.
- `python auditar_dados.py` (local): base sem problemas.
- Render (`soufi.onrender.com`) pode ser desligado quando o site estiver usando a API da Vercel.

## Manutenção da base

- Migrations: `python rodar_migracoes.py` (lê `DATABASE_URL` do `.env`).
- Depois de qualquer coleta: `python atualizar_flag_zarc_real.py`, `python recalcular_altitude_800m.py`,
  `python calcular_score_multicultura_db.py` e `python auditar_dados.py`.
- Dependências dos scripts: `pip install -r requirements-scripts.txt`.
