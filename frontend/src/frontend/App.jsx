// ─────────────────────────────────────────────────────────────────────────────
// App.jsx — все UI-компоненты чата
//
// Импортирует логику из Ollama.jsx и отвечает исключительно за отображение:
//   <Message />           — одно сообщение в чате
//   <TypingIndicator />   — анимация ожидания ответа
//   <AutoResizeTextarea />— поле ввода с авто-расширением по высоте
//   <App />               — корневой компонент, собирает всё вместе
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react"
import "./App.css"

// Вся логика работы с Ollama вынесена в отдельный модуль
import { useOllama } from "../ollama/Ollama"
import { MODELS } from "../ollama/ModelsConfig"

// ─── Компонент одного сообщения ───────────────────────────────────────────────
// Принимает msg: { role: "user" | "assistant", content: string }
function Message({ msg }) {
  const isUser = msg.role === "user"

  return (
    <div className={`message ${isUser ? "message--user" : "message--bot"}`}>

      {/* Аватар: «Вы» для пользователя, «LLM» для модели */}
      <div className="message__avatar">
        {isUser ? "Вы" : "LLM"}
      </div>

      <div className="message__body">
        {/* Текст сообщения; «...» пока контент ещё не пришёл */}
        <div className="message__text">
          {msg.content || "..."}
        </div>
      </div>

    </div>
  )
}

// ─── Индикатор «модель думает...» ─────────────────────────────────────────────
// Показывается во время ожидания ответа от Ollama
function TypingIndicator() {
  return (
    <div className="message message--bot">
      <div className="message__avatar">Q</div>
      <div className="message__body">
        <div className="typing">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}

// ─── Поле ввода с авто-подстройкой высоты ────────────────────────────────────
// Растягивается вверх по мере набора текста, но не выше 160px (≈6 строк).
function AutoResizeTextarea({ value, onChange, onKeyDown, placeholder, disabled }) {
  const textareaRef = useRef(null)

  // Пересчёт высоты: сначала сброс до auto, затем установка по scrollHeight
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }

  // Перемеряем при каждом изменении текста
  useEffect(() => {
    adjustHeight()
  }, [value])

  // При монтировании — первоначальный замер + подписка на нативное событие input
  useEffect(() => {
    adjustHeight()
    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener("input", adjustHeight)
      return () => textarea.removeEventListener("input", adjustHeight)
    }
  }, [])

  return (
    <textarea
      ref={textareaRef}
      className="input-bar__field"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      disabled={disabled}
      style={{ overflowY: "hidden" }} // Скролл скрыт, пока не достигнут лимит высоты
    />
  )
}

// ─── Корневой компонент приложения ────────────────────────────────────────────
export default function App() {
  // Состояние поля ввода — хранится здесь, т.к. относится только к UI
  const [input, setInput]           = useState("")
  // Флаг показа модального окна подтверждения очистки истории
  const [showConfirm, setShowConfirm] = useState(false)

  const bottomRef = useRef(null)

  // Подключаем хук с логикой Ollama
  const {
    messages,
    loading,
    activeModel,
    setActiveModel,
    sendMessage,
    clearHistory,
  } = useOllama()

  // Авто-скролл вниз при каждом новом сообщении или начале загрузки
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ─── Отправка сообщения ─────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput("") // Очищаем поле сразу, не дожидаясь ответа
    await sendMessage(text)
  }

  // Enter — отправить, Shift+Enter — перенос строки
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Подтверждение очистки истории ─────────────────────────────────────
  function handleClearConfirmed() {
    clearHistory()
    setShowConfirm(false)
  }

  // ─── Рендер ─────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* Фоновая декоративная сетка */}
      <div className="bg-grid" aria-hidden="true" />

      {/* ── Шапка ── */}
      <header className="header">

        {/* Логотип и название */}
        <div className="header__logo">
          <img
            src="/logo.png"
            alt="Логотип Кванториума"
            className="header__logo-img"
          />
          <div className="header__logo-text">
            <span className="header__logo-title">Локальная нейросеть Кванториума</span>
            <span className="header__logo-sub">Разработано командой Backspace</span>
          </div>
        </div>

        {/* Кнопки управления и переключатель модели */}
        <div className="btn-container">

          {/* Кнопка очистки истории */}
          <button
            className="delete-history-btn"
            onClick={() => setShowConfirm(true)}
            title="Очистить историю сообщений"
          >
            Очистить историю
          </button>

          {/* Модальное окно подтверждения очистки */}
          {showConfirm && (
            <div
              className="delete-confirm-overlay"
              onClick={() => setShowConfirm(false)} // Клик на фон закрывает модалку
            >
              <div
                className="delete-confirm-modal"
                onClick={e => e.stopPropagation()} // Клик внутри не закрывает
              >
                <h3>🗑️ Очистить историю?</h3>
                <p>Все сообщения будут удалены без возможности восстановления.</p>
                <div className="delete-confirm-buttons">
                  <button onClick={handleClearConfirmed}>Да, очистить</button>
                  <button onClick={() => setShowConfirm(false)}>Отмена</button>
                </div>
              </div>
            </div>
          )}

          {/* Переключатель модели */}
          <div className="model-switcher">
            {Object.entries(MODELS).map(([key, model]) => (
              <button
                key={key}
                className={`model-btn ${activeModel === key ? "model-btn--active" : ""}`}
                onClick={() => setActiveModel(key)}
                title={model.description}
              >
                {/* Иконки для быстрой визуальной идентификации модели */}
                {key === "think" && <span className="model-btn__icon">🖥️</span>}
                {key === "fast" && <span className="model-btn__icon">⚡</span>}
                {model.label}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* ── Область чата ── */}
      <main className="chat">

        {/* Заглушка при пустом чате */}
        {messages.length === 0 && !loading && (
          <div className="chat__empty">
            <span className="chat__empty-icon">⚙️</span>
            <p className="chat__empty-title">Локальная нейросеть Кванториума</p>
            <p className="chat__empty-sub">
              Модель: <strong>{MODELS[activeModel].label}</strong> ({MODELS[activeModel].id})
            </p>
            <p className="chat__empty-sub">Данные не покидают локальную сеть 🔒</p>
          </div>
        )}

        {/* Список сообщений */}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {/* Анимация ожидания ответа */}
        {loading && <TypingIndicator />}

        {/* Невидимый якорь для авто-скролла вниз */}
        <div ref={bottomRef} />

      </main>

      {/* ── Поле ввода ── */}
      <footer className="input-bar">
        <AutoResizeTextarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите запрос"
          disabled={loading}
        />
        <button
          className="input-bar__send"
          onClick={handleSend}
          disabled={loading}
          aria-label="Отправить"
        >
          {loading ? "⏳" : "↑"}
        </button>
      </footer>

    </div>
  )
}