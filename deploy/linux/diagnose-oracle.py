#!/usr/bin/env python3
"""Read-only TCP diagnosis; does not authenticate or scan other ports."""
import json
import socket
import sys

if len(sys.argv) != 3:
    raise SystemExit("Uso: python3 diagnose-oracle.py HOST PUERTO")
host, port = sys.argv[1], int(sys.argv[2])
results = []
for address in sorted({r[4][0] for r in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)}):
    try:
        with socket.create_connection((address, port), timeout=5):
            status = "TCP_OK"
    except OSError as error:
        status = type(error).__name__
    results.append({"address": address, "port": port, "status": status})
print(json.dumps({"host": host, "results": results}, ensure_ascii=False, indent=2))
