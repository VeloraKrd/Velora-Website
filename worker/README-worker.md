# Velora — Cloudflare Worker для заявок

Worker принимает заявки из конфигуратора и пересылает их в Telegram, **не раскрывая
токен бота на сайте**. Пока Worker не подключён, конфигуратор отправляет заявки
старым способом (через `sendLead` в `index.html`) — всё работает и без Worker.

## Что нужно
- Аккаунт Cloudflare (бесплатного плана достаточно).
- Node.js на компьютере.
- Токен Telegram-бота и chat_id (те же, что уже используются на сайте).

## Развёртывание (5 минут)

```bash
cd worker
npm install -g wrangler        # если ещё не установлен
wrangler login                 # откроется браузер, подтвердите доступ

# Задать секреты (значения НЕ хранятся в коде):
wrangler secret put TG_BOT_TOKEN   # вставьте токен бота
wrangler secret put TG_CHAT_ID     # вставьте chat_id

wrangler deploy                # опубликует Worker
```

После `deploy` вы получите адрес вида:
`https://velora-lead.ВАШ-САБДОМЕН.workers.dev`

## Подключение к сайту

В `index.html` найдите закомментированную строку рядом с подключением конфигуратора
и раскомментируйте её, вставив адрес Worker:

```html
<script>window.VELORA_LEAD_ENDPOINT = 'https://velora-lead.ВАШ-САБДОМЕН.workers.dev';</script>
```

После этого заявки из конфигуратора пойдут через Worker. Рекомендуется затем
**убрать токен бота** из `index.html` (переменная `TG_BOT_TOKEN`) — он больше не нужен на клиенте.

## Необходимые секреты
| Секрет | Значение |
|--------|----------|
| `TG_BOT_TOKEN` | токен Telegram-бота (`8649…`) |
| `TG_CHAT_ID`   | chat_id получателя (`1302852985`) |

## Проверка

```bash
curl -X POST https://velora-lead.ВАШ-САБДОМЕН.workers.dev \
  -H 'Content-Type: application/json' \
  -d '{"source":"Тест","fields":{"Имя":"Проверка","Телефон":"+7 (999) 111-22-33"}}'
```
Ответ `{"ok":true}` и сообщение в Telegram означают, что всё работает.
