@echo off
cd /d "%~dp0"
npm run start:dev > backend.log 2>&1
