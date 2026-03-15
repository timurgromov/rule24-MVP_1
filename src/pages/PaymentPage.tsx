import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError, PublicClientLinkDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const { publicToken } = useParams();
  const token = publicToken ?? "";
  const [link, setLink] = useState<PublicClientLinkDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getPublicClientLink(token)
      .then(setLink)
      .catch((err) => {
        const message = err instanceof ApiError ? err.detail : "Не удалось загрузить клиентскую ссылку";
        toast({ title: "Ошибка", description: message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const initAttachment = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const result = await api.initCardAttachmentByPublicLink(token);
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
            Это безопасная страница Rule24 для привязки карты к вашей сессии. После нажатия
            вы перейдете в защищенный YooKassa flow.
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Клиент: {link.client_name}</p>
              <Badge variant={link.status === "completed" ? "success" : "secondary"}>
                {link.status === "completed" ? "Карта привязана" : "Ожидается действие"}
              </Badge>
            </div>
            <p className="text-sm">Сессия №{link.session_id}</p>
            <p className="text-sm">Дата и время: {new Date(link.session_start_time).toLocaleString()}</p>
            <p className="text-sm">Длительность: {link.session_duration_minutes} мин</p>
            <p className="text-sm font-medium">Стоимость: {link.session_price} RUB</p>
            {link.session_notes ? (
              <p className="text-sm text-muted-foreground">Комментарий: {link.session_notes}</p>
            ) : null}
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-2">
              <p>Зачем нужна карта:</p>
              <p>1. Терапевт заранее фиксирует правило отмены для этой сессии.</p>
              <p>2. При поздней отмене сумма берется из полной стоимости сессии.</p>
              <p>3. После нажатия вы перейдете на защищенную страницу YooKassa.</p>
            </div>
            <Button onClick={initAttachment} disabled={submitting}>
              {submitting ? "Переход..." : "Привязать карту"}
            </Button>
            {confirmationUrl && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-sm text-foreground">
                  Страница YooKassa готова. Откройте ее, чтобы завершить привязку карты.
                </p>
                <a
                  href={confirmationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Перейти в YooKassa
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
