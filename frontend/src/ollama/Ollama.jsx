// ─────────────────────────────────────────────────────────────────────────────
// useOllama.js — вся логика взаимодействия с Ollama API
//
// Экспортирует:
//   MODELS        — конфигурация доступных моделей
//   loadSystemPrompt() — загружает системный промпт из /public/system_prompt.txt
//   useOllama()   — React-хук с состоянием чата и функцией отправки сообщений
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import { MODELS } from "./ModelsConfig"



// ─── Загрузка системного промпта из файла ────────────────────────────────────
// Файл должен лежать в frontend/public/system_prompt.txt
// Если файл не найден — используется запасной промпт по умолчанию
export async function loadSystemPrompt() {
  try {
    const res = await fetch("/system_prompt.txt")
    if (!res.ok) throw new Error("Файл не найден")
    return await res.text()
  } catch {
    // Запасной вариант, если файл недоступен
    return "Ты полезный ИИ-ассистент Кванториума. Отвечай на русском языке, кратко и по делу."
  }
}

// ─── Хук useOllama ───────────────────────────────────────────────────────────
// Инкапсулирует всё состояние чата и сетевые запросы к Ollama.
//
// Возвращает:
//   messages      — массив сообщений [{role, content}, ...]
//   loading       — true, пока ожидается ответ модели
//   activeModel   — ключ текущей модели из MODELS
//   setActiveModel— смена активной модели
//   systemPrompt  — загруженный системный промпт
//   sendMessage(input) — отправить сообщение и получить ответ
//   clearHistory() — сбросить всю историю сообщений
export function useOllama() {
  const [messages, setMessages]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [activeModel, setActiveModel]   = useState("fast")
  const [systemPrompt, setSystemPrompt] = useState("")

  // Загружаем системный промпт один раз при монтировании
  useEffect(() => {
    loadSystemPrompt().then(setSystemPrompt)
  }, [])

  // ─── Отправка сообщения пользователя ─────────────────────────────────────
  // Добавляет сообщение в историю, делает запрос к Ollama и записывает ответ.
  // При ошибке добавляет сообщение об ошибке вместо ответа модели.
  async function sendMessage(input) {
    if (!input.trim() || loading) return

    const userMsg = { role: "user", content: input.trim() }

    // Сразу отображаем сообщение пользователя
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await fetch("/ollama/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELS[activeModel].id,
          // Системный промпт задаёт «личность» и контекст модели.
          // Вся история передаётся при каждом запросе — LLM не хранит
          // контекст самостоятельно между запросами.
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            userMsg,
          ],
          stream: false,
          think: MODELS[activeModel].thinkMode,
        }),
      })

      const data = await response.json()
      const botMsg = { role: "assistant", content: data.message.content }

      // Добавляем ответ модели в историю
      setMessages(prev => [...prev, botMsg])

    } catch (err) {
      // Если запрос не удался — показываем сообщение об ошибке
      console.error("Ошибка при обращении к Ollama:", err)
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Ошибка! Не могу соединиться с Ollama." },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ─── Очистка истории сообщений ────────────────────────────────────────────
  function clearHistory() {
    setMessages([])
  }

  return {
    messages,
    loading,
    activeModel,
    setActiveModel,
    systemPrompt,
    sendMessage,
    clearHistory,
  }
}