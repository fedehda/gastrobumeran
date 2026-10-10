@echo off
setlocal
cd /d "%~dp0"
title GastroBumeran - Fidelizacion Gastronomica ^& Fudo POS

echo ==============================================================================
echo     🍔🔁 GASTROBUMERAN - PLATAFORMA DE FIDELIZACION GASTRONOMICA
echo     Integracion Fudo POS, Motor Hibrido Puntos/Sellos y Doble Timer
echo ==============================================================================
echo.

:: 1. Verificar si Node.js está instalado en el sistema
where node >nul 2>nul
if errorlevel 1 goto err_node

echo [OK] Node.js detectado:
node -v
echo.

:: 2. Verificar que se esté ejecutando en la carpeta raíz del proyecto
if not exist "package.json" goto err_package

:: 3. Asegurar que exista la carpeta data/ para SQLite local
if not exist "data\" (
    mkdir data
)

:: 4. Verificar archivo de configuración .env.local
if not exist ".env.local" goto create_env
:after_env

:: 5. Verificar dependencias instaladas (node_modules)
if not exist "node_modules\" goto install_deps
:after_deps

:: 6. Detectar IP local para acceso desde celulares en la red Wi-Fi
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    if not defined LOCAL_IP (
        for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
    )
)
if not defined LOCAL_IP set "LOCAL_IP=127.0.0.1"

echo ==============================================================================
echo   Iniciando GastroBumeran (Escuchando en toda la red local)
echo.
echo   * Acceso en esta PC (Caja central):
echo     http://localhost:3000
echo.
echo   * Acceso desde Celulares / Mozos en la misma red Wi-Fi:
echo     http://gastrobumeran.local:3000
echo     http://%LOCAL_IP%:3000
echo.
echo   * Terminal Movil de Mozos ^& Canjes:
echo     http://gastrobumeran.local:3000/caja
echo     http://%LOCAL_IP%:3000/caja
echo.
echo   * Portal del Comensal PWA:
echo     http://gastrobumeran.local:3000/portal
echo.
echo   * Credenciales Demo: admin@gastrobumeran.com / admin123 (PIN: 1234)
echo ==============================================================================
echo.
echo Presiona Ctrl + C en esta ventana cuando desees detener el servidor.
echo.

:: Abrir navegador automáticamente tras 2 segundos
start "" http://localhost:3000

:: Iniciar servidor de desarrollo Next.js
call npm.cmd run dev

echo.
echo El servidor se ha detenido.
pause
exit /b 0

:create_env
echo [INFO] No se encontro .env.local. Creando a partir de .env.example...
if exist ".env.example" (
    copy .env.example .env.local >nul
    echo [OK] Archivo .env.local creado exitosamente.
    echo      (Puedes editarlo luego para configurar FUDO_API_KEY y FUDO_API_SECRET)
) else (
    echo FUDO_API_KEY=DEMO_FUDO_KEY_RESTO99> .env.local
    echo FUDO_API_SECRET=DEMO_FUDO_SECRET_XYZ888>> .env.local
    echo FUDO_BASE_URL=https://api.fu.do/v1alpha1>> .env.local
    echo [OK] Archivo .env.local generado con valores predeterminados.
)
echo.
goto after_env

:install_deps
echo [INFO] Primera ejecucion detectada: Instalando dependencias de Node.js...
echo Esto puede demorar 1 o 2 minutos mientras se descargan las librerias...
call npm.cmd install
if errorlevel 1 goto err_install
echo [OK] Dependencias instaladas con exito.
echo.
goto after_deps

:err_node
echo.
echo ==============================================================================
echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
echo ==============================================================================
echo.
echo Para ejecutar GastroBumeran necesitas tener instalado Node.js (version 20 o superior).
echo Puedes descargarlo gratis desde el sitio oficial:
echo https://nodejs.org/ (Descarga la version LTS recomendada)
echo.
echo Presiona cualquier tecla para salir...
pause >nul
exit /b 1

:err_package
echo.
echo ==============================================================================
echo [ERROR] No se encontro el archivo package.json en este directorio.
echo ==============================================================================
echo.
echo Esto suele ocurrir si:
echo 1. Copiaste unicamente el archivo .bat en lugar de toda la carpeta del proyecto.
echo 2. Abriste el archivo .bat directamente desde un archivo ZIP comprimido sin extraer.
echo.
echo SOLUCION:
echo 1. Si descargaste un ZIP, haz clic derecho y selecciona "Extraer todo...".
echo 2. Asegurate de copiar la carpeta completa "gastrobumeran".
echo 3. Ejecuta iniciar-gastrobumeran.bat desde dentro de la carpeta extraida.
echo.
pause
exit /b 1

:err_install
echo.
echo ==============================================================================
echo [ERROR] No se pudieron instalar las dependencias con npm.
echo ==============================================================================
echo.
echo Revisa tu conexion a internet e intenta ejecutar nuevamente.
echo.
pause
exit /b 1
