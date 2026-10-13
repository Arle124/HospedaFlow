#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# ==============================================================================
# HospedaSync · Script de Arranque para Servidor Móvil de Bolsillo (cel-server)
# ==============================================================================

# Evitar que Android duerma la CPU
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
    echo "✓ CPU Wake-lock activado (Android no suspenderá el servidor)."
fi

# Iniciar PostgreSQL si no está activo
PG_DATA="${PG_DATA:-$HOME/pg_data}"
if command -v pg_ctl >/dev/null 2>&1 && [ -d "$PG_DATA" ]; then
    if ! pg_ctl -D "$PG_DATA" status >/dev/null 2>&1; then
        echo "Iniciando base de datos PostgreSQL..."
        pg_ctl -D "$PG_DATA" -l "$PG_DATA/server.log" start
        echo "✓ PostgreSQL activo."
    fi
fi

# Directorio base
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Verificar que el binario exista antes de ejecutarlo
if [ ! -f "bin/hospedasync-arm64" ]; then
    echo "Error: el binario bin/hospedasync-arm64 no existe." >&2
    exit 1
fi

# Permiso de ejecución al binario ARM64
chmod +x bin/hospedasync-arm64

echo "=================================================="
echo "🏨 HospedaSync · Servidor Portátil Activo"
echo "=================================================="
echo "Local en el teléfono: http://localhost:8080"
echo "En red Tailscale:     http://100.84.162.38:8080"
echo "=================================================="
echo "Presiona Ctrl+C para detener."
echo ""

./bin/hospedasync-arm64
