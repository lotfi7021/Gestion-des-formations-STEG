@echo off
cd /d "%~dp0"
npm run dev > frontend.log 2>&1
