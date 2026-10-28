# Deploy do SOUFII

Projetos na Vercel, a partir do mesmo repositório:

| Projeto | Pasta raiz | O que é |
|---|---|---|
| `soufi-sigma` (já existe) | `frontend` | o site (React/Vite) |
| `soufi-api` (novo) | `./` (raiz) | a API (FastAPI, `main.py`) |

## Opção A (recomendada): site e API no MESMO projeto da Vercel (`soufi-sigma`)

O `vercel.json` da raiz compila o site (`frontend/`) e publica a API como função Python em
`/api` (`api/index.py`, que repassa para o `main.py`). O site chama a API no próprio endereço.

1. Projeto **soufi-sigma → Settings → General → Root Directory**: troque `frontend` por **`./`**
   (deixe o campo vazio / raiz) e salve.
2. **Settings → Build & Deployment → Framework Preset:** **Other**. Deixe Build/Install/Output
   sem override (o `vercel.json` já define).
3. **Settings → Environment Variables**, em Production:
   - `SUPABASE_URL` e `SUPABASE_KEY` (mesmos valores do `.env`/Render)
   - `VITE_API_URL` = **`/api`**
4. **Deployments → ⋯ → Redeploy** (desmarque "Use existing Build Cache").
5. Teste:
   - `https://soufi-sigma.vercel.app/api/` → `"rotas": 14` ou mais e `"commit"` preenchido
   - `https://soufi-sigma.vercel.app/zoneamento` abre direto (antes dava 404)
   - Zoneamento → Guarapuava → aba **Seguro**: "Época de semeadura" e GDD aparecem

Para voltar atrás: Root Directory de novo em `frontend` e apague `VITE_API_URL`.

## Opção B: API num projeto separado (`soufi-api`)

1. **Add New → Project** → importe `soufi` → Project Name `soufi-api`, Framework **FastAPI**
   (ou Other), Root Directory **`./`**, variáveis `SUPABASE_URL` e `SUPABASE_KEY` → Deploy.
2. No `soufi-sigma`: variável `VITE_API_URL` = URL do `soufi-api` (sem barra no final) → Redeploy.

## 3. Conferências depois do deploy

- `GET /` da API: `commit` e `rotas`.
- `python auditar_dados.py` (local): base sem problemas.
- Render (`soufi.onrender.com`) pode ser desligado quando o site estiver usando a API da Vercel.

## Manutenção da base

- Migrations: `python rodar_migracoes.py` (lê `DATABASE_URL` do `.env`).
- Depois de qualquer coleta: `python atualizar_flag_zarc_real.py`, `python recalcular_altitude_800m.py`,
  `python calcular_score_multicultura_db.py` e `python auditar_dados.py`.
- Dependências dos scripts: `pip install -r requirements-scripts.txt`.
