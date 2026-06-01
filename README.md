# 🧠 Локальная нейросеть Кванториума

> **Основана на** `ollama` (`qwen2.5`)  
> **Разработано командой** `Backspace`

---

## 🚀 Как запустить?

1. **Установите зависимости:**  
   `docker`, `npm`, `ollama`, `git`

2. **Склонируйте репозиторий:**  
   ```bash
   git clone https://github.com/Kvantorium-Backspace/Kvantorium_Local_LLM.git
   ```

3. **Запустите `run.sh`:**  
   ```bash
   ./run.sh
   ```

4. **Установите модели:**  
   ```bash
   sudo docker compose exec ollama ollama pull qwen2.5:7b
   sudo docker compose exec ollama ollama pull qwen2.5-coder:14b
   ```

---

## 🔮 Планы на будущее

- [ ] Сделать автоустановку зависимостей  
- [ ] Реализовать возможность выбора **любой** локальной LLM  
- [ ] Обернуть всё в сервис  
- [ ] Чилить... 🍹

---
