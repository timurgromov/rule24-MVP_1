from fastapi import FastAPI

from api.auth import router as auth_router
from api.cancellation_rules import router as cancellation_rules_router
from api.clients import router as clients_router
from api.health import router as health_router
from api.payments import router as payments_router
from api.private import router as private_router
from api.sessions import router as sessions_router
from api.webhooks import router as webhooks_router
from core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(private_router, prefix=settings.api_prefix)
app.include_router(clients_router, prefix=settings.api_prefix)
app.include_router(sessions_router, prefix=settings.api_prefix)
app.include_router(cancellation_rules_router, prefix=settings.api_prefix)
app.include_router(payments_router, prefix=settings.api_prefix)
app.include_router(webhooks_router, prefix=settings.api_prefix)
