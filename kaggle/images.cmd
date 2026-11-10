@echo off
rem Generate project image assets on Kaggle GPU. Usage: kaggle\images.cmd 01 [A010 ...]   (see kaggle\README.md)
"%~dp0..\tools\.venv\Scripts\python.exe" "%~dp0images.py" %*
