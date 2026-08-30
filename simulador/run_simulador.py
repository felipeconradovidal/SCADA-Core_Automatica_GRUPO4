#!/usr/bin/env python3
"""
SCADA-Core Automática - Launcher do Simulador & Gêmeo Digital
Inicia um servidor HTTP local e abre a interface SCADA automaticamente no navegador.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

def run_server():
    # Define o diretório de trabalho como a pasta do simulador
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)

    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html',
    })

    print("=" * 65)
    print("  SCADA-Core Automática | Digital Twin & Simulador Industrial")
    print("  Engenharia de Controle e Automação - Grupo 4")
    print("=" * 65)
    print(f"[*] Iniciando servidor local na porta: {PORT}")
    print(f"[*] Acesse diretamente pelo navegador: http://localhost:{PORT}")
    print("=" * 65)

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            # Abre o navegador automaticamente
            webbrowser.open(f"http://localhost:{PORT}")
            print("[*] Pressione Ctrl+C para encerrar o simulador.")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.winerror == 10048:
            alt_port = 8081
            print(f"[!] Porta {PORT} em uso. Tentando porta {alt_port}...")
            with socketserver.TCPServer(("", alt_port), Handler) as httpd:
                webbrowser.open(f"http://localhost:{alt_port}")
                httpd.serve_forever()
        else:
            raise e
    except KeyboardInterrupt:
        print("\n[*] Servidor encerrado com sucesso.")
        sys.exit(0)

if __name__ == "__main__":
    run_server()
