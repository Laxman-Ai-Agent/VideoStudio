@echo off
rem Kaggle CLI with the token from kaggle\access_token (never printed). Usage: kaggle\kg.cmd kernels list --mine
setlocal
if not exist "%~dp0access_token" (echo kaggle\access_token missing. See kaggle\README.md & exit /b 1)
set /p KAGGLE_API_TOKEN=<"%~dp0access_token"
"%~dp0.venv\Scripts\kaggle.exe" %*
