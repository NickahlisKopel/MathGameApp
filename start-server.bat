@echo off
echo ========================================
echo Math Game Multiplayer Server
echo ========================================
echo.

cd server

if not exist node_modules (
    echo Installing server dependencies...
    call npm install
    echo.
)

echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop
echo.

call npm start
