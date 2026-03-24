@echo off
chcp 65001 > nul
echo.
echo ==================================================
echo   Bluesky 予約投稿ツール
echo ==================================================
echo.

python --version > nul 2>&1
if errorlevel 1 (
    echo [エラー] Python が見つかりません。
    echo https://www.python.org/ からインストールしてください。
    pause
    exit /b 1
)

echo パッケージをインストールしています...
pip install -r requirements.txt
if errorlevel 1 (
    echo [エラー] パッケージのインストールに失敗しました。
    pause
    exit /b 1
)

echo.
echo Web アプリを起動しています...
echo.
python web_app.py
pause
