@echo off
setlocal
cd /d "D:\000_SaaS\clubmanager"

echo ========================================================
echo ClubManager - Subida a GitHub (panchito49-cloud/clubmanager)
echo ========================================================

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] No se encontro Git instalado en esta consola.
    echo Si todavia no tienes Git, descargalo e instalalo desde:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

if not exist .git (
    echo Inicializando repositorio...
    git init
    git branch -M main
)

echo Agregando archivos del proyecto...
git add .

echo Creando commit inicial...
git commit -m "feat: MVP ClubManager completo - Multitenant, Mercado Pago, WhatsApp, Netlify"

git remote remove origin >nul 2>&1
git remote add origin https://github.com/panchito49-cloud/clubmanager.git

echo.
echo Subiendo cambios a https://github.com/panchito49-cloud/clubmanager ...
git push -u origin main

echo.
echo ========================================================
echo Todo listo! Repositorio actualizado con exito.
echo ========================================================
pause
