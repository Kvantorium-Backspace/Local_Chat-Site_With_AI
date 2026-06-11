import json
import requests
from dotenv import load_dotenv
from os import getenv


load_dotenv()

def get_ollama_options():
    return {
        "num_ctx": int(getenv('OLLAMA_NUM_CTX', 4096)),
        "num_gpu": int(getenv('OLLAMA_NUM_GPU', 1)),
        "num_thread": int(getenv('OLLAMA_NUM_THREAD', 8)),
        "temperature": float(getenv('OLLAMA_TEMPERATURE', 0.7)),
        "top_p": float(getenv('OLLAMA_TOP_P', 0.9)),
        "top_k": int(getenv('OLLAMA_TOP_K', 40)),
        "repeat_penalty": float(getenv('OLLAMA_REPEAT_PENALTY', 1.1))
    }

OLLAMA_BASE_URL = getenv("OLLAMA_URL")

try:
    with open('../ollama/system-prompt.txt', 'r', encoding='utf-8') as file:
        systemPrompt = file.read()
except:
    systemPrompt = ""

# Проверка доступности Ollama.
# Используется для пинга из frontend.
def ping_ollama() -> dict:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return {
                "status": True,
                "message": f"Ollama доступна. status_code: {response.status_code}",
            }

        return {
            "status": False,
            "message": f"Ollama недоступна. status_code: {response.status_code}",
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": False,
            "message": f"Ошибка подключения к Ollama: {e}",
        }


# Получение списка моделей из Ollama.
# Нужен для выбора модели в интерфейсе.
def list_models() -> dict:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
        response.raise_for_status()

        payload = response.json()
        models = []

        for item in payload.get("models", []):
            name = item.get("name") or item.get("model")
            if name:
                models.append(name)

        return {
            "status": True,
            "message": "Список моделей получен",
            "models": models,
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": False,
            "message": f"Не удалось получить список моделей: {e}",
            "models": [],
        }


# Обычный запрос к Ollama.
# Возвращает готовый текст ответа.
def ask_ollama(prompt: str, model: str) -> dict:
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"prompt": [{ "role": 'system', "content": systemPrompt }, *prompt], "model": model, "stream": False},
            timeout=300,
        )

        if response.status_code == 200:
            result = response.json()
            return {
                "status": True,
                "message": f"Ответ получен. status_code: {response.status_code}",
                "response": result.get("response", ""),
            }

        return {
            "status": False,
            "message": f"Ошибка! status_code: {response.status_code}",
            "response": "",
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": False,
            "message": f"Ошибка подключения к Ollama: {e}",
            "response": "",
        }


# Запрос с историей сообщений через Ollama /api/chat.
# Это лучший вариант для поддержки истории в интерфейсе.
def chat_ollama(messages: list, model: str) -> dict:
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={"model": model, "messages": [{ "role": 'system', "content": systemPrompt }, *messages], "stream": False},
            timeout=300,
        )
        response.raise_for_status()

        result = response.json()
        answer = result.get("message", {}).get("content", "")

        return {
            "status": True,
            "message": "Ответ получен",
            "response": answer,
            "model": model,
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": False,
            "message": f"Ошибка подключения к Ollama: {e}",
            "response": "",
            "model": model,
        }


# Стриминговый ответ из Ollama.
# Генератор возвращает куски текста по одному.
def chat_ollama_stream(messages: list, model: str):
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": model, 
                "messages": [{ "role": 'system', "content": systemPrompt }, *messages], 
                "stream": True,
                "options": get_ollama_options()
            },
            stream=True,
            timeout=300,
        )
        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            try:
                payload = json.loads(line)
            except ValueError:
                continue

            message = payload.get("message", {})
            content = message.get("content", "") if isinstance(message, dict) else ""

            if content:
                yield f"data: {json.dumps({'response': content})}\n\n"
    except requests.exceptions.RequestException as e:
        yield f"data: {json.dumps({'response': f'Ошибка подключения к Ollama: {e}'})}\n\n"
