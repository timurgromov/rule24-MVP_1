# Rule24 — Backend Architecture

## 1. Core Database Tables

### users
Therapists using Rule24.

Fields:
- id
- email
- password_hash
- name
- created_at
- subscription_status
- subscription_until

Purpose:
- therapist account
- access to system
- subscription state

---

### clients
Therapist clients.

Fields:
- id
- user_id
- name
- email
- phone
- notes
- created_at

Relation:
- client belongs to therapist

---

### payment_methods
Saved client payment methods.

Fields:
- id
- client_id
- yookassa_payment_method_id
- card_last4
- card_brand
- created_at

Important:
- actual card data is stored by YooKassa
- we only store payment method reference

---

### sessions
Scheduled therapy sessions.

Fields:
- id
- user_id
- client_id
- scheduled_at
- price
- status
- created_at

Allowed statuses:
- scheduled
- cancelled
- completed
- late_cancelled
- no_show
- paid

---

### cancellation_rules
Therapist cancellation rules.

Fields:
- id
- user_id
- hours_before
- penalty_amount

Example:
- 24 hours
- penalty = session price

---

### transactions
Money movements related to session penalties or charges.

Fields:
- id
- client_id
- session_id
- amount
- status
- yookassa_payment_id
- created_at

Allowed statuses:
- pending
- paid
- failed
- refunded

---

### subscriptions
Therapist subscription to Rule24.

Fields:
- id
- user_id
- plan
- status
- trial_until
- current_period_end
- created_at

Allowed statuses:
- trial
- active
- cancelled
- expired

---

### webhook_events
Stored YooKassa webhook events.

Fields:
- id
- event_id
- event_type
- payload_json
- created_at
- processed

Purpose:
- protect against duplicate webhook processing
- keep raw webhook log
- support idempotent payment updates

---

## 2. Entity Relations

users
  ├── clients
  │      ├── payment_methods
  │      └── sessions
  │             └── transactions
  ├── cancellation_rules
  └── subscriptions

---

## 3. Core Payment Principles

### Important Rule
Never trust the immediate response from YooKassa payment creation as final payment success.

Final payment status must be determined only through webhook events.

Correct flow:
1. create payment
2. save transaction as pending
3. wait for webhook
4. update transaction status

Incorrect flow:
- mark transaction as paid immediately after payment creation response

---

## 4. Idempotency

All penalty charge requests must use idempotence keys.

Example:

session_{session_id}_penalty

This prevents duplicate penalty charges if the same request is sent more than once.

---

## 5. Payment Metadata

Each YooKassa payment should include metadata for business mapping.

Example:

- session_id
- client_id
- user_id

This allows webhook handlers to map payment events back to business entities.

---

## 6. Late Cancellation Flow

Algorithm:

1. client cancels session
2. backend checks cancellation rule
3. if cancellation violates rule:
   - create transaction with status = pending
   - create YooKassa payment
4. wait for webhook
5. if webhook confirms success:
   - transaction.status = paid
   - session.status = late_cancelled

---

## 7. YooKassa Webhook Endpoint

Required endpoint:

POST /webhooks/yookassa

Handler responsibilities:
1. verify webhook authenticity
2. store webhook event in webhook_events
3. process business logic
4. update transactions and related sessions

---

## 8. Backend Folder Structure

Recommended structure:

backend/
  api/
    auth.py
    clients.py
    sessions.py
    payments.py

  models/
    user.py
    client.py
    session.py
    transaction.py
    payment_method.py
    subscription.py
    cancellation_rule.py
    webhook_event.py

  schemas/
  services/
    yookassa_service.py
    payment_service.py

  webhooks/
    yookassa_webhook.py

  db/
    base.py
    session.py

  core/
  main.py

---

## 9. MVP Constraints

Do not add now:
- Redis
- Kafka
- microservices
- event bus
- complex queues
- invoices table
- receipts table
- audit logs

For MVP, enough:
- FastAPI
- PostgreSQL
- YooKassa API
- webhook handling

---

## 10. Testing Checklist

Before production, verify:

1. create therapist
2. create client
3. create session
4. cancel session less than 24h before start
5. create pending transaction
6. receive YooKassa webhook
7. mark transaction as paid
8. verify session state update