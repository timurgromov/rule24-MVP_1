import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiError, PublicClientLinkDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function formatShortDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} ₽`;
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} ₽`;
}

export default function PaymentPage() {
  const { publicToken } = useParams();
  const token = publicToken ?? "";
  const [link, setLink] = useState<PublicClientLinkDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [ruleAccepted, setRuleAccepted] = useState(false);
  const [cardConsentAccepted, setCardConsentAccepted] = useState(false);

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
    if (!ruleAccepted || !cardConsentAccepted) {
      toast({
        title: "Подтвердите условия",
        description: "Подтвердите оба пункта перед продолжением.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.initCardAttachmentByPublicLink(token);
      setConfirmationUrl(result.confirmation_url);
      toast({ title: "Готово", description: "Откройте YooKassa, чтобы завершить привязку карты." });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Не удалось начать привязку карты. Попробуйте еще раз.";
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
            <h1 className="font-semibold">Rule24 · Защищенная страница</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Подтвердите условия и перейдите в YooKassa для привязки карты.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Загрузка данных сессии...
          </div>
        ) : !link ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            Ссылка недействительна или больше недоступна.
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Клиент: {link.client_name}</p>
              <Badge variant={link.status === "completed" ? "success" : "secondary"}>
                {link.status === "completed" ? "Карта уже привязана" : "Ожидается подтверждение"}
              </Badge>
            </div>
            <p className="text-sm">Дата и время: {formatShortDateTime(link.session_start_time)}</p>
            <p className="text-sm font-medium">Стоимость: {formatPrice(link.session_price)}</p>
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Подтверждение</p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="rule-accepted"
                  checked={ruleAccepted}
                  onCheckedChange={(value) => setRuleAccepted(Boolean(value))}
                  className="mt-0.5"
                  disabled={link.status === "completed"}
                />
                <label htmlFor="rule-accepted" className="text-sm text-foreground cursor-pointer">
                  Я ознакомлен(а) с правилом поздней отмены.
                </label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="card-consent"
                  checked={cardConsentAccepted}
                  onCheckedChange={(value) => setCardConsentAccepted(Boolean(value))}
                  className="mt-0.5"
                  disabled={link.status === "completed"}
                />
                <label htmlFor="card-consent" className="text-sm text-foreground cursor-pointer">
                  Я согласен(на) на привязку карты для оплаты этой сессии.
                </label>
              </div>
              <p className="text-xs">Привязка выполняется на защищенной странице YooKassa.</p>
            </div>
            {link.status === "completed" ? (
              <Button variant="outline" disabled>
                Карта уже привязана
              </Button>
            ) : (
              <Button onClick={initAttachment} disabled={submitting || !ruleAccepted || !cardConsentAccepted}>
                {submitting ? "Переход..." : "Подтвердить и перейти в YooKassa"}
              </Button>
            )}
            {confirmationUrl && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-sm text-foreground">Страница YooKassa готова.</p>
                <a
                  href={confirmationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Перейти
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
