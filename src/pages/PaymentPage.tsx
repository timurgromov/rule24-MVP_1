import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, ApiError, PublicClientLinkDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const { sessionId } = useParams();
  const publicToken = sessionId ?? "";
  const [link, setLink] = useState<PublicClientLinkDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getPublicClientLink(publicToken)
      .then(setLink)
      .catch((err) => {
        const message = err instanceof ApiError ? err.detail : "Не удалось загрузить клиентскую ссылку";
        toast({ title: "Ошибка", description: message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [publicToken]);

  const initAttachment = async () => {
    if (!publicToken) return;
    setSubmitting(true);
    try {
      const result = await api.initCardAttachmentByPublicLink(publicToken);
      setConfirmationUrl(result.confirmation_url);
      toast({ title: "Платеж создан", description: `payment_id: ${result.payment_id}` });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Запрос привязки карты не выполнен";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h1 className="font-semibold">Страница клиента Rule24</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Полный real YooKassa flow требует реальные credentials и публичный webhook URL.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">Загрузка сессии...</div>
        ) : !link ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Ссылка недействительна или недоступна.
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-sm">Клиент: {link.client_name}</p>
            <p className="text-sm">Session ID: {link.session_id}</p>
            <p className="text-sm">Start: {new Date(link.session_start_time).toLocaleString()}</p>
            <p className="text-sm">Duration: {link.session_duration_minutes} мин</p>
            <p className="text-sm font-medium">Price: {link.session_price} RUB</p>
            {link.session_notes ? (
              <p className="text-sm text-muted-foreground">Notes: {link.session_notes}</p>
            ) : null}
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
