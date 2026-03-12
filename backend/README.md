# Rule24 Backend

FastAPI backend for Rule24 MVP.

## Quick start

1. Create and activate a virtual environment.
2. Install dependencies:
   `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and set your values.
4. Run the app:
   `uvicorn main:app --reload --port 8000`

## Migrations

Generate a migration:
`alembic revision --autogenerate -m "init"`

Apply migrations:
`alembic upgrade head`

Seed test therapist:
`python scripts/seed_test_user.py`

## YooKassa MVP notes

- Default cancellation window is 24 hours (configurable per user rule).
- Late cancellation charge amount is derived from `session.price`.
- Sessions are cancelled, not physically deleted.
- Repeated cancel calls are idempotent-safe and return conflict for already cancelled sessions.
- Repeated penalty-charge requests for the same session are idempotent.
- Duplicate transactions for one session penalty flow are prevented.
- Webhook processing is deduplicated by provider event identity.
- Only safe payment references are stored (`payment_method_id`, `card_last4`, `card_brand`).
- Without YooKassa credentials, payment endpoints return controlled errors for local negative testing.
- Real end-to-end payment verification requires real YooKassa credentials and a public webhook URL/tunnel.
