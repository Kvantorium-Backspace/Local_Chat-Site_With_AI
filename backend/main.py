from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any

from ollama import ask_ollama, ping_ollama, list_models, chat_ollama, chat_ollama_stream

app = FastAPI()

# Настройка CORS для frontend запросов.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Простая модель запроса для старой точки /ask.
class AskRequest(BaseModel):
    prompt: str
    model: str


# Новая модель запроса для чата с историей.
class ChatRequest(BaseModel):
    model: str
    messages: List[Dict[str, Any]]


# Пинг Ollama.
@app.get("/ping")
def ping():
    return ping_ollama()


# Получение доступных моделей.
@app.get("/models")
def models():
    return list_models()


# Старый вариант ответа от Ollama.
@app.post("/ask")
def ask(request: AskRequest):
    return ask_ollama(prompt=request.prompt, model=request.model)


# Новый вариант с историей сообщений.
@app.post("/chat")
def chat(request: ChatRequest):
    return chat_ollama(messages=request.messages, model=request.model)


# Стриминговый вариант ответа.
@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    return StreamingResponse(
        chat_ollama_stream(messages=request.messages, model=request.model),
        media_type="text/event-stream",
    )
