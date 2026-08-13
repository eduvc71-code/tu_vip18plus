@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\iniciar_ngrok_permanente.ps1"
