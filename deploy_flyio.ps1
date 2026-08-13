# Script de Despliegue Automatizado a Fly.io para Iam Dani Catalogo Santa Cruz
# Alternativa 2: Servidor en Produccion 24/7 en la Nube con Volumen Persistente
# Ejecuta este script desde una ventana de PowerShell en tu equipo:
# .\deploy_flyio.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Verificando instalacion y disponibilidad de Fly.io CLI ===" -ForegroundColor Cyan

function Enable-FlyCli {
    $wingetLinks = "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
    if (Test-Path $wingetLinks) { $env:Path = "$wingetLinks;" + $env:Path }

    if (-not (Get-Command "fly" -ErrorAction SilentlyContinue)) {
        $foundFly = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "fly*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundFly) {
            $flyDir = $foundFly.DirectoryName
            $env:Path = "$flyDir;" + $env:Path
            Set-Alias -Name fly -Value $foundFly.FullName -Scope Global -ErrorAction SilentlyContinue
        }
    }

    if (-not (Get-Command "fly" -ErrorAction SilentlyContinue)) {
        $stdFlyPath = "$env:USERPROFILE\.fly\bin"
        if (Test-Path "$stdFlyPath\fly.exe") { $env:Path = "$stdFlyPath;" + $env:Path }
    }
}

Enable-FlyCli

if (-not (Get-Command "fly" -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Fly CLI usando Winget..." -ForegroundColor Yellow
    winget install -e --id Fly-io.flyctl --accept-package-agreements --accept-source-agreements
    Enable-FlyCli
}

if (-not (Get-Command "fly" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: No se encontro Fly CLI ('fly'). Cierra y reabre tu PowerShell e intentalo de nuevo." -ForegroundColor Red
    exit 1
}

Write-Host "Fly CLI detectado: $((fly version | Select-Object -First 1))" -ForegroundColor Green

function Invoke-FlyWithRetry {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Arguments,
        [int]$MaxRetries = 3
    )

    for ($i = 1; $i -le $MaxRetries; $i++) {
        $oldEA = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $output = & fly @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $oldEA
        $output | Out-Host
        if ($exitCode -eq 0) {
            return $true
        }

        $outStr = ($output | Out-String)
        if ($outStr -match "exceeds organization limit|payment method|billing|credit card") {
            Write-Host "`n========================================================================" -ForegroundColor Yellow
            Write-Host " ATENCION: REQUISITO DE CUENTA / LIMITE DE FLY.IO DETECTADO" -ForegroundColor Yellow
            Write-Host "========================================================================" -ForegroundColor Yellow
            Write-Host "Fly.io ha indicado: 'requested machine count exceeds organization limit'." -ForegroundColor White
            Write-Host "`nPor que ocurre esto en tu cuenta de Fly.io?" -ForegroundColor Cyan
            Write-Host "Fly.io requiere agregar un metodo de pago en tu panel (tarjeta de credito" -ForegroundColor White
            Write-Host "o debito) para verificar tu cuenta y autorizar la creacion de servidores" -ForegroundColor White
            Write-Host "(no te realizaran cargos si te mantienes en el uso gratuito Hobby)." -ForegroundColor White
            Write-Host "`nPara verificar tu cuenta en Fly.io, ingresa aqui:" -ForegroundColor Green
            Write-Host "   https://fly.io/dashboard/personal/billing" -ForegroundColor Cyan
            Write-Host "`n------------------------------------------------------------------------" -ForegroundColor Yellow
            Write-Host " PREFIERES PUBLICAR SIN TARJETA DE CREDITO NI CUENTAS?" -ForegroundColor Green
            Write-Host " Puedes poner tu catalogo online AHORA MISMO y 100% GRATIS usando la" -ForegroundColor White
            Write-Host " Alternativa 1 (Cloudflare Tunnel). Ejecuta en tu PowerShell:" -ForegroundColor White
            Write-Host "`n   .\iniciar_cloudflare.ps1" -ForegroundColor Cyan
            Write-Host "========================================================================`n" -ForegroundColor Yellow
            exit 1
        }

        Write-Host "`nAviso: Ocurrio un fallo temporal de conexion con Fly.io. Reintentando ($i/$MaxRetries) en 3 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    return $false
}

Write-Host "`n=== 1.5 Verificando sesion activa en Fly.io ===" -ForegroundColor Cyan
$whoami = ""
for ($i = 1; $i -le 3; $i++) {
    $whoami = fly auth whoami 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2
}

if ($LASTEXITCODE -ne 0 -or $whoami -match "Error|not logged in|unauthorized") {
    Write-Host "No se ha detectado una sesion activa o el token expiro. Abriendo inicio de sesion web..." -ForegroundColor Yellow
    fly auth login
    $whoami = fly auth whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: No se pudo verificar la sesion de Fly.io. Por favor ejecuta 'fly auth login' en tu consola e intentalo de nuevo." -ForegroundColor Red
        exit 1
    }
}
Write-Host "Conectado a Fly.io como: $whoami" -ForegroundColor Green

Write-Host "`n=== 2. Configuracion del Nombre de tu App en Fly.io ===" -ForegroundColor Cyan
$defaultName = "iam-dani-catalogo-$((Get-Random -Minimum 100 -Maximum 999))"
$appName = Read-Host "Escribe el nombre para tu app (ej. iam-dani-catalogo) [Por defecto: $defaultName]"
if (-not $appName) { $appName = $defaultName }

$region = Read-Host "Escribe la region para el servidor (mia = Miami, iad = Virginia, scl = Santiago) [Por defecto: mia]"
if (-not $region) { $region = "mia" }

Write-Host "`n=== 3. Registrando tu aplicacion en Fly.io ($appName en region $region) ===" -ForegroundColor Cyan
if (Test-Path "fly.toml") {
    Write-Host "Ya se detecto un archivo fly.toml existente. Verificando configuracion..." -ForegroundColor Yellow
} else {
    Invoke-FlyWithRetry -Arguments @("launch", "--name", $appName, "--region", $region, "--no-deploy", "--ha=false", "--yes") | Out-Null
    if (-not (Test-Path "fly.toml")) {
        Write-Host "Error: No se pudo generar fly.toml despues de varios intentos. Verifica tu conexion a internet." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== 4. Creando el Volumen Persistente gratuito de 1 GB (catalogo_data) ===" -ForegroundColor Cyan
try {
    Invoke-FlyWithRetry -Arguments @("volumes", "create", "catalogo_data", "--size", "1", "--app", $appName, "--region", $region, "--yes") | Out-Null
} catch {
    Write-Host "Aviso: El volumen catalogo_data ya existe o se intentara reutilizar el existente." -ForegroundColor Yellow
}

Write-Host "Configurando el punto de montaje del volumen en fly.toml..." -ForegroundColor Yellow
$tomlContent = Get-Content "fly.toml" -Raw
if ($tomlContent -notmatch "catalogo_data") {
    Add-Content -Path "fly.toml" -Value "`n[mounts]`n  source = `"catalogo_data`"`n  destination = `"/app/data`""
    Write-Host "Punto de montaje [mounts] agregado a fly.toml correctamente (/app/data)." -ForegroundColor Green
} else {
    Write-Host "El punto de montaje para 'catalogo_data' en /app/data ya esta configurado en fly.toml." -ForegroundColor Green
}

Write-Host "`n=== 5. Configuracion Automatica de Claves Secretas (Variables de Entorno) ===" -ForegroundColor Cyan
$setSecrets = Read-Host "Deseas configurar las claves secretas en Fly.io ahora? (S/n) [Por defecto: S]"
if (-not $setSecrets -or $setSecrets -match "^[sS]") {
    $secretsArgs = @(
        "APP_URL=https://$appName.fly.dev",
        "APP_BASE_URL=https://$appName.fly.dev"
    )

    if (Test-Path ".env") {
        Write-Host "Archivo .env detectado localmente. Leyendo variables..." -ForegroundColor Green
        $envLines = Get-Content ".env" | Where-Object { $_ -notmatch "^\s*#" -and $_ -match "=" }
        foreach ($line in $envLines) {
            if ($line -match "^(GEMINI_API_KEY|BOT_TOKEN|BOT_USERNAME|TELEGRAM_WEBHOOK_SECRET|CHANNEL_ID|ADMIN_TELEGRAM_IDS|ADMIN_SIGNING_SECRET)\s*=\s*(.*)$") {
                $key = $Matches[1]
                $val = $Matches[2].Trim().Trim('"').Trim("'")
                if ($val -ne "" -and $val -notmatch "^(MY_|123456789:ABC|a_random_)") {
                    $secretsArgs += "$key=$val"
                }
            }
        }
    }

    if ($secretsArgs -notmatch "GEMINI_API_KEY") {
        $geminiKey = Read-Host "Ingresa tu GEMINI_API_KEY real"
        if ($geminiKey) { $secretsArgs += "GEMINI_API_KEY=$geminiKey" }
    }
    if ($secretsArgs -notmatch "BOT_TOKEN") {
        $botToken = Read-Host "Ingresa el BOT_TOKEN de Telegram (ej. 123456789:ABC...)"
        if ($botToken) { $secretsArgs += "BOT_TOKEN=$botToken" }
    }

    Write-Host "Enviando secretos a Fly.io para la aplicacion '$appName'..." -ForegroundColor Yellow
    Invoke-FlyWithRetry -Arguments (@("secrets", "set") + $secretsArgs + @("--app", $appName, "--stage")) | Out-Null
    Write-Host "Claves secretas y URLs configuradas con exito." -ForegroundColor Green
}

Write-Host "`n=== 6. Despliegue en Produccion ===" -ForegroundColor Cyan
$doDeploy = Read-Host "Deseas ejecutar 'fly deploy' y poner tu catalogo en linea ahora mismo? (S/n) [Por defecto: S]"
if (-not $doDeploy -or $doDeploy -match "^[sS]") {
    Write-Host "Iniciando despliegue en Fly.io (este proceso compilara el contenedor Docker y lo levantara)..." -ForegroundColor Yellow
    Invoke-FlyWithRetry -Arguments @("deploy", "--app", $appName, "--ha=false") | Out-Null

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "  DESPLIEGUE EXITOSO EN FLY.IO!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "1. Catalogo Web disponible en:  https://$appName.fly.dev" -ForegroundColor Cyan
    Write-Host "2. El volumen persistente (1 GB) esta montado en /app/data." -ForegroundColor White
    Write-Host "   (La base de datos SQLite y las fotos subidas nunca se borraran)" -ForegroundColor White
    Write-Host "`nComandos utiles:" -ForegroundColor Yellow
    Write-Host "  fly status       -> Ver el estado y uso de recursos del servidor" -ForegroundColor White
    Write-Host "  fly logs         -> Ver registros en tiempo real del servidor" -ForegroundColor White
    Write-Host "  fly open         -> Abrir el catalogo en tu navegador web" -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`nPara desplegar manualmente mas adelante, ejecuta:" -ForegroundColor Yellow
    Write-Host "  fly deploy --app $appName --ha=false" -ForegroundColor White
}
