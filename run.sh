#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Chat-site-with-LLM — Скрипт для запуска всего проекта
#
# Использование:
#   ./run.sh              — запустить оба сервера (ollama + backend + frontend)
#   ./run.sh backend      — только backend
#   ./run.sh frontend     — только frontend
#   ./run.sh ollama       — только ollama
#   ./run.sh stop         — полностью остановить проект
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_VENV="$BACKEND_DIR/venv"
OLLAMA_DIR="$PROJECT_ROOT/ollama"

# Функции вывода
log_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✘${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Настройка backend (создание venv и установка зависимостей)
setup_backend() {
    log_info "Настройка backend..."
    
    if [ ! -d "$BACKEND_VENV" ]; then
        log_warn "Виртуальное окружение не найдено, создаю..."
        python3 -m venv "$BACKEND_VENV"
    fi
    
    # Активирую venv и устанавливаю зависимости
    source "$BACKEND_VENV/bin/activate"
    
    if [ -f "$BACKEND_DIR/requirements.txt" ]; then
        log_info "Устанавливаю зависимости Python..."
        pip install -q -r "$BACKEND_DIR/requirements.txt"
    fi
    
    log_success "Backend готов"
}

# Настройка frontend (установка npm зависимостей)
setup_frontend() {
    log_info "Настройка frontend..."
    
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log_warn "node_modules не найдены, устанавливаю зависимости..."
        cd "$FRONTEND_DIR"
        npm install -q
        cd "$PROJECT_ROOT"
    fi
    
    log_success "Frontend готов"
}

# Запуск backend
run_backend() {
    log_info "Запуск backend на http://127.0.0.1:8000"
    source "$BACKEND_VENV/bin/activate"
    cd "$BACKEND_DIR"
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
}

# Запуск frontend
run_frontend() {
    log_info "Запуск frontend на http://127.0.0.1:5173"
    cd "$FRONTEND_DIR"
    npm run dev -- --host 127.0.0.1 --port 5173
}

# Сборка frontend
build_frontend() {
    log_info "Сборка frontend..."
    cd "$FRONTEND_DIR"
    npm run build
    log_success "Frontend собран в ./frontend/dist"
}

setup_ollama() {
    log_info "Запуск docker..."
    sudo systemctl start docker
    log_info "Docker запущена"
}

start_ollama() {
    log_info "Запуск ollama с моделями..."
    cd "$OLLAMA_DIR"
    sudo docker-compose up --build -d
    log_info "ollama запущена"
}

stop_project() {
    log_info "Останавливаю проект..."

    pkill -f "uvicorn main:app --host 127.0.0.1 --port 8000" 2>/dev/null || true
    pkill -f "vite --host 127.0.0.1 --port 5173" 2>/dev/null || true
    pkill -f "npm run dev -- --host 127.0.0.1 --port 5173" 2>/dev/null || true

    if [ -d "$OLLAMA_DIR" ] && command -v docker >/dev/null 2>&1; then
        (
            cd "$OLLAMA_DIR"
            docker compose down --remove-orphans 2>/dev/null || \
            docker-compose down --remove-orphans 2>/dev/null || \
            sudo docker-compose down --remove-orphans 2>/dev/null
        ) || true
    fi

    log_success "Проект полностью остановлен"
}

# Главная функция
main() {
    local mode="${1:-all}"
    
    case "$mode" in
        backend)
            setup_backend
            run_backend
            ;;
        frontend)
            setup_frontend
            build_frontend
            log_info "Запуск dev-сервера..."
            run_frontend
            ;;
        ollama)
            setup_ollama
            start_ollama
            ;;
        build)
            setup_frontend
            build_frontend
            log_success "Сборка завершена!"
            ;;
        stop)
            stop_project
            ;;
        all|"")
            log_info "════════════════════════════════════════════════"
            log_info "  Chat-site-with-LLM — Локальная нейросеть"
            log_info "════════════════════════════════════════════════"
            
            setup_backend
            setup_frontend
            build_frontend
            setup_ollama
            
            log_info ""
            log_info "Запускаю сервера..."
            log_info "──────────────────────────────────────────────"
            log_info "Backend:  http://127.0.0.1:8000"
            log_info "Frontend: http://127.0.0.1:5173"
            log_info "Ollama: http://127.0.0.1:11434"
            log_info "──────────────────────────────────────────────"
            
            # Запускаю backend и ollama в фоне, frontend в foreground
            start_ollama
            run_backend &
            BACKEND_PID=$!
            
            sleep 2
            log_success "Backend запущен (PID: $BACKEND_PID)"
            
            # Trap для корректного завершения при Ctrl+C
            trap "kill $BACKEND_PID 2>/dev/null; log_info 'Сервера остановлены'; exit 0" INT TERM
            
            run_frontend
            ;;
        *)
            echo "Использование: $0 [backend|frontend|build|all|stop]"
            echo ""
            echo "  backend   — запустить только backend сервер"
            echo "  frontend  — собрать и запустить frontend dev-сервер"
            echo "  build     — собрать frontend для production"
            echo "  all       — запустить всё (по умолчанию)"
            echo "  stop      — полностью остановить проект"
            exit 1
            ;;
    esac
}

main "$@"
