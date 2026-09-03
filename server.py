#!/usr/bin/env python3
"""
IronTrack Local Development Server
Запускает локальный веб-сервер и выводит адрес для подключения с телефона.
"""

import http.server
import socket
import socketserver
import os
import sys

# Настройка UTF-8 для вывода в Windows консоли
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PORT = 8080

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    ip = get_local_ip()
    url = f"http://{ip}:{PORT}"
    local_url = f"http://localhost:{PORT}"

    print("=" * 60)
    print("   IRONTRACK - ДНЕВНИК ТРЕНИРОВОК И ПРОГРЕССА В ЗАЛЕ")
    print("=" * 60)
    print(f"\n[+] Сервер запущен!")
    print(f"[+] На компьютере: {local_url}")
    print(f"\n[+] КАК ОТКРЫТЬ НА ANDROID-СМАРТФОНЕ:")
    print(f"    1. Подключите телефон к тому же Wi-Fi (или мобильной точке доступа)")
    print(f"    2. В браузере Chrome на телефоне перейдите по адресу:")
    print(f"       >>>  {url}  <<<")
    print(f"    3. В меню Chrome нажмите 'Установить приложение' (или 'На главный экран')")
    print("=" * 60)
    print("Сервер работает. Нажмите Ctrl+C для остановки.\n")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен.")

if __name__ == '__main__':
    main()
