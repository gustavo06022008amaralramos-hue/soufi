Set-Location "c:\Users\gusta\OneDrive\Desktop\SOUFFI - PROJETO AGRARIA"
Write-Host "$(Get-Date -Format 'HH:mm:ss') Aguardando coleta prioritaria terminar..."
while ($true) {
    $proc = Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
        (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
    } | Where-Object { $_ -like "*coleta_prioritario*" }
    if (-not $proc) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') Prioritarios concluidos! Iniciando coleta_dados.py..."
        Start-Process python -ArgumentList "coleta_dados.py" -WindowStyle Minimized
        break
    }
    Start-Sleep -Seconds 15
}
