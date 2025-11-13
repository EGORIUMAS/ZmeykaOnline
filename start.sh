#!/bin/bash
echo "🐍 Запуск сервера Змейки..."
echo ""
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не установлен!"
    exit 1
fi

# Загрузка переменных из .env если файл существует
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Загружены настройки из .env"
fi

# Установка значений по умолчанию
WEBSOCKET_HOST=${WEBSOCKET_HOST:-localhost}
WEBSOCKET_PORT=${WEBSOCKET_PORT:-8000}

echo "📦 Проверка зависимостей..."
pip3 install -q -r requirements.txt
echo ""
echo "✅ Зависимости установлены"
echo ""
echo "🚀 Запуск сервера на http://${WEBSOCKET_HOST}:${WEBSOCKET_PORT}"
echo "   Нажмите Ctrl+C для остановки"
echo ""
python3 server.py
