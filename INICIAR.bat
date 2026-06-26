@echo off
cd /d "%~dp0"
start "Backend" cmd /k "py main.py"
start "Frontend" cmd /k "cd frontend && node node_modules/vite/bin/vite.js"
timeout /t 3 /nobreak >nul
start http://localhost:5173
