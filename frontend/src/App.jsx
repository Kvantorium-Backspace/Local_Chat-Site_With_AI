import { useEffect, useRef, useState } from 'react'
import './App.css'

import { useChatClient } from './api/index'
import { MODELS } from './api/ModelsConfig'
import logo from "./assets/logo.png"

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--bot'}`}>
      <div className="message__avatar">{isUser ? 'Вы' : 'LLM'}</div>
      <div className="message__body">
        <div className="message__text">{msg.content || '...'}</div>
      </div>
    </div>
  )
}

function AutoResizeTextarea({ value, onChange, onKeyDown, placeholder, disabled }) {
  const textareaRef = useRef(null)

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 160)
      textareaRef.current.style.height = `${nextHeight}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  useEffect(() => {
    adjustHeight()
    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('input', adjustHeight)
      return () => textarea.removeEventListener('input', adjustHeight)
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
      style={{ overflowY: 'hidden' }}
    />
  )
}

export default function App() {
  const [input, setInput] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const bottomRef = useRef(null)

  const { messages, loading, activeModel, setActiveModel, sendMessage, stopGeneration, clearHistory } = useChatClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleClearConfirmed() {
    clearHistory()
    setShowConfirm(false)
  }

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden="true" />

      <header className="header">
        <div className="header__logo">
          <div className="header__logo-mark">
            <img className="header__logo-image" src={logo} alt='Лого'/>
          </div>
          <div className="header__logo-text">
            <span className="header__logo-title">Локальная нейросеть Кванториума</span>
            <span className="header__logo-sub">Разработано командой Backspace</span>
          </div>
        </div>

        <div className="btn-container">
          <button
            className="delete-history-btn"
            onClick={() => setShowConfirm(true)}
            title="Очистить историю сообщений"
          >
            Очистить историю
          </button>

          {showConfirm && (
            <div className="delete-confirm-overlay" onClick={() => setShowConfirm(false)}>
              <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                <h3>🗑️ Очистить историю?</h3>
                <p>Все сообщения будут удалены без возможности восстановления.</p>
                <div className="delete-confirm-buttons">
                  <button onClick={handleClearConfirmed}>Да, очистить</button>
                  <button onClick={() => setShowConfirm(false)}>Отмена</button>
                </div>
              </div>
            </div>
          )}

          <div className="model-switcher">
            {Object.entries(MODELS).map(([key, model]) => (
              <button
                key={key}
                className={`model-btn ${activeModel === key ? 'model-btn--active' : ''}`}
                onClick={() => setActiveModel(key)}
                title={model.description}
              >
                {key === 'think'}
                {key === 'fast'}
                {model.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="chat">
        {messages.length === 0 && !loading && (
          <div className="chat__empty">
            <span className="chat__empty-icon">⚙️</span>
            <p className="chat__empty-title">Локальная нейросеть Кванториума</p>
            <p className="chat__empty-sub">
              Модель: <strong>{MODELS[activeModel]?.label}</strong> ({MODELS[activeModel]?.id})
            </p>
            <p className="chat__empty-sub">Данные не покидают локальную сеть 🔒</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <Message key={`${msg.role}-${index}`} msg={msg} />
        ))}

        <div ref={bottomRef} />
      </main>

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
          disabled={loading || !input.trim()}
          aria-label="Отправить"
          title="Отправить сообщение"
        >
          ↑
        </button>

        {loading && (
          <button
            className="input-bar__stop"
            onClick={stopGeneration}
            aria-label="Остановить ответ"
            title="Остановить генерацию ответа"
          >
            ■
          </button>
        )}
      </footer>
    </div>
  )
}
