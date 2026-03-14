# Rule24 — TASKS

## Phase 1 — Project bootstrap
- [x] Verify frontend runs locally
- [x] Install dependencies
- [x] Run Vite dev server
- [x] Clean up local project structure if needed
- [x] Add PROJECT_SPEC.md
- [x] Add TASKS.md

---

## Phase 2 — Backend foundation
- [x] Create backend folder
- [x] Initialize FastAPI project
- [x] Configure environment variables
- [x] Configure PostgreSQL connection
- [x] Add Alembic migrations
- [x] Add seed test user
- [x] Create basic app structure:
  - [x] api
  - [x] models
  - [x] schemas
  - [x] services
  - [x] db
  - [x] core

---

## Phase 3 — Core database models
- [x] Create User model
- [x] Create Client model
- [x] Create Session model
- [x] Create PaymentMethod model
- [x] Create CancellationRule model
- [x] Create Transaction model
- [x] Add timestamps and relations
- [x] Generate first migration

---

## Phase 4 — Authentication
- [x] Implement user registration
- [x] Implement user login
- [x] Implement JWT auth
- [x] Protect private API routes
- [x] Add current user endpoint

---

## Phase 5 — Client management
- [x] Create API to add client
- [x] Create API to list clients
- [x] Create API to update client
- [x] Create API to archive/delete client

---

## Phase 6 — Session management
- [x] Create API to create session
- [x] Create API to list sessions
- [x] Create API to update session
- [x] Create API to cancel session
- [x] Add session status logic
- [x] Add cancellation time comparison logic
- [x] Add therapist-confirmed outcome fields for past sessions
- [x] Add confirm-outcome endpoint
- [x] Add requires-attention endpoint for unresolved past sessions

Session model rules:
- use start_time as datetime
- use duration_minutes as integer
- do not store separate date/time fields
- do not store end_time in database for MVP
- sessions are cancelled, not deleted
- preserve full session history for billing and disputes
- cancel endpoint must be idempotent-safe (`Session already cancelled` on repeat)
- ensure session belongs to authenticated user
- ensure client belongs to same authenticated user
- keep session lifecycle status separate from therapist-confirmed real-world outcome
- outcome confirmation must not silently change payment or transaction state

---

## Phase 7 — Cancellation rules
- [x] Create default cancellation rule (24h)
- [x] Allow therapist to change cancellation rule
- [x] Attach rule to user account
- [x] Apply rule to session cancellation logic

---

## Phase 8 — YooKassa integration
- [x] Create YooKassa config module
- [x] Create secure card attachment flow
- [x] Save payment method reference
- [x] Implement penalty charge request
- [x] Implement webhook handler
- [x] Verify transaction status updates

Phase 8 architecture requirements:
- charge amount source for late cancellation is `session.price`
- prevent duplicate penalty charge for one session (idempotent behavior)
- prevent duplicate transaction creation for the same penalty flow
- ensure webhook idempotency / dedupe on repeated delivery
- never store raw card data, only safe provider references
- return graceful controlled errors when YooKassa credentials are missing

---

## Phase 9 — Frontend integration
- [x] Connect auth UI to backend
- [x] Connect clients page to backend
- [x] Connect sessions page to backend
- [x] Connect settings page to backend
- [x] Connect client payment page to backend
- [x] Connect transactions to UI
- [x] Add authenticated attention banner for unresolved past sessions
- [x] Add therapist outcome confirmation actions on Sessions page

---

## Phase 9.1 — Client payment link architecture
- [ ] Design client link entity
- [ ] Add public token-based client access
- [ ] Add client link lifecycle fields
- [ ] Create endpoint to generate client link
- [ ] Create public client payment page
- [ ] Connect card attachment flow through public link
- [ ] Persist link open/completion state

---

## Phase 10 — Subscription billing for Rule24
- [ ] Design subscription model
- [ ] Add subscription status to backend
- [ ] Add trial period logic
- [ ] Add next billing date logic
- [ ] Add cancel subscription logic
- [ ] Keep refunds manual for MVP

---

## Phase 11 — Deployment
- [ ] Prepare production env variables
- [ ] Configure VPS
- [ ] Configure Nginx
- [ ] Deploy PostgreSQL
- [ ] Deploy FastAPI backend
- [ ] Build frontend
- [ ] Serve frontend on domain
- [ ] Test full flow on production

---

## Phase 12 — MVP validation
- [ ] Test user registration
- [ ] Test create client
- [ ] Test create session
- [ ] Test client card attachment
- [ ] Test late cancellation charge
- [ ] Test subscription cancel flow
- [ ] Test webhook processing
- [ ] Fix critical bugs

---

## Rules for execution
- Always complete tasks in order.
- Do not skip layers.
- Do not add extra frameworks unless explicitly approved.
- Do not redesign frontend unless required for backend integration.
- Keep solutions simple and MVP-first.

---

## QA / Проверка после фаз

После завершения каждой фазы, начиная с Phase 8, выполняется обязательная ручная проверка.

### Phase 8 — Проверка платежей
- создание платежа
- получение webhook
- корректная запись транзакции в БД
- обработка успешного и неуспешного платежа
- negative test без YooKassa credentials (controlled error)
- идемпотентность penalty-charge (повторный запрос не создает дубль списания)
- dedupe повторного webhook (без повторного side effect)
- проверка, что сумма списания берется из `session.price`, а не из фиксированного `penalty_amount`

### Phase 9 — Проверка фронта
- отправка форм
- получение данных из API
- отображение ошибок
- авторизация пользователя
- баннер attention для прошедших сессий без подтвержденного итога
- подтверждение исхода сессии без поломки create/edit/cancel flow

### Phase 10 — Проверка подписок
- создание подписки
- продление
- отмена
- проверка статуса доступа

### Phase 11 — Проверка production
- запуск на VPS
- работа nginx
- env переменные
- доступность API и сайта

### Phase 12 — Финальная проверка MVP
- полный пользовательский сценарий
- регистрация
- оплата
- получение доступа
- отмена
- проверка всех edge-кейсов
