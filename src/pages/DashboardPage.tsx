import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Target,
  TrendingDown,
  UserX,
} from "lucide-react";

import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fakeSessions } from "@/lib/data";
import { isSubscriptionCardAttached } from "@/lib/auth";
import { api, ApiError, AuthUser, ClientDto, SessionDto, TransactionDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function formatMonthLabel(date: Date) {
  const raw = date
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isCurrentMonth(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatAttentionDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const { pathname } = useLocation();
  const isDemoMode = pathname.startsWith("/demo");
  const basePath = isDemoMode ? "/demo" : "/app";
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [attentionSessions, setAttentionSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(!isDemoMode);
  const [linkCopied, setLinkCopied] = useState(false);
  const hasSubscriptionCard = isSubscriptionCardAttached();
  const kassaConnected = isDemoMode ? false : hasSubscriptionCard;

  const monthLabel = useMemo(() => formatMonthLabel(new Date()), []);

  const demoMetrics = useMemo(() => {
    const totalPaid = fakeSessions
      .filter((session) => session.isPaid)
      .reduce((sum, session) => sum + session.price, 0);
    const totalLost = fakeSessions
      .filter((session) => ["NO_SHOW", "CANCELLED_LATE"].includes(session.status))
      .reduce((sum, session) => sum + session.price, 0);
    const lateCancellations = fakeSessions.filter(
      (session) => session.status === "CANCELLED_LATE",
    ).length;
    const noShows = fakeSessions.filter((session) => session.status === "NO_SHOW").length;
    const demoAttentionSessions = fakeSessions.filter((session) =>
      ["NO_SHOW", "CANCELLED_LATE"].includes(session.status),
    );

    return { totalPaid, totalLost, lateCancellations, noShows, attentionSessions: demoAttentionSessions };
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setCurrentUser(null);
      setSessions([]);
      setTransactions([]);
      setClients([]);
      setAttentionSessions([]);
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [user, sessionsData, transactionsData, clientsData, attentionData] = await Promise.all([
          api.me(),
          api.listSessions(),
          api.listTransactions(),
          api.listClients({ includeArchived: true }),
          api.listSessionsRequiresAttention(),
        ]);
        setCurrentUser(user);
        setSessions(sessionsData);
        setTransactions(transactionsData);
        setClients(clientsData);
        setAttentionSessions(attentionData);
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Не удалось загрузить дашборд";
        toast({ title: "Ошибка", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
    const handleRefresh = () => void loadDashboard();
    window.addEventListener("rule24-attention-updated", handleRefresh);
    return () => window.removeEventListener("rule24-attention-updated", handleRefresh);
  }, [isDemoMode]);

  const trialUntilText = useMemo(() => {
    if (!currentUser?.subscription_until) return "—";
    return new Date(currentUser.subscription_until).toLocaleDateString("ru-RU");
  }, [currentUser?.subscription_until]);

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );
  const activeClientsCount = useMemo(
    () => clients.filter((client) => client.archived_at === null).length,
    [clients],
  );

  const realMetrics = useMemo(() => {
    const now = new Date();
    const currentMonthSessions = sessions.filter((session) => isCurrentMonth(session.start_time, now));
    const currentMonthPaidTransactions = transactions.filter(
      (transaction) => transaction.status === "paid" && isCurrentMonth(transaction.created_at, now),
    );
    const paidSessionIds = new Set(
      transactions
        .filter((transaction) => transaction.status === "paid")
        .map((transaction) => transaction.session_id),
    );

    const problematicSessions = currentMonthSessions.filter(
      (session) =>
        session.outcome_type === "late_cancellation" || session.outcome_type === "no_show",
    );

    return {
      totalPaid: currentMonthPaidTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ),
      totalLost: problematicSessions
        .filter((session) => !paidSessionIds.has(session.id))
        .reduce((sum, session) => sum + Number(session.price), 0),
      lateCancellations: currentMonthSessions.filter(
        (session) => session.outcome_type === "late_cancellation",
      ).length,
      noShows: currentMonthSessions.filter((session) => session.outcome_type === "no_show").length,
    };
  }, [sessions, transactions]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/demo`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const totalPaid = isDemoMode ? demoMetrics.totalPaid : realMetrics.totalPaid;
  const totalLost = isDemoMode ? demoMetrics.totalLost : realMetrics.totalLost;
  const lateCancellations = isDemoMode
    ? demoMetrics.lateCancellations
    : realMetrics.lateCancellations;
  const noShows = isDemoMode ? demoMetrics.noShows : realMetrics.noShows;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-safe/15 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-safe-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Текущий тариф: Ранний доступ</p>
            <p className="text-xs text-muted-foreground">1 месяц бесплатно · после — 1 490 ₽/мес</p>
          </div>
          <Badge variant="outline" className="ml-auto">MVP</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          {!hasSubscriptionCard ? (
            <>
              <div>
                Пробный доступ до:{" "}
                <span className="font-medium text-foreground">{trialUntilText}</span>
              </div>
              <div className="sm:col-span-2">
                Чтобы продолжить работу, подключите карту
              </div>
            </>
          ) : (
            <>
              <div>
                Следующее списание:{" "}
                <span className="font-medium text-foreground">{trialUntilText}</span>
              </div>
              <div>
                Автопродление: <span className="font-medium text-foreground">включено</span>
              </div>
              <div>
                Тариф: <span className="font-medium text-foreground">активен</span>
              </div>
            </>
          )}
        </div>
        <Link
          to={`${basePath}/settings`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Управлять тарифом
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Быстрый старт на сегодня</p>
            <p className="text-xs text-muted-foreground">
              {activeClientsCount === 0
                ? "Добавьте первого клиента, затем создайте сессию и отправьте ссылку на привязку карты."
                : "Проверьте, у каких сессий уже есть ссылка и какие прошедшие сессии требуют подтверждения итога."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`${basePath}/clients`}>Клиенты</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`${basePath}/sessions#create-session`}>Новая сессия</Link>
            </Button>
          </div>
        </div>
      </div>

      {!kassaConnected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Чтобы начать работу, подключите ЮKassa</p>
          </div>
          <Link to={`${basePath}/settings`}>
            <Button size="sm">
              Подключить ЮKassa
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {isDemoMode && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Пример сессии</h3>
            <span className="text-xs text-muted-foreground ml-auto">Демо</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Клиент</p>
              <p className="font-medium text-foreground">Анна К.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Дата</p>
              <p className="font-medium text-foreground">Завтра</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Время</p>
              <p className="font-medium text-foreground">14:00</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Стоимость</p>
              <p className="font-medium text-foreground">4 000 ₽</p>
            </div>
          </div>
          <div className="rounded-lg bg-background/60 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Ссылка для клиента:</p>
            <p className="text-sm font-mono text-foreground">rule24.app/pay/demo</p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                {linkCopied ? "Скопировано" : "Скопировать ссылку"}
              </Button>
              <Button size="sm" asChild>
                <a href="/pay/demo" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Открыть как клиент
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Доход за месяц"
          value={loading && !isDemoMode ? "—" : formatMoney(totalPaid)}
          subtitle={isDemoMode ? "Оплаченные сессии" : "Успешные списания"}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Потери"
          value={loading && !isDemoMode ? "—" : formatMoney(totalLost)}
          subtitle={isDemoMode ? "Отмены и неявки" : "Непокрытые отмены и неявки"}
          icon={TrendingDown}
          variant="danger"
        />
        <MetricCard
          title="Поздние отмены"
          value={loading && !isDemoMode ? "—" : lateCancellations}
          subtitle="За месяц"
          icon={AlertCircle}
          variant={lateCancellations > 0 ? "danger" : "default"}
        />
        <MetricCard
          title="Неявки"
          value={loading && !isDemoMode ? "—" : noShows}
          subtitle="Без предупреждения"
          icon={UserX}
          variant={noShows > 0 ? "danger" : "default"}
        />
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-foreground">Требует внимания</h3>
            <p className="text-xs text-muted-foreground">
              {isDemoMode ? demoMetrics.attentionSessions.length : attentionSessions.length} сессий
            </p>
          </div>
          {!isDemoMode && attentionSessions.length > 0 && (
            <Link
              to={`${basePath}/sessions#requires-attention`}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Открыть в сессиях
            </Link>
          )}
        </div>

        {loading && !isDemoMode ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Загрузка...</p>
        ) : isDemoMode ? (
          demoMetrics.attentionSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Всё в порядке</p>
          ) : (
            <div className="space-y-1">
              {demoMetrics.attentionSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.date} · {session.time}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">{formatMoney(session.price)}</p>
                    <StatusBadge status={session.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : attentionSessions.length === 0 ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Всё в порядке</p>
            <p className="text-xs text-muted-foreground">
              Сейчас нет прошедших сессий без подтвержденного итога.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {attentionSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {clientMap.get(session.client_id) ?? `Клиент #${session.client_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAttentionDateTime(session.start_time)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Подтвердите, что произошло: сессия состоялась, была поздняя отмена или неявка.
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{formatMoney(Number(session.price))}</p>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    Нужно подтвердить
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
