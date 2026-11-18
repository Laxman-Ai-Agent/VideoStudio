@echo off
rem Test: animate one photo into a 5 s clip on Kaggle GPU (LTX-Video). Usage: kaggle\video.cmd IMAGE "prompt"
"%~dp0..\tools\.venv\Scripts\python.exe" "%~dp0video.py" %*
