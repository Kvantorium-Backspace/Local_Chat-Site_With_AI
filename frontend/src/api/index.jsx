// ─────────────────────────────────────────────────────────────────────────────
// frontend/src/api/index.jsx
//
// Это слой общения с backend и Ollama.
// Здесь находятся:
//   - askOnce(...)      — получить ответ целиком
//   - askStream(...)    — получить ответ по мере генерации
//   - useChatClient()   — React-хук с историей, моделью и остановкой ответа
//
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { MODELS } from './ModelsConfig'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// ─── 1) Полный ответ целиком ───────────────────────────────────────────────
// Используйте эту функцию, если вам нужен стандартный ответ без живой печати.
// Возвращает объект вида:
//   {
//     status: true,
//     message: 'Ответ получен',
//     response: 'Текст ответа модели'
//   }

export async function askOnce(messages, model) {
  const response = await fetch(buildUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  })

  if (!response.ok) {
    throw new Error('Backend вернул ошибку при запросе ответа целиком')
  }

  return response.json()
}

// ─── 2) Стриминг ответа ───────────────────────────────────────────────────
// Используйте эту функцию, если нужен живой ответ в реальном времени.
// Параметры:
//   messages — список сообщений вида [{ role: 'user', content: '...' }]
//   model    — имя модели, например 'llama3.2'
//   onChunk  — callback, который получит куски текста по мере прихода
//
// Возвращает объект:
//   {
//     cancel: () => void,   // останавливает стриминг
//     promise: Promise<void>
//   }
//
// Пример:
//   const stream = askStream(messages, 'llama3.2', chunk => {
//     console.log('кусок:', chunk)
//   })
//   await stream.promise
//   // если захотите остановить до конца:
//   // stream.cancel()

export function askStream(messages, model, onChunk) {
  const controller = new AbortController()

  const promise = (async () => {
    const response = await fetch(buildUrl('/chat/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('Backend вернул ошибку при стриминге ответа')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Поток ответа недоступен')
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue

          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          try {
            const json = JSON.parse(payload)
            const chunk = json.response || json.message?.content || ''
            if (chunk) onChunk(chunk)
          } catch (error) {
            console.warn('Не удалось разобрать кусок стрима:', error)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  })()

  return {
    cancel: () => controller.abort(),
    promise,
  }
}

// ─── React-хук для UI ─────────────────────────────────────────────────────
// Этот хук полностью скрывает техническую часть: fetch, AbortController,
// стриминг, состояние сообщений и выбор модели.
//
// Внутри него:
//   - загружаются модели;
//   - отправляется запрос;
//   - ответ приходит по стриму;
//   - можно остановить генерацию.
//
// UI-компоненту достаточно вызвать:
//   const { messages, loading, activeModel, setActiveModel, sendMessage, stopGeneration } = useChatClient()

export function useChatClient() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeModel, setActiveModel] = useState('fast')
  const streamRef = useRef(null)

  function getCurrentModelId() {
    return MODELS[activeModel]?.id
  }

  async function sendMessage(input) {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMessage]

    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    // Создаём пустое сообщение ассистента.
    // Оно будет заполняться чанками в реальном времени.
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const stream = askStream(nextMessages, getCurrentModelId(), (chunk) => {
        setMessages(prev => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = {
              ...last,
              content: (last.content || '') + chunk,
            }
          }
          return copy
        })
      })

      streamRef.current = stream
      await stream.promise
    } catch (error) {
      // Если пользователь нажал отмену, не перезаписываем текст.
      // Оставляем уже полученный ответ как есть.
      if (error?.name === 'AbortError') {
        return
      }

      console.error('Ошибка при обращении к backend:', error)
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: '⚠️ Не удалось получить ответ от Ollama. Проверьте backend и модель.',
        }
        return copy
      })
    } finally {
      setLoading(false)
      streamRef.current = null
    }
  }

  function stopGeneration() {
    streamRef.current?.cancel()
  }

  function clearHistory() {
    setMessages([])
  }

  return {
    messages,
    loading,
    activeModel,
    setActiveModel,
    sendMessage,
    stopGeneration,
    clearHistory,
  }
}
