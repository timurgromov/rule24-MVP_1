# Rule24 — PROJECT_SPEC

## 1. Product Overview

Rule24 is a micro-SaaS for private psychologists.

Its purpose is to protect therapist income by enforcing a late cancellation rule.

Core business idea:
- the therapist creates a session
- the client opens a secure payment page
- the client attaches a card
- default cancellation window is 24 hours
- if the session is cancelled less than 24 hours before start, the system automatically charges full `session.price`

The product is not a CRM and not a calendar platform.
It is a focused payment-discipline tool.

---

## 2. MVP Scope

The MVP must include only the following core flows:

1. Therapist account
2. Client management
3. Session creation
4. Client payment page
5. Card attachment
6. Cancellation rule enforcement
7. Automatic charge after late cancellation
8. Therapist subscription plan UI
9. Basic transaction records

Do not add unnecessary enterprise features.

---

## 3. Technology Stack

### Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui

Frontend is already generated and should remain unchanged unless strictly necessary.

### Backend
- Python
- FastAPI

### Database
- PostgreSQL

Important:
We use our own PostgreSQL database on our own VPS.
We are not using Supabase in this architecture.

### Payments
- YooKassa API

### Deployment
- VPS
- Nginx
- FastAPI backend
- PostgreSQL database
- Frontend built with Vite

---

## 4. Architecture Principle

This project uses a simple architecture:

Frontend:
- React + Vite SPA

Backend:
- FastAPI REST API

Database:
- PostgreSQL

Payments:
- YooKassa integration

The backend and database will be hosted on our own VPS.

No Lovable Cloud.
No Supabase.
No Firebase.
No unnecessary third-party backend platforms.

---

## 5. Core Business Entities

The system must be built around these entities:

### User
Therapist account.

Fields:
- id
- email
- password_hash
- name
- created_at

### Client
A therapist’s client.

Fields:
- id
- user_id
- name
- email
- phone
- created_at

### PaymentMethod
A saved client payment method.

Fields:
- id
- client_id
- yookassa_payment_method_id
- card_last4
- card_brand
- created_at

Important:
Card details are not stored by us.
Only YooKassa payment method references are stored.

### Session
A scheduled therapy session.

Fields:
- id
- user_id
- client_id
- start_time
- duration_minutes
- price
- status
- outcome_confirmed
- outcome_type
- notes
- created_at
- updated_at

Allowed statuses:
- scheduled
- completed
- cancelled

Important:
- sessions are cancelled, not physically deleted, in normal product flow
- session history must be preserved for billing, cancellation logic, and disputes
- `status` stores operational lifecycle of the calendar entry
- `outcome_type` stores therapist-confirmed real-world outcome
- session outcome and transaction result are different concepts and must remain separate

### CancellationRule
Therapist cancellation policy.

Fields:
- id
- user_id
- hours_before
- penalty_amount (legacy/backward compatibility only; not primary charge source)
- created_at

Default rule:
- 24 hours

Business rule:
- late cancellation is defined as less than `hours_before` before session start
- charge amount source is always `session.price` (full session price)

### Transaction
A money movement related to a session penalty or payment.

Fields:
- id
- session_id
- client_id
- amount
- status
- yookassa_payment_id
- created_at

Allowed statuses:
- pending
- paid
- failed
- refunded

### Subscription
The therapist’s own Rule24 plan.

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

## 6. Core Product Logic

### Session Flow
1. Therapist creates a session.
2. System generates a client payment link.
3. Client opens the payment page.
4. Client reads the cancellation rule and consents.
5. Client attaches a card.
6. Session becomes protected by the cancellation rule.

### Cancellation Flow
1. Client cancels a session.
2. Backend checks how many hours remain.
3. If cancellation is earlier than the allowed window:
   - session status becomes cancelled
   - no penalty
4. If cancellation is later than the allowed window:
   - session status becomes cancelled
   - create transaction
   - amount is equal to full `session.price`
   - initiate charge through YooKassa
   - wait for webhook
   - mark transaction as paid or failed

### Outcome Confirmation Flow
1. A past session can require therapist confirmation of the real-world outcome.
2. The therapist confirms one of:
   - completed
   - late_cancellation
   - no_show
3. Confirmation sets:
   - `outcome_confirmed = true`
   - `outcome_type = chosen outcome`
4. Confirming outcome does not silently modify transactions.
5. Session outcome answers what happened in reality.
6. Transaction status answers what happened with money.

Idempotency requirements:
- cancel endpoint is idempotent-safe: repeated cancellation returns conflict and does not run business logic twice
- no duplicate penalty charge for the same session
- no duplicate transaction records for one session penalty flow
- repeated webhook events must not create duplicate side effects
- webhook dedupe is based on provider event identity and existing transaction/payment linkage

### Therapist Subscription Flow
1. Therapist has a trial period.
2. After trial, therapist pays for Rule24 subscription.
3. Subscription renewal and cancellation are separate from client session charges.

Important:
Client payments and therapist subscription payments are two different money flows and must never be mixed.

---

## 7. Money Flow Separation

There are two separate billing domains:

### Domain A — Client session payments
Money charged from therapist’s client due to session rules.

### Domain B — Rule24 subscription billing
Money charged from therapist for using Rule24.

These must remain separate in both database design and backend services.

Do not mix them in one generic payment system.

---

## Client payment link architecture

This is a core Rule24 product object and an architectural gap in the current backend.

Important:
- the Rule24 client link is not the same as YooKassa `confirmation_url`
- the client link must be a separate backend entity
- the client link is the public entry point for the client into the Rule24 flow
- this flow must work without therapist JWT

Current state:
- demo previously showed this as a visual placeholder
- backend currently has no dedicated server-side client link entity or lifecycle model
- implementation must be additive and MVP-safe

Entity purpose:
- connect therapist session/client to a public client-facing setup flow

Minimum fields:
- id
- session_id
- client_id
- public_token (or slug)
- status
- created_at
- opened_at
- completed_at
- expired_at

Suggested statuses:
- created
- opened
- completed
- expired

Lifecycle:
1. Therapist generates link.
2. Client opens link.
3. Client sees session/payment context.
4. Client confirms setup and attaches card.
5. System marks link completion.

Semantic rule:
- Rule24 client link = product-level public flow object
- YooKassa `confirmation_url` = external provider redirect inside that flow
- these objects must never be treated as the same thing

---

## 8. Backend Requirements

The backend must include:

- authentication
- clients CRUD
- sessions CRUD
- cancellation logic
- YooKassa integration
- webhook endpoint
- subscription status logic

Recommended backend structure:

```text
backend/
  api/
  models/
  schemas/
  services/
  db/
  webhooks/
  core/
  main.py
```

---

## 9. YooKassa Rules

YooKassa integration must not be modeled as a simple boolean like connected = true.

It should be treated as a real integration state.

At minimum, backend must support:
- provider credentials
- integration status
- recurring payment capability
- webhook handling

Do not oversimplify payment provider state.

Verification notes:
- attach-card and penalty-charge real flow requires real YooKassa credentials
- full webhook verification requires a public callback URL (or tunnel) reachable by YooKassa
- local negative scenario without credentials (controlled error) is valid, but does not prove real payment processing end-to-end

---

## 10. Database Migrations

We use:
- SQLAlchemy
- Alembic

Tables must be created through migrations.

Do not manually create database tables outside migrations.

---

## 11. Development Rules for Cursor

Important rules:
- Do not change the frontend stack.
- Do not replace Vite with Next.js.
- Do not replace FastAPI with another backend framework.
- Do not introduce unnecessary libraries or heavy abstractions.
- Keep everything simple and MVP-first.
- Do not redesign the frontend unless strictly required for backend integration.
- Prefer explicit and readable code over clever abstractions.
- Do not introduce microservices.

---

## 12. MVP Priorities

Priority order:
1. Backend foundation
2. Database models
3. Authentication
4. Client management
5. Session creation
6. YooKassa card attachment flow
7. Cancellation charge flow
8. Webhooks
9. Subscription status logic

Anything outside this list is secondary.

---

## 13. Non-Goals for MVP

Do not build now:
- full CRM features
- advanced analytics
- help center
- Telegram bot as core product
- complex tariff system
- automatic refund logic
- multi-tenant enterprise logic
- multi-provider payment abstraction

This is a focused micro-SaaS MVP.
