# 🧠 Chat-site-with-LLM — Локальная нейросеть Кванториума

Полнофункциональное веб-приложение для работы с локальными языковыми моделями через Ollama. Интерфейс с чат-историей, выбором моделей и стриминг-ответами.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Требования](#требования)
- [Установка](#установка)
- [Структура проекта](#структура-проекта)
- [Использование](#использование)
- [Архитектура](#архитектура)
- [Для разработчиков](#для-разработчиков)

---

## 🚀 Быстрый старт

```bash
# Клонируйте проект
git clone <repo>
cd Chat-site-with-LLM

# Дайте скрипту права на выполнение
chmod +x run.sh

# Запустите всё (backend + frontend)
./run.sh

# Откройте http://127.0.0.1:5173 в браузере
```

**Важно!** Убедитесь, что Ollama запущена на `http://127.0.0.1:11434`

---

## 📦 Требования

### Системные требования
- **Python 3.8+** (для backend)
- **Node.js 16+** и **npm 8+** (для frontend)
- **Ollama** (локальный LLM сервер)

### Установленные модели в Ollama
По умолчанию используются:
- `mistral:latest` — быстрая модель для повседневного общения
- `minicpm-v4.6:1b` — компактная модель для размышления

Модели конфигурируются в [`frontend/src/api/ModelsConfig.jsx`](frontend/src/api/ModelsConfig.jsx).

### Backend зависимости (Python)
```
fastapi>=0.104.0
uvicorn>=0.24.0
requests>=2.31.0
pydantic>=2.0.0
python-dotenv>=0.9.9
```

### Frontend зависимости (Node)
```json
{
  "react": "^19.2.6",
  "react-dom": "^19.2.6"
}
```

---

## 🔧 Установка

### 1. Клонирование проекта
```bash
git clone <repo>
cd Chat-site-with-LLM
```

### 2. Установка Backend
```bash
# Создайте виртуальное окружение Python
python3 -m venv backend/venv

# Активируйте venv
source backend/venv/bin/activate  # Linux/Mac
# или
backend\venv\Scripts\activate  # Windows

# Установите зависимости
pip install -r backend/requirements.txt
```

### 3. Установка Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Запуск Ollama (если не запущена)
```bash
# В отдельном терминале запустите Ollama
ollama serve

# В другом терминале скачайте нужные модели
ollama pull mistral:latest
ollama pull minicpm-v4.6:1b
```

### 5. Запуск проекта

**Вариант 1: Автоматически через скрипт (рекомендуется)**
```bash
chmod +x run.sh
./run.sh
```

**Вариант 2: Вручную**

Откройте **два терминала**:

```bash
# Терминал 1: Backend
cd backend
source venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

```bash
# Терминал 2: Frontend
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Затем откройте **http://127.0.0.1:5173** в браузере.

---

## 📂 Структура проекта

```
Chat-site-with-LLM/
├── backend/                    # FastAPI backend
│   ├── main.py                # Основной FastAPI app
│   ├── ollama.py              # Логика работы с Ollama
│   ├── requirements.txt        # Python зависимости
│   ├── venv/                  # Виртуальное окружение
│   └── .gitignore
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── App.jsx            # Главный компонент
│   │   ├── App.css            # Стили (фирменный дизайн)
│   │   ├── main.jsx           # Точка входа
│   │   ├── api/               # Учебный слой для работы с backend
│   │   │   ├── index.jsx      # API функции и React-хук
│   │   │   └── ModelsConfig.jsx # Конфигурация моделей
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── .gitignore
│
├── ollama/                     # Docker Compose для Ollama (опционально)
│   ├── docker-compose.yml
│   └── Dockerfile
│
├── run.sh                      # Скрипт автозапуска всего
├── README.md
├── .gitignore
└── .env.example               # Пример переменных окружения
```

---

## 💬 Использование

### Интерфейс

1. **Выбор модели** — кнопки в верхней панели (`Быстрая` / `Думающая`)
2. **Написание сообщения** — поле ввода внизу
3. **Отправка** — кнопка стрелка ↑ или Enter
4. **Остановка ответа** — кнопка квадрат ■ (если ответ приходит слишком долго)
5. **Очистка истории** — кнопка "Очистить историю" (с подтверждением)

### Для разработчиков frontend

Если вы новичок и хотите создать **свой интерфейс**, используйте наш **учебный слой**:

```javascript
import { useChatClient } from './api'
import { MODELS } from './api/ModelsConfig'

export default function MyApp() {
  const { messages, loading, activeModel, setActiveModel, sendMessage, stopGeneration, clearHistory } = useChatClient()

  const handleSend = async () => {
    await sendMessage('Привет!')
  }

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}
      <button onClick={handleSend} disabled={loading}>Отправить</button>
      {loading && <button onClick={stopGeneration}>Остановить</button>}
    </div>
  )
}
```

### Конфигурация моделей

Отредактируйте [`frontend/src/api/ModelsConfig.jsx`](frontend/src/api/ModelsConfig.jsx):

```javascript
export const MODELS = {
  fast: {
    id: 'mistral:latest',
    label: 'Быстрая',
    description: 'Основная модель',
    thinkMode: false,
  },
  think: {
    id: 'minicpm-v4.6:1b',
    label: 'Думающая',
    description: 'Модель для размышления',
    thinkMode: true,
  },
}
```

---

## 🏗️ Архитектура

### Frontend → Backend поток

```
React App (UI)
    ↓
useChatClient() хук (логика)
    ↓
src/api/index.jsx (askStream, askOnce)
    ↓
FastAPI Backend
    ↓
ollama.py (работа с Ollama API)
    ↓
Ollama (локальный LLM)
```

### API Endpoints

| Метод | URL | Описание |
|-------|-----|---------|
| GET | `/ping` | Проверить доступность Ollama |
| GET | `/models` | Получить список доступных моделей |
| POST | `/chat` | Отправить сообщение (обычный ответ) |
| POST | `/chat/stream` | Отправить сообщение (стриминг) |

---

## 🛠️ Для разработчиков

### Команды

```bash
# Сборка frontend
cd frontend && npm run build

# Dev сервер frontend
cd frontend && npm run dev

# Linting frontend
cd frontend && npm run lint

# Backend с автоперезагрузкой
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
```

### Структура backend

- `main.py` — FastAPI приложение и CORS
- `ollama.py` — функции для работы с Ollama API:
  - `ping_ollama()` — проверка доступности
  - `list_models()` — получить модели
  - `chat_ollama()` — обычный ответ
  - `chat_ollama_stream()` — стриминг ответа

### Переменные окружения

Создайте `.env` файл в папке `backend/`:

```env
# Backend
OLLAMA_URL=http://localhost:11434
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🐛 Troubleshooting

### "Не удалось подключиться к Ollama"
- Убедитесь, что Ollama запущена: `ollama serve`
- Проверьте адрес: `curl http://127.0.0.1:11434/api/tags`

### "Модель не найдена"
- Скачайте модель: `ollama pull mistral:latest`
- Обновите `frontend/src/api/ModelsConfig.jsx` с правильным ID модели

### Frontend не обновляется
- Очистите кэш: `rm -rf frontend/node_modules && npm install`
- Перезагрузите браузер: Ctrl+Shift+R

### Backend отваливается
- Проверьте логи: смотрите вывод консоли
- Убедитесь, что порт 8000 свободен: `lsof -i :8000`

---

## 📄 Лицензия

Проект разработан командой Backspace для Кванториума.

---

## 🤝 Контрибьютинг

Если вы студент Кванториума и хотите улучшить интерфейс:

1. Создайте ветку: `git checkout -b feature/my-feature`
2. Сделайте коммит: `git commit -am 'Добавил фичу'`
3. Запушьте: `git push origin feature/my-feature`
4. Откройте Pull Request

---

## ❓ Часто задаваемые вопросы

**Q: Можно ли запустить несколько моделей одновременно?**  
A: Да! Отредактируйте `ModelsConfig.jsx`, добавив новые модели. UI автоматически их подхватит.

**Q: Зачем мне нужен backend, если есть Ollama?**  
A: Backend добавляет CORS, управляет моделями, обеспечивает стриминг. Это изолирует frontend от прямой работы с Ollama.

**Q: Как сделать свой интерфейс?**  
A: Используйте `useChatClient()` хук из `src/api/index.jsx`. Это всё, что нужно для чата!

---

**Версия:** 1.0.0  
**Последнее обновление:** 2026-06-10
