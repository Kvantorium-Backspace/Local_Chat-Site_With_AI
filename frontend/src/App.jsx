import { useState, useRef, useEffect } from "react"
import "./App.css"

// ─── Настройки моделей ───────────────────────────────────────────────
const MODELS = {
  fast: {
    id: "qwen2.5:7b",
    label: "Быстрая",
    description: "qwen2.5:7b — отвечает моментально",
    thinkMode: false
  },
  code: {
    id: "qwen2.5-coder:14b",
    label: "Для кода",
    description: "qwen2.5-coder:14b — заточена под написание кода",
    thinkMode: true
  },
}


// ─── Загрузка системного промпта из файла ────────────────────────────
// Файл лежит в frontend/public/system_prompt.txt
async function loadSystemPrompt() {
  try {
    const res = await fetch("/system_prompt.txt")
    if (!res.ok) throw new Error("Файл не найден")
    return await res.text()
  } catch {
    return "Ты полезный ИИ-ассистент Кванториума. Отвечай на русском языке, кратко и по делу."
  }
}

// ─── Компонент одного сообщения ───────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === "user"

  let mainContent = msg.content

  return (
    <div className={`message ${isUser ? "message--user" : "message--bot"}`}>
      {/* Аватар */}
      <div className="message__avatar">
        {isUser ? "Вы" : "LLM"}
      </div>

      <div className="message__body">
        {/* Основной текст ответа */}
        <div className="message__text">
          {mainContent || "..."}
        </div>
      </div>
    </div>
  )
}

// ─── Индикатор "модель думает..." ─────────────────────────────────────
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

// ─── Компонент поля ввода с авто-высотой ─────────────────────────────────
function AutoResizeTextarea({ value, onChange, onKeyDown, placeholder, disabled }) {
  const textareaRef = useRef(null);

  // Функция для автоматической подстройки высоты
  const adjustHeight = () => {
    if (textareaRef.current) {
      // Сначала сбрасываем высоту, чтобы получить правильную scrollHeight
      textareaRef.current.style.height = 'auto';
      // Устанавливаем высоту, но не более максимальной (6 строк ~ 140px)
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Срабатывает при каждом изменении значения
  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Также на всякий случай корректируем при монтировании
  useEffect(() => {
    adjustHeight();
    // Добавляем обработчик события input на случай, если что-то пойдет не так
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('input', adjustHeight);
      return () => textarea.removeEventListener('input', adjustHeight);
    }
  }, []);

  return (
    <textarea
      ref={textareaRef}
      className="input-bar__field"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1} // Ставим 1 строку, но height будет меняться через JS
      disabled={disabled}
      style={{ overflowY: 'hidden' }} // Скрываем скролл, пока не достигнут лимит
    />
  );
}

// ─── Главный компонент ────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState("")
  const [loading, setLoading]         = useState(false)
  const [activeModel, setActiveModel] = useState("fast")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [showConfirm, setShowConfirm] = useState(false);

  const bottomRef = useRef(null)

  // Загружаем системный промпт при старте
  useEffect(() => {
    loadSystemPrompt().then(setSystemPrompt)
  }, [])

  // Авто-скролл вниз при каждом новом сообщении
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ─── Очистка истории ─────────────────────────────────────────────
  function confirmClearHistory() {
    setShowConfirm(true);
  }

  function clearHistory() {
    setMessages([]);
    setShowConfirm(false);
  }

  // ─── Отправка сообщения ─────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = { role: "user", content: input.trim() }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/ollama/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELS[activeModel].id,
          // Системный промпт задаёт «личность» модели
          // Вся история передаётся каждый раз — LLM не помнит прошлого сама
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
      setMessages(prev => [...prev, botMsg])

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Ошибка! Не могу соединиться с Ollama." },
      ])
      console.error(err)
    } finally {
      setLoading(false)
    }
    console.log(messages)
  }

  // Enter — отправить, Shift+Enter — перенос строки
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─── Рендер ─────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* Фоновая сетка */}
      <div className="bg-grid" aria-hidden="true" />

      {/* ── Шапка ── */}
      <header className="header">

        {/* Логотип + название */}
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

        {/* Переключатель модели */}

        <div className="btn-container">

          <button 
            className="delete-history-btn" 
            onClick={confirmClearHistory}
            title="Очистить историю сообщений"
          >
            Очистить историю
          </button>

          {/* Модальное окно подтверждения */}
          {showConfirm && (
            <div className="delete-confirm-overlay" onClick={() => setShowConfirm(false)}>
              <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                <h3>🗑️ Очистить историю?</h3>
                <p>Все сообщения будут удалены без возможности восстановления.</p>
                <div className="delete-confirm-buttons">
                  <button onClick={clearHistory}>Да, очистить</button>
                  <button onClick={() => setShowConfirm(false)}>Отмена</button>
                </div>
              </div>
            </div>
          )}

          <div className="model-switcher">
            {Object.entries(MODELS).map(([key, model]) => (
              <button
                key={key}
                className={`model-btn ${activeModel === key ? "model-btn--active" : ""}`}
                onClick={() => setActiveModel(key)}
                title={model.description}
              >
                {/* {key === "think" && <span className="model-btn__icon">🧠</span>} */}
                {key === "code"  && <span className="model-btn__icon">🖥️</span>}
                {key === "fast"  && <span className="model-btn__icon">⚡</span>}
                {model.label}
              </button>
            ))}
          </div>
        </div>

      </header>

      {/* ── Чат ── */}
      <main className="chat">

        {/* Пустой чат — приветствие */}
        {messages.length === 0 && !loading && (
          <div className="chat__empty">
            <span className="chat__empty-icon">
              ⚙️
              {/* <img
                src=""
                alt="Заглушка пустого чата"
                className="header__logo-img"
              /> */}
            </span>
            <p className="chat__empty-title">Локальная нейросеть Кванториума</p>
            <p className="chat__empty-sub">
              Модель: <strong>{MODELS[activeModel].label}</strong> ({MODELS[activeModel].id})
            </p>
            <p className="chat__empty-sub">Данные не покидают локальную сеть 🔒</p>
          </div>
        )}

        {/* Сообщения */}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {/* Анимированный индикатор ожидания */}
        {loading && <TypingIndicator />}

        {/* Якорь для авто-скролла */}
        <div ref={bottomRef} />
      </main>

      {/* ── Поле ввода (с авто-высотой) ── */}
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
          onClick={sendMessage}
          disabled={loading}
          aria-label="Отправить"
        >
          {loading ? "⏳" : "↑"}
        </button>
      </footer>

    </div>
  )
}