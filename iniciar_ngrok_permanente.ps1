param(
    [string]$Dominio = "",
    [string]$Token = ""
)

# Script para URL Permanente (100% Gratis sin Tarjeta y sin que la URL cambie nunca)
# Usando Dominio Estatico Gratuito de Ngrok

Write-Host "=== 1. Verificando Ngrok para URL Permanente ===" -ForegroundColor Cyan

function Enable-NgrokPath {
    $ngrokBinDir = "$env:LOCALAPPDATA\ngrok_bin"
    if (Test-Path "$ngrokBinDir\ngrok.exe") {
        $env:Path = "$ngrokBinDir;" + $env:Path
        Set-Alias -Name ngrok -Value "$ngrokBinDir\ngrok.exe" -Scope Global -ErrorAction SilentlyContinue
        return
    }
    $wingetLinks = "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
    if (Test-Path $wingetLinks) { $env:Path = "$wingetLinks;" + $env:Path }
    if (-not (Get-Command "ngrok" -ErrorAction SilentlyContinue)) {
        $foundNg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:ProgramFiles", "${env:ProgramFiles(x86)}" -Filter "ngrok.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundNg) {
            $ngDir = $foundNg.DirectoryName
            $env:Path = "$ngDir;" + $env:Path
            Set-Alias -Name ngrok -Value $foundNg.FullName -Scope Global -ErrorAction SilentlyContinue
        }
    }
}

Enable-NgrokPath

if (-not (Get-Command "ngrok" -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Ngrok mediante Winget..." -ForegroundColor Yellow
    winget install -e --id Ngrok.Ngrok --accept-package-agreements --accept-source-agreements
    Enable-NgrokPath
}

if (-not (Get-Command "ngrok" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: No se encontro ngrok. Cierra y reabre tu PowerShell o descargalo desde https://ngrok.com" -ForegroundColor Red
    exit 1
}

if ($Token -ne "") {
    Write-Host "Configurando tu authtoken de Ngrok..." -ForegroundColor Yellow
    ngrok config add-authtoken $Token
}

if ($Dominio -eq "") {
    Write-Host "`n=========================================================================" -ForegroundColor Yellow
    Write-Host " AVISO: Para tener un Link Permanente que NUNCA VENZA:" -ForegroundColor White
    Write-Host " 1. Regístrate gratis en https://dashboard.ngrok.com" -ForegroundColor Cyan
    Write-Host " 2. En 'Domains', obtén tu dominio gratis (ej: flavia-vip.ngrok-free.app)" -ForegroundColor Cyan
    Write-Host " 3. Ejecuta este script así:" -ForegroundColor Green
    Write-Host "    .\iniciar_ngrok_permanente.ps1 -Dominio `"tu-dominio.ngrok-free.app`"" -ForegroundColor White
    Write-Host "=========================================================================`n" -ForegroundColor Yellow

    $Dominio = Read-Host "Por favor ingresa tu dominio de Ngrok (o presiona Enter para usar una URL temporal)"
}

if ($Dominio -ne "") {
    $urlPermanente = "https://$Dominio"
    Write-Host "Configurando URL Permanente en .env: $urlPermanente" -ForegroundColor Green
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $envContent = $envContent -replace 'APP_URL=".*"', "APP_URL=`"$urlPermanente`""
        $envContent = $envContent -replace 'APP_BASE_URL=".*"', "APP_BASE_URL=`"$urlPermanente`""
        $envContent | Set-Content ".env"
    }
}

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
    Write-Host "`n=== Instalando dependencias de Node.js ===" -ForegroundColor Yellow
    npm install
}

Write-Host "`n=== 2. Compilando aplicacion Flavia • Ruti VIP (+18) ===" -ForegroundColor Cyan
npm run build

Write-Host "`n=== 3. Iniciando el servidor Express (Puerto 3001) ===" -ForegroundColor Cyan
$currentDir = $PWD.Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; `$env:NODE_ENV='production'; `$env:PORT='3001'; `$env:HOST='0.0.0.0'; Write-Host '=== SERVIDOR FLAVIA RUTI VIP (+18) (PUERTO 3001) ===' -ForegroundColor Green; npm start"

Write-Host "Esperando 3 segundos a que encienda el servidor local..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n=== 4. Abriendo tunel HTTPS ===" -ForegroundColor Green
if ($Dominio -ne "") {
    Write-Host "Tu Webhook de Telegram y tu Bot se conectaran a https://$Dominio" -ForegroundColor Cyan
} else {
    Write-Host "No se usará un dominio reservado; se creará una URL temporal de Ngrok para la mini app." -ForegroundColor Cyan
}
Write-Host "----------------------------------------------------------------------------------" -ForegroundColor White

$ngrokLogPath = Join-Path $PWD.Path "ngrok.log"
if (Test-Path $ngrokLogPath) {
    Remove-Item $ngrokLogPath -Force -ErrorAction SilentlyContinue
}

$ngrokArgs = @('http','3001','--log=stdout')
if ($Dominio -ne "") {
    $ngrokArgs = @('http','--domain', $Dominio, '3001', '--log=stdout')
}

$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList $ngrokArgs -RedirectStandardOutput $ngrokLogPath -RedirectStandardError ($ngrokLogPath + '.err') -PassThru -NoNewWindow

$publicUrl = ''
for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $ngrokLogPath) {
        $logContent = Get-Content $ngrokLogPath -Raw -ErrorAction SilentlyContinue
        if ($logContent -match 'https://[a-zA-Z0-9.-]+(?:\.ngrok-free\.app|\.ngrok\.app|\.localhost\.run)') {
            $publicUrl = $matches[0]
            break
        }
    }
}

if ($publicUrl -ne "") {
    Write-Host "Tunel activo detectado: $publicUrl" -ForegroundColor Green
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $envContent = $envContent -replace 'APP_URL=".*"', ('APP_URL="' + $publicUrl + '"')
        $envContent = $envContent -replace 'APP_BASE_URL=".*"', ('APP_BASE_URL="' + $publicUrl + '"')
        $envContent | Set-Content ".env"
    }
} else {
    Write-Host "No se detectó la URL pública aún. Revisa el archivo ngrok.log si aparece un error como ERR_NGROK_3200." -ForegroundColor Yellow
}

Write-Host "Manteniendo el túnel abierto. Presiona Ctrl+C para cerrarlo." -ForegroundColor Yellow
if ($ngrokProcess -and $ngrokProcess.Id) {
    try {
        $null = Get-Process -Id $ngrokProcess.Id -ErrorAction Stop
        Wait-Process -Id $ngrokProcess.Id
    } catch {
        Write-Host "El proceso de ngrok ya no está activo o no se pudo esperar correctamente." -ForegroundColor Yellow
    }
}
