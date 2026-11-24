@echo off
setlocal
cd /d "D:\000_SaaS\clubmanager"

echo ========================================================
echo ClubManager - Subida a GitHub
echo ========================================================

REM Configurar safe.directory para evitar el bloqueo de propiedad de Windows
"C:\Program Files\Git\cmd\git.exe" config --global --add safe.directory "D:/000_SaaS/clubmanager"

if not exist .git (
    echo Inicializando repositorio...
    "C:\Program Files\Git\cmd\git.exe" init
    "C:\Program Files\Git\cmd\git.exe" branch -M main
)

echo Preparando archivos...
"C:\Program Files\Git\cmd\git.exe" add .

echo Creando commit...
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: MVP ClubManager - Next.js, Multitenant, Mercado Pago, WhatsApp, Netlify"

"C:\Program Files\Git\cmd\git.exe" remote remove origin >nul 2>&1
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/panchito49-cloud/clubmanager.git

echo.
echo Subiendo a GitHub...
"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
echo ========================================================
echo Terminado. Verifica arriba si se realizo el push correctamente.
echo ========================================================
pause
