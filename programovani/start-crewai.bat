@echo off
echo ========================================
echo    CrewAI Server Launcher
echo ========================================
echo.
echo Starting CrewAI API server on http://localhost:5005
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"
python python/crewai_api.py

pause
