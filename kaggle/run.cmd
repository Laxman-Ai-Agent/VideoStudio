@echo off
rem Transcribe project audio on Kaggle GPU. Usage: kaggle\run.cmd 07 [08 ...]   (see kaggle\README.md)
"%~dp0..\tools\.venv\Scripts\python.exe" "%~dp0run.py" %*
