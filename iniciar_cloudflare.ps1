# Script Automático Inteligente para Cloudflare Tunnel (Gratis sin Tarjeta de Credito)
# Detecta automáticamente la nueva URL temporal, actualiza el archivo .env
# y configura el Bot de Telegram de forma automática.
#
# Ejecuta este script desde tu ventana de PowerShell:
# .\iniciar_cloudflare.ps1

Write-Host "=== 1. Verificando Cloudflare Tunnel (cloudflared) ===" -ForegroundColor Cyan

function Enable-Cloudflared {
    $wingetLinks = "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
    if (Test-Path $wingetLinks) { $env:Path = "$wingetLinks;" + $env:Path }

    if (-not (Get-Command "cloudflared" -ErrorAction SilentlyContinue)) {
        $foundCf = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:ProgramFiles", "${env:ProgramFiles(x86)}" -Filter "cloudflared.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundCf) {
            $cfDir = $foundCf.DirectoryName
            $env:Path = "$cfDir;" + $env:Path
            Set-Alias -Name cloudflared -Value $foundCf.FullName -Scope Global -ErrorAction SilentlyContinue
        }
    }
}

Enable-Cloudflared

if (-not (Get-Command "cloudflared" -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Cloudflare Tunnel mediante Winget (Sin cuenta ni tarjeta de credito)..." -ForegroundColor Yellow
    winget install -e --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
    Enable-Cloudflared
}

if (-not (Get-Command "cloudflared" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: No se encontro cloudflared. Cierra y reabre tu PowerShell e intentalo de nuevo." -ForegroundColor Red
    exit 1
}

Write-Host "Cloudflared detectado: $((cloudflared --version | Select-Object -First 1))" -ForegroundColor Green

function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1
        if ($listener -and $listener.OwningProcess) {
            Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Puerto $Port liberado." -ForegroundColor Yellow
        }
    } catch {}
}

Stop-ProcessOnPort 3001
Stop-ProcessOnPort 24679

if (-not (Test-Path "node_modules")) {
    Write-Host "`n=== Instalando dependencias de Node.js (npm install) ===" -ForegroundColor Yellow
    npm install
}

Write-Host "`n=== 2. Compilando aplicacion Flavia • Ruti VIP (+18) para produccion ===" -ForegroundColor Cyan
npm run build

Write-Host "`n=== 3. Iniciando Cloudflare Tunnel en segundo plano ===" -ForegroundColor Cyan
if (Test-Path "tunnel.log") { Remove-Item "tunnel.log" -Force }

# Iniciar cloudflared redirigiendo salida a tunnel.log
$cfProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:3001" -RedirectStandardError "tunnel.log" -PassThru -NoNewWindow

Write-Host "Esperando a que Cloudflare asigne la URL publica HTTPS..." -ForegroundColor Yellow

$tunnelUrl = ""
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path "tunnel.log") {
        $logContent = Get-Content "tunnel.log" -Raw -ErrorAction SilentlyContinue
        if ($logContent -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') {
            $tunnelUrl = $matches[0]
            break
        }
    }
}

if ($tunnelUrl -ne "") {
    Write-Host "`n>>> URL PUBLICA DETECTADA: $tunnelUrl <<<" -ForegroundColor Green
    Write-Host "Actualizando automáticamente el archivo .env con la nueva URL..." -ForegroundColor Cyan
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $envContent = $envContent -replace 'APP_URL=".*"', "APP_URL=`"$tunnelUrl`""
        $envContent = $envContent -replace 'APP_BASE_URL=".*"', "APP_BASE_URL=`"$tunnelUrl`""
        $envContent | Set-Content ".env"
    }
} else {
    Write-Host "Aviso: No se pudo detectar la URL de trycloudflare.com en tunnel.log (el túnel se mantendrá abierto)." -ForegroundColor Yellow
}

Write-Host "`n=== 4. Iniciando Servidor Flavia • Ruti VIP (+18) (Puerto 3001) ===" -ForegroundColor Cyan
Write-Host "El servidor actualizará automáticamente tu Webhook de Telegram al iniciar." -ForegroundColor Green
Write-Host "----------------------------------------------------------------------------------" -ForegroundColor White
Write-Host "Presiona Ctrl+C en esta ventana cuando desees apagar el servidor y el tunel." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------------------" -ForegroundColor White

try {
    $env:NODE_ENV = 'production'
    $env:PORT = '3001'
    $env:HOST = '0.0.0.0'
    npm start
} finally {
    if ($cfProcess -and -not $cfProcess.HasExited) {
        Write-Host "`nCerrando Cloudflare Tunnel..." -ForegroundColor Yellow
        Stop-Process -Id $cfProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "tunnel.log") { Remove-Item "tunnel.log" -Force -ErrorAction SilentlyContinue }
}
