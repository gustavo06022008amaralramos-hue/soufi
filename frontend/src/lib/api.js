export const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

/* fetch + JSON que REJEITA respostas de erro (404/429/500). Sem isso, o corpo
   {"detail": ...} de um erro era tratado como resposta válida — ex.: a aba
   Seguro afirmava "Município fora da abrangência do ZARC" quando na verdade a
   API nem tinha a rota (deploy defasado). */
export async function getJson(url, opcoes) {
  const r = await fetch(url, opcoes);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.json();
}
