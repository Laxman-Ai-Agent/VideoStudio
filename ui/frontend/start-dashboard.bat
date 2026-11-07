@echo off
rem Double-click to start the Visual Assets dashboard.
rem One process serves both: ui/backend/server.py runs the API and also serves this frontend folder.
rem Opens http://127.0.0.1:8790 (or the next free port). Close this window to stop it.
title VideoStudio dashboard
call "%~dp0..\..\studio.cmd" ui %*
if errorlevel 1 pause
