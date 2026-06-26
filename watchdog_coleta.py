"""
watchdog_coleta.py — Reinicia coleta_prioritario.py automaticamente se cair.
Roda indefinidamente até não restar municípios pendentes.
"""
import subprocess, time, json, os, requests, sys
from datetime import datetime

SCRIPT      = "coleta_prioritario.py"
LOG_OUT     = "log_coleta.txt"
LOG_ERR     = "log_coleta_err.txt"
LOG_WATCH   = "log_watchdog.txt"
CHECKPOINT  = "checkpoint_processados.json"
SLEEP_START = 30   # segundos entre verificações
SLEEP_CRASH = 8    # segundos antes de reiniciar após crash
UFS_PRIO    = {'PR','SC','RS','SP','MG','BA','MS','MT','GO'}

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    linha = f"[{ts}] {msg}"
    print(linha, flush=True)
    with open(LOG_WATCH, "a", encoding="utf-8") as f:
        f.write(linha + "\n")

def pendentes_restantes():
    """Conta municípios ainda não processados nas UFs prioritárias."""
    try:
        r = requests.get(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios",
            timeout=15
        )
        todos = []
        for m in r.json():
            try:   uf = m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
            except: uf = "??"
            if uf in UFS_PRIO:
                todos.append(str(m["id"]))

        if not os.path.exists(CHECKPOINT):
            return len(todos)
        with open(CHECKPOINT, "r", encoding="utf-8") as f:
            feitos = set(json.load(f))
        return sum(1 for c in todos if c not in feitos)
    except Exception as e:
        log(f"Aviso ao contar pendentes: {e}")
        return -1  # -1 = não sabe, continua rodando

def iniciar():
    log(f"Iniciando {SCRIPT}...")
    return subprocess.Popen(
        [sys.executable, SCRIPT],
        stdout=open(LOG_OUT, "a", encoding="utf-8"),
        stderr=open(LOG_ERR, "a", encoding="utf-8"),
    )

# ── MAIN ──────────────────────────────────────────────────────────
log("Watchdog iniciado.")
restarts = 0
proc = iniciar()

while True:
    time.sleep(SLEEP_START)

    ret = proc.poll()  # None = ainda rodando

    if ret is None:
        # Processo vivo — apenas monitorar
        continue

    # Processo morreu
    restarts += 1
    log(f"Processo encerrou (código {ret}). Reinício #{restarts}.")

    # Verificar se ainda há trabalho
    pend = pendentes_restantes()
    if pend == 0:
        log("Nenhum município pendente. Watchdog encerrado com sucesso.")
        break
    elif pend > 0:
        log(f"Ainda {pend} pendentes. Reiniciando em {SLEEP_CRASH}s...")
    else:
        log(f"Não foi possível contar pendentes. Reiniciando mesmo assim...")

    time.sleep(SLEEP_CRASH)
    proc = iniciar()
