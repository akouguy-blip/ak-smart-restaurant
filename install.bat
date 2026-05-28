@echo off
REM ============================================================
REM AK Smart Restaurant — Installeur Windows
REM
REM Utilisation : double-clique sur ce fichier
REM ============================================================

setlocal EnableDelayedExpansion
title AK Smart Restaurant - Installation

echo.
echo ====================================================
echo    AK Smart Restaurant -- Installation Windows
echo ====================================================
echo.

REM ----------------------------------------------------------------
REM 1. Vérifier Docker
REM ----------------------------------------------------------------
where docker >nul 2>&1
if errorlevel 1 (
    echo [X] Docker n'est pas installe.
    echo.
    echo Telecharge Docker Desktop ici :
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo Une fois installe et lance, relance ce script.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [X] Docker n'est pas demarre.
    echo.
    echo Lance Docker Desktop et attends que l'icone baleine soit verte.
    echo Puis relance ce script.
    pause
    exit /b 1
)

echo [OK] Docker installe et demarre

REM ----------------------------------------------------------------
REM 2. Créer .env avec secrets si absent
REM ----------------------------------------------------------------
if not exist .env (
    echo.
    echo [-] Generation de la configuration initiale...

    REM Génère des secrets via PowerShell
    for /f %%i in ('powershell -NoProfile -Command "-join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})"') do set DB_PASS=%%i
    for /f %%i in ('powershell -NoProfile -Command "-join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})"') do set JWT_SEC=%%i

    > .env (
        echo # Configuration generee automatiquement
        echo HTTP_PORT=80
        echo DB_PASSWORD=!DB_PASS!
        echo JWT_SECRET=!JWT_SEC!
    )
    echo [OK] Fichier .env cree avec des secrets uniques
) else (
    echo [OK] Fichier .env existant detecte ^(conserve^)
)

REM ----------------------------------------------------------------
REM 3. Construire les images Docker
REM ----------------------------------------------------------------
echo.
echo [-] Construction des images Docker
echo     ^(5 a 10 minutes la premiere fois^)
echo.

docker compose build
if errorlevel 1 (
    echo.
    echo [X] La construction a echoue. Verifie les messages ci-dessus.
    pause
    exit /b 1
)

REM ----------------------------------------------------------------
REM 4. Démarrer les services
REM ----------------------------------------------------------------
echo.
echo [-] Demarrage des services...
docker compose up -d
if errorlevel 1 (
    echo.
    echo [X] Le demarrage a echoue.
    pause
    exit /b 1
)

REM ----------------------------------------------------------------
REM 5. Attendre que tout soit prêt
REM ----------------------------------------------------------------
echo [-] Attente de la disponibilite de l'application...

REM Lire le port HTTP depuis .env
for /f "tokens=2 delims==" %%a in ('findstr "^HTTP_PORT" .env') do set HTTP_PORT=%%a
if "%HTTP_PORT%"=="" set HTTP_PORT=80

set READY=0
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri http://localhost:%HTTP_PORT% -UseBasicParsing -TimeoutSec 2).StatusCode } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set READY=1
        goto :ready
    )
    timeout /t 2 /nobreak >nul
    <nul set /p =.
)
:ready
echo.

if !READY!==0 (
    echo.
    echo [!] L'application n'a pas repondu apres 60 secondes.
    echo Verifie les logs avec :  docker compose logs -f
    pause
    exit /b 1
)

REM ----------------------------------------------------------------
REM 6. Détecter l'IP locale
REM ----------------------------------------------------------------
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4.*192\.168\."') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :gotip
)
:gotip
if "%LOCAL_IP%"=="" set LOCAL_IP=IP-de-votre-ordinateur

set PORT_SUFFIX=
if not "%HTTP_PORT%"=="80" set PORT_SUFFIX=:%HTTP_PORT%

REM ----------------------------------------------------------------
REM 7. Récap final
REM ----------------------------------------------------------------
echo.
echo ====================================================
echo            [OK] INSTALLATION TERMINEE
echo ====================================================
echo.
echo Acces a l'application :
echo   Sur cet ordinateur : http://localhost%PORT_SUFFIX%
echo   Depuis le WiFi     : http://%LOCAL_IP%%PORT_SUFFIX%
echo.
echo Pour les tablettes/telephones du restaurant :
echo   Demande-leur d'ouvrir Chrome ou Safari et de taper :
echo   ^>^>^> http://%LOCAL_IP%%PORT_SUFFIX%
echo.
echo Comptes pre-configures :
echo   Cuisine    : PIN 1234
echo   Caisse     : PIN 5678
echo   Gerant     : PIN 9999
echo.
echo Tester immediatement :
echo   Client     : http://%LOCAL_IP%%PORT_SUFFIX%/t/07
echo   Cuisine    : http://%LOCAL_IP%%PORT_SUFFIX%/kitchen
echo   Caisse     : http://%LOCAL_IP%%PORT_SUFFIX%/caisse
echo   Admin      : http://%LOCAL_IP%%PORT_SUFFIX%/admin
echo.
echo Commandes utiles :
echo   docker compose logs -f    -- voir les logs en direct
echo   docker compose restart    -- redemarrer
echo   docker compose down       -- arreter
echo.
pause
