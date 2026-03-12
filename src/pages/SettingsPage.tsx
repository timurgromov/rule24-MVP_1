import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api, ApiError, AuthUser, CancellationRuleDto } from "@/lib/api";
import { isSubscriptionCardAttached, setSubscriptionCardAttached } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [yooConnected, setYooConnected] = useState(false);
  const [cardBound, setCardBound] = useState(isSubscriptionCardAttached());
  const [autoRenew, setAutoRenew] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [rule, setRule] = useState<CancellationRuleDto | null>(null);
  const [hoursBefore, setHoursBefore] = useState("24");
  const [loadingRule, setLoadingRule] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  const loadRule = async () => {
    setLoadingRule(true);
    try {
      const data = await api.getCancellationRule();
      setRule(data);
      setHoursBefore(String(data.hours_before));
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Не удалось загрузить правило";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setLoadingRule(false);
    }
  };

  useEffect(() => {
    void loadRule();
  }, []);

  useEffect(() => {
    api.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const trialUntilText = useMemo(() => {
    if (!currentUser?.subscription_until) return "—";
    return new Date(currentUser.subscription_until).toLocaleDateString("ru-RU");
  }, [currentUser?.subscription_until]);

  const saveRule = async (event: FormEvent) => {
    event.preventDefault();
    setSavingRule(true);
    try {
      const updated = await api.updateCancellationRule({
        hours_before: Number(hoursBefore),
        penalty_amount: rule?.penalty_amount ?? null,
      });
      setRule(updated);
      setHoursBefore(String(updated.hours_before));
      toast({ title: "Правило отмены сохранено" });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Не удалось сохранить правило";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Параметры аккаунта, оплаты и правила
        </p>
      </div>

      <Section title="Приём оплат от клиентов">
        <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">ЮKassa</span>
            <Badge variant={yooConnected ? "success" : "muted"} className="ml-auto text-[11px]">
              {yooConnected ? "Подключено" : "Не подключено"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Приём оплат от клиентов за сессии. Привязка карты клиента и автоматические
            списания.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Как подключить ЮKassa
            <span className="text-muted-foreground">(2 мин)</span>
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Как самозанятому формировать чеки после оплат
            <span className="text-muted-foreground">(2 мин)</span>
          </a>
          <Button
            variant={yooConnected ? "outline" : "default"}
            size="sm"
            className="self-start mt-auto"
            onClick={() => setYooConnected(!yooConnected)}
          >
            {yooConnected ? "Отключить" : "Подключить"}
          </Button>
        </div>
      </Section>

      <Separator />

      <Section title="Тариф и оплата Rule24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Текущий тариф: Ранний доступ</p>
            <p className="text-xs text-muted-foreground">
              1 месяц бесплатно · после — 1 490 ₽/мес
            </p>
          </div>
          <Badge variant="success">Активен</Badge>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          {!cardBound ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Пробный доступ до:</span>
                <span className="font-medium text-foreground">{trialUntilText}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Чтобы продолжить работу, подключите карту
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Следующее списание:</span>
                <span className="font-medium text-foreground">{trialUntilText}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Автопродление:</span>
                <span className="font-medium text-foreground">включено</span>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium text-foreground">Карта для оплаты Rule24</p>
          {cardBound ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">•••• 4821</span>
                <span className="text-xs text-muted-foreground">Visa</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Заменить карту
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setCardBound(false);
                    setSubscriptionCardAttached(false);
                  }}
                >
                  Отвязать
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Карта не привязана. Привяжите карту, чтобы подписка продлилась автоматически
                после пробного периода.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setCardBound(true);
                  setSubscriptionCardAttached(true);
                }}
              >
                Привязать карту
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {cardBound && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Автопродление</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  После окончания пробного периода подписка будет продлеваться автоматически.
                </p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>

            <Separator />
          </>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Отмена подписки</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Подписка активна до: 09.04.2026. После этой даты доступ будет закрыт.
          </p>
          <Button variant="outline" size="sm">
            Отменить подписку
          </Button>
        </div>
      </Section>

      <Separator />

      <Section title="Правило отмены">
        {loadingRule ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : (
          <form className="space-y-3" onSubmit={saveRule}>
            <p className="text-xs text-muted-foreground">
              По умолчанию поздняя отмена определяется по окну в 24 часа.
            </p>
            <Field
              label="Окно отмены (часы)"
              value={hoursBefore}
              onChange={(value) => setHoursBefore(value)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={savingRule}>
                {savingRule ? "Сохранение..." : "Сохранить правило"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadRule()}>
                Обновить
              </Button>
            </div>
            {rule && (
              <p className="text-xs text-muted-foreground">
                Текущее правило: {rule.hours_before}ч
              </p>
            )}
          </form>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
