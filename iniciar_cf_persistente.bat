@echo off
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --protocol http2 --edge-ip-version 4 --url http://127.0.0.1:3000 --logfile "c:\catalogo\cf_url.log"
