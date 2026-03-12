import base64
import json
import uuid
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from core.config import get_settings

YOOKASSA_API_BASE = "https://api.yookassa.ru/v3"


class YooKassaService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _auth_header(self) -> str:
        if not self.settings.yookassa_shop_id or not self.settings.yookassa_secret_key:
            raise ValueError("YooKassa credentials are not configured")

        raw = f"{self.settings.yookassa_shop_id}:{self.settings.yookassa_secret_key}".encode(
            "utf-8"
        )
        encoded = base64.b64encode(raw).decode("utf-8")
        return f"Basic {encoded}"

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        idempotence_key: str | None = None,
    ) -> dict[str, Any]:
        url = f"{YOOKASSA_API_BASE}{path}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None

        headers = {
            "Authorization": self._auth_header(),
            "Content-Type": "application/json",
        }
        if idempotence_key:
            headers["Idempotence-Key"] = idempotence_key

        request = Request(url=url, data=body, headers=headers, method=method)

        try:
            with urlopen(request, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            details = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"YooKassa request failed: {exc.code} {details}") from exc

    def create_payment(
        self,
        payload: dict[str, Any],
        idempotence_key: str | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/payments",
            payload=payload,
            idempotence_key=idempotence_key or str(uuid.uuid4()),
        )

    def get_payment(self, payment_id: str) -> dict[str, Any]:
        return self._request("GET", f"/payments/{payment_id}")
