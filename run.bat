@echo off
chcp 65001 >nul

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ОШИБКА] Запустите скрипт от имени администратора.
    pause
    exit /b 1
)

echo Запуск Docker...
net start com.docker.service >nul 2>&1
docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo Ожидание запуска Docker Desktop...
    :wait_docker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorLevel% neq 0 goto wait_docker
)

echo Остановка контейнеров...
docker-compose down

cd frontend

echo Удаление dist и node_modules...
if exist dist     rmdir /s /q dist
if exist node_modules rmdir /s /q node_modules

echo.
echo =========== 1/4 - Скачивание модулей ===========
echo.
call npm i
if %errorLevel% neq 0 (
    echo [ОШИБКА] npm install завершился с ошибкой.
    cd ..
    pause
    exit /b 1
)

echo.
echo =========== 2/4 - Создание билда ===========
echo.
call npm run build
if %errorLevel% neq 0 (
    echo [ОШИБКА] npm run build завершился с ошибкой.
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo =========== 3/4 - Запуск контейнера ===========
echo.
docker-compose up --build -d
if %errorLevel% neq 0 (
    echo [ОШИБКА] docker-compose up завершился с ошибкой.
    pause
    exit /b 1
)

echo.
echo.
echo =========== Не забудьте скачать модели: docker-compose exec ollama ollama pull (Название модели) ===========
echo.
pause