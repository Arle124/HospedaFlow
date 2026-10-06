#!/bin/bash

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración del servidor de despliegue (Homelab / Servidor remoto)
CEL_IP="${CEL_IP:-100.x.x.x}"
CEL_PORT="${CEL_PORT:-8022}"
CEL_USER="${CEL_USER:-usuario}"
CEL_PATH="${CEL_PATH:-~/HospedaSync}"

echo -e "${BLUE}=== HospedaSync CLI (Plantilla) ===${NC}"
echo "1) Preparar entorno LOCAL (PC)"
echo "2) Compilar y Desplegar al Servidor (SSH)"
echo ""
read -p "Elige una opción (1/2): " choice

case $choice in
    1)
        echo -e "${YELLOW}Configurando entorno LOCAL para desarrollo...${NC}"
        sed -i 's/^DATABASE_URL=.*/DATABASE_URL="postgres:\/\/postgres:postgres@127.0.0.1:5432\/hospedasync?sslmode=disable"/' .env
        sed -i -E "s|target: 'http://.*:8080'|target: 'http://127.0.0.1:8080'|g" frontend/vite.config.ts
        echo -e "${GREEN}Entorno local listo. Ya puedes levantar el backend y Vite.${NC}"
        ;;
    2)
        echo -e "${YELLOW}Iniciando despliegue hacia el servidor...${NC}"
        
        # 1. Compilar Frontend
        echo -e "${BLUE}Compilando Frontend (React/Vite)...${NC}"
        cd frontend && npm run build && cd ..
        
        # 2. Compilar Backend (Cross-compilation para ARM64 / Linux)
        echo -e "${BLUE}Compilando Backend para ARM64...${NC}"
        mkdir -p bin
        CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-w -s" -o bin/hospedasync-arm64 cmd/api/main.go
        
        # 3. Transferir Frontend
        echo -e "${BLUE}Transfiriendo Frontend al servidor...${NC}"
        ssh -p $CEL_PORT $CEL_USER@$CEL_IP "mkdir -p $CEL_PATH/frontend"
        scp -P $CEL_PORT -r frontend/dist $CEL_USER@$CEL_IP:$CEL_PATH/frontend/
        
        # 4. Transferir Backend y config
        echo -e "${BLUE}Transfiriendo Backend y configuraciones al servidor...${NC}"
        ssh -p $CEL_PORT $CEL_USER@$CEL_IP "echo 'DATABASE_URL=postgres://${CEL_USER}@127.0.0.1:5432/hospedasync?sslmode=disable' > $CEL_PATH/.env"
        scp -P $CEL_PORT bin/hospedasync-arm64 $CEL_USER@$CEL_IP:$CEL_PATH/bin/.new
        
        # 4.5 Transferir y aplicar Migraciones SQL
        echo -e "${BLUE}Transfiriendo y aplicando migraciones SQL...${NC}"
        ssh -p $CEL_PORT $CEL_USER@$CEL_IP "mkdir -p $CEL_PATH/sql"
        scp -P $CEL_PORT -r sql/migrations $CEL_USER@$CEL_IP:$CEL_PATH/sql/
        ssh -p $CEL_PORT $CEL_USER@$CEL_IP "for f in $CEL_PATH/sql/migrations/*.up.sql $CEL_PATH/sql/migrations/00*.sql; do if [ -f \"\$f\" ]; then psql hospedasync -f \"\$f\" > /dev/null 2>&1 || true; fi; done"
        
        # 5. Reiniciar Servicio en el servidor remoto
        echo -e "${BLUE}Reiniciando servicio en segundo plano (tmux)...${NC}"
        ssh -p $CEL_PORT $CEL_USER@$CEL_IP "cd $CEL_PATH && \
            tmux kill-session -t hospeda 2>/dev/null || true && \
            pkill -f hospedasync-arm64 || true && \
            sleep 2 && \
            mv bin/.new bin/hospedasync-arm64 && \
            chmod +x bin/hospedasync-arm64 && \
            tmux new-session -d -s hospeda 'cd $CEL_PATH && ./bin/hospedasync-arm64 >> app.log 2>&1'"
            
        echo -e "${GREEN}¡Despliegue completado con éxito! El servidor ya está corriendo la nueva versión.${NC}"
        ;;
    *)
        echo -e "${RED}Opción no válida.${NC}"
        exit 1
        ;;
esac
