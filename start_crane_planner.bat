@echo off
cd /d %~dp0\backend
start http://10.200.19.106:5000
start /b pythonw app.py
