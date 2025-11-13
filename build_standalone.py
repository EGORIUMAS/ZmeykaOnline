#!/usr/bin/env python3
"""
Скрипт для создания standalone версии index.html в папке .develop/
Собирает все CSS и JS файлы в один HTML файл для удобного тестирования
"""

import os
from pathlib import Path

def read_file(path):
    """Читает содержимое файла"""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def build_standalone():
    """Собирает standalone версию index.html"""
    
    # Создаем папку .develop если её нет
    develop_dir = Path('.develop')
    develop_dir.mkdir(exist_ok=True)
    
    # Читаем основной HTML
    html_content = read_file('templates/index.html')
    
    # Читаем CSS
    css_content = read_file('static/css/styles.css')
    
    # Читаем все JS файлы
    js_files = [
        'static/js/config.js',
        'static/js/storage.js',
        'static/js/renderer.js',
        'static/js/controls.js',
        'static/js/online.js',
        'static/js/ui.js',
        'static/js/main.js'
    ]
    
    js_content = '\n\n'.join([
        f'// ===== {Path(f).name} =====\n{read_file(f)}'
        for f in js_files
    ])
    
    # Заменяем ссылки на CSS
    html_content = html_content.replace(
        '<link rel="stylesheet" href="/static/css/styles.css">',
        f'<style>\n{css_content}\n  </style>'
    )
    
    # Заменяем ссылки на JS файлы
    js_links = '\n  '.join([
        f'<script src="/{f}"></script>'
        for f in js_files
    ])
    
    html_content = html_content.replace(
        js_links,
        f'<script>\n{js_content}\n  </script>'
    )
    
    # Заменяем Jinja2 переменные на значения по умолчанию
    html_content = html_content.replace('{{ ws_host }}', 'localhost')
    html_content = html_content.replace('{{ ws_port }}', '8000')
    
    # Сохраняем результат
    output_path = develop_dir / 'index.html'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f'✅ Standalone версия создана: {output_path}')
    print(f'📦 Размер файла: {output_path.stat().st_size / 1024:.1f} KB')
    print(f'🚀 Откройте файл в браузере для тестирования')

if __name__ == '__main__':
    build_standalone()
