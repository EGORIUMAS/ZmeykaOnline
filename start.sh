#!/bin/bash
echo "🐍 Запуск сервера Змейки..."
echo ""
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не установлен!"
    exit 1
fi
echo "📦 Проверка зависимостей..."
pip3 install -q -r requirements.txt
echo ""
echo "✅ Зависимости установлены"
echo ""
echo "�� Запуск сервера на http://localhost:8080"
echo "   Нажмите Ctrl+C для остановки"
echo ""
python3 server.py
