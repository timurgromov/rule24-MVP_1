import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, ApiError, SessionDto } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  const numericSessionId = useMemo(() => Number(sessionId), [sessionId]);

  useEffect(() => {
    if (!Number.isFinite(numericSessionId) || !getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getSession(numericSessionId)
      .then(setSession)
      .catch((err) => {
        const message = err instanceof ApiError ? err.detail : "Failed to load session";
        toast({ title: "Ошибка", description: message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [numericSessionId]);

  const initAttachment = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const result = await api.initCardAttachment(session.client_id);
      setConfirmationUrl(result.confirmation_url);
      toast({ title: "Платеж создан", description: `payment_id: ${result.payment_id}` });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Attach-card request failed";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!getAccessToken()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-medium">Нужна авторизация терапевта</p>
          <p className="text-sm text-muted-foreground">
            Этот MVP endpoint защищен и работает через backend авторизацию.
          </p>
          <Button onClick={() => navigate("/login")}>Перейти ко входу</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h1 className="font-semibold">Client payment page (MVP)</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Полный real YooKassa flow требует реальные credentials и публичный webhook URL.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Загрузка сессии...</div>
        ) : !session ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Сессия не найдена или недоступна.
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-sm">Session ID: {session.id}</p>
            <p className="text-sm">Client ID: {session.client_id}</p>
            <p className="text-sm">Start: {new Date(session.start_time).toLocaleString()}</p>
            <p className="text-sm font-medium">Price: {session.price} RUB</p>
            <p className="text-sm text-muted-foreground">
              Late cancellation charge source = full session.price.
            </p>
            <Button onClick={initAttachment} disabled={submitting}>
              {submitting ? "Инициализация..." : "Инициализировать привязку карты"}
            </Button>
            {confirmationUrl && (
              <a
                href={confirmationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary underline"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть confirmation_url
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
