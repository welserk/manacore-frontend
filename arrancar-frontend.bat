@echo off
REM ============================================================
REM ARRANCAR LA TIENDA MANACORE (FRONTEND)
REM Doble clic a este archivo y espera a que diga:
REM   "Application bundle generation complete"
REM Luego abre en tu navegador:  http://localhost:4200
REM (El backend debe estar corriendo aparte con arrancar-backend.bat)
REM Para apagarlo: cierra esta ventana o presiona Ctrl+C
REM ============================================================
cd /d "%~dp0"
echo.
echo  ManaCore TCG - arrancando el frontend...
echo  Cuando diga "Application bundle generation complete",
echo  abre  http://localhost:4200  en tu navegador.
echo.
call npm start
pause
