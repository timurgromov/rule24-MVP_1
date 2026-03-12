import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { fakeSessions } from "@/lib/data";
import { TrendingDown, UserX, AlertCircle, CheckCircle2, CreditCard, ArrowRight, Copy, ExternalLink, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const totalPaid = fakeSessions.filter(s => s.isPaid).reduce((a, s) => a + s.price, 0);
  const totalLost = fakeSessions.filter(s => ['NO_SHOW', 'CANCELLED_LATE'].includes(s.status)).reduce((a, s) => a + s.price, 0);
  const lateCancellations = fakeSessions.filter(s => s.status === 'CANCELLED_LATE').length;
  const noShows = fakeSessions.filter(s => s.status === 'NO_SHOW').length;

  const attentionSessions = fakeSessions.filter(s =>
    ['NO_SHOW', 'CANCELLED_LATE'].includes(s.status)
  );

  const [kassaConnected] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/demo`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
        <p className="text-sm text-muted-foreground">Март 2026</p>
      </div>

      {/* Current plan */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-safe/15 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-safe-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Текущий тариф: Ранний доступ</p>
            <p className="text-xs text-muted-foreground">3 месяца бесплатно · после — 1 490 ₽/мес</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>Бесплатно до: <span className="font-medium text-foreground">09.06.2026</span></div>
          <div>Списание: <span className="font-medium text-foreground">10.06.2026</span></div>
          <div>Автопродление: <span className="font-medium text-foreground">включено</span></div>
        </div>
        <Link to="/app/settings" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          Управлять тарифом
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* YooKassa banner */}
      {!kassaConnected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Чтобы начать работу, подключите ЮKassa</p>
          </div>
          <Link to="/app/settings">
            <Button size="sm">
              Подключить ЮKassa
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Demo session example */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Доход за месяц" value={`${totalPaid.toLocaleString('ru-RU')} ₽`} subtitle="Оплаченные сессии" icon={CheckCircle2} variant="success" />
        <MetricCard title="Потери" value={`${totalLost.toLocaleString('ru-RU')} ₽`} subtitle="Отмены и неявки" icon={TrendingDown} variant="danger" />
        <MetricCard title="Поздние отмены" value={lateCancellations} subtitle="За месяц" icon={AlertCircle} variant={lateCancellations > 0 ? 'danger' : 'default'} />
        <MetricCard title="Неявки" value={noShows} subtitle="Без предупреждения" icon={UserX} variant={noShows > 0 ? 'danger' : 'default'} />
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-medium text-foreground">Требует внимания</h3>
          <p className="text-xs text-muted-foreground">{attentionSessions.length} сессий</p>
        </div>
        {attentionSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Всё в порядке</p>
        ) : (
          <div className="space-y-1">
            {attentionSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.clientName}</p>
                  <p className="text-xs text-muted-foreground">{s.date} · {s.time}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{s.price.toLocaleString('ru-RU')} ₽</p>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
