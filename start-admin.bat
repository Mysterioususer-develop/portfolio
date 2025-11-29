@echo off
setlocal
cd /d C:\Users\rk\Desktop\portfolio
if not exist node_modules (npm install)
node admin\server.js
