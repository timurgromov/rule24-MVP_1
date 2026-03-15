import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, Edit2, ExternalLink, MoreHorizontal, Save, Search, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientCombobox } from "@/components/ClientCombobox";
import {
  api,
  ApiError,
  ClientDto,
  ClientPaymentLinkDto,
  SessionDto,
  SessionStatus,
  TransactionDto,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type SessionForm = {
  client_id: string;
  start_date: string;
  start_time: string;
  duration_minutes: string;
  price: string;
};

const emptySessionForm: SessionForm = {
  client_id: "",
  start_date: "",
  start_time: "",
  duration_minutes: "60",
  price: "3000",
};

function toDatetimeIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function toLocalDateInput(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeInput(value: string): string {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSessionDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoneyCompact(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} RUB`;
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} RUB`;
}

function statusLabel(status: SessionStatus) {
  if (status === "completed") return "Завершена";
  if (status === "cancelled") return "Отменена";
  return "Запланирована";
}

function outcomeLabel(outcomeType: SessionDto["outcome_type"]) {
  if (outcomeType === "completed") return "Сессия состоялась";
  if (outcomeType === "late_cancellation") return "Поздняя отмена";
  if (outcomeType === "no_show") return "Неявка";
  return null;
}

function transactionStatusText(status: TransactionDto["status"] | null): string | null {
  if (status === "paid") return "Штраф: оплачен";
  if (status === "pending") return "Штраф: в обработке";
  if (status === "failed") return "Штраф: не прошел";
  if (status === "refunded") return "Штраф: возвращен";
  return null;
}

function notifyAttentionUpdated() {
  window.dispatchEvent(new Event("rule24-attention-updated"));
}

export default function SessionsPage() {
  const tableGridClass = "md:grid-cols-[1.35fr_1.05fr_0.8fr_1fr_1.55fr]";
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [createForm, setCreateForm] = useState<SessionForm>(emptySessionForm);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SessionForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linksBySessionId, setLinksBySessionId] = useState<Record<number, ClientPaymentLinkDto>>(
    {},
  );
  const [linkActionSessionId, setLinkActionSessionId] = useState<number | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sessionsData, clientsData, transactionsData] = await Promise.all([
        api.listSessions(),
        api.listClients({ includeArchived: true }),
        api.listTransactions(),
      ]);

      const latestLinks = await Promise.all(
        sessionsData.map(async (session) => {
          try {
            const link = await api.getLatestClientLink(session.id);
            return [session.id, link] as const;
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              return null;
            }
            throw err;
          }
        }),
      );

      const linksMap: Record<number, ClientPaymentLinkDto> = {};
      for (const item of latestLinks) {
        if (!item) continue;
        const [sessionId, link] = item;
        linksMap[sessionId] = link;
      }

      setSessions(sessionsData);
      setClients(clientsData);
      setTransactions(transactionsData);
      setLinksBySessionId(linksMap);
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to load sessions";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    const handleRefresh = () => void loadAll();
    window.addEventListener("rule24-attention-updated", handleRefresh);
    return () => window.removeEventListener("rule24-attention-updated", handleRefresh);
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );
  const activeClients = useMemo(
    () => clients.filter((client) => client.archived_at === null),
    [clients],
  );
  const latestTransactionBySessionId = useMemo(() => {
    const map = new Map<number, TransactionDto>();
    for (const tx of transactions) {
      if (!map.has(tx.session_id)) {
        map.set(tx.session_id, tx);
      }
    }
    return map;
  }, [transactions]);

  const filteredSessions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (!needle) return true;
      const clientName = clientMap.get(session.client_id)?.toLowerCase() ?? "";
      return clientName.includes(needle);
    });
  }, [search, sessions, clientMap]);

  const resetCreateForm = () => {
    setCreateForm(emptySessionForm);
  };

  const submitSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!createForm.client_id || !createForm.start_date || !createForm.start_time) return;
    setSubmitting(true);
    try {
      await api.createSession({
        client_id: Number(createForm.client_id),
        start_time: toDatetimeIso(createForm.start_date, createForm.start_time),
        duration_minutes: Number(createForm.duration_minutes),
        price: Number(createForm.price).toFixed(2),
      });
      toast({
        title: "Сессия создана",
        description: "Ссылка для клиента уже подготовлена. Нажмите «Скопировать ссылку».",
      });
      resetCreateForm();
      await loadAll();
      notifyAttentionUpdated();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to save session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (session: SessionDto) => {
    setEditingId(session.id);
    setEditForm({
      client_id: String(session.client_id),
      start_date: toLocalDateInput(session.start_time),
      start_time: toLocalTimeInput(session.start_time),
      duration_minutes: String(session.duration_minutes),
      price: session.price,
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveInlineEdit = async (session: SessionDto) => {
    if (!editForm) return;
    setSavingEdit(true);
    try {
      if (session.status === "scheduled") {
        await api.updateSession(session.id, {
          client_id: Number(editForm.client_id),
          start_time: toDatetimeIso(editForm.start_date, editForm.start_time),
          duration_minutes: Number(editForm.duration_minutes),
          price: Number(editForm.price).toFixed(2),
        });
      } else {
        toast({
          title: "Редактирование ограничено",
          description: "Для завершенных или отмененных сессий можно менять только комментарии.",
        });
        return;
      }
      toast({ title: "Сессия обновлена" });
      cancelInlineEdit();
      await loadAll();
      notifyAttentionUpdated();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to update session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelSession = async (sessionId: number) => {
    try {
      const result = await api.cancelSession(sessionId);
      let description = "Штраф не применён.";

      if (result.is_late_cancellation) {
        if (result.penalty_transaction) {
          description =
            result.penalty_transaction.status === "paid"
              ? `Поздняя отмена: списание прошло на ${result.charge_amount ?? "0.00"} RUB.`
              : `Поздняя отмена: создана транзакция на ${result.charge_amount ?? "0.00"} RUB, статус ${result.penalty_transaction.status}.`;
        } else if (result.penalty_error) {
          description = `Поздняя отмена: штраф ${result.charge_amount ?? "0.00"} RUB не запущен. ${result.penalty_error}`;
        } else {
          description = `Поздняя отмена: штраф ${result.charge_amount ?? "0.00"} RUB должен быть применён.`;
        }
      }

      toast({
        title: "Сессия отменена",
        description,
      });
      await loadAll();
      notifyAttentionUpdated();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to cancel session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    }
  };

  const createClientLink = async (
    sessionId: number,
    options?: { silent?: boolean },
  ): Promise<ClientPaymentLinkDto | null> => {
    setLinkActionSessionId(sessionId);
    try {
      const link = await api.createClientLink(sessionId);
      setLinksBySessionId((prev) => ({ ...prev, [sessionId]: link }));
      if (!options?.silent) {
        toast({ title: "Ссылка создана" });
      }
      return link;
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to create client link";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
      return null;
    } finally {
      setLinkActionSessionId(null);
    }
  };

  const getLatestClientLink = async (sessionId: number): Promise<ClientPaymentLinkDto | null> => {
    setLinkActionSessionId(sessionId);
    try {
      const link = await api.getLatestClientLink(sessionId);
      setLinksBySessionId((prev) => ({ ...prev, [sessionId]: link }));
      return link;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return createClientLink(sessionId, { silent: true });
      }
      const message = err instanceof ApiError ? err.detail : "Failed to load client link";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
      return null;
    } finally {
      setLinkActionSessionId(null);
    }
  };

  const ensureClientLink = async (sessionId: number): Promise<ClientPaymentLinkDto | null> =>
    linksBySessionId[sessionId] ?? (await getLatestClientLink(sessionId));

  const copyClientLink = async (sessionId: number) => {
    const link = await ensureClientLink(sessionId);
    if (!link) return;
    await navigator.clipboard.writeText(link.client_url);
    toast({ title: "Ссылка скопирована" });
  };

  const openClientLink = async (sessionId: number) => {
    const link = await ensureClientLink(sessionId);
    if (!link) return;
    window.open(link.client_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Сессии</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Загрузка..." : `${sessions.length} сессий`}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по клиенту"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <form
        id="create-session"
        onSubmit={submitSession}
        className="scroll-mt-20 rounded-xl border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Клиент</label>
          <ClientCombobox
            clients={activeClients}
            value={createForm.client_id}
            onChange={(value) => setCreateForm((prev) => ({ ...prev, client_id: value }))}
            placeholder="Выберите клиента"
            searchPlaceholder="Найти клиента"
            emptyText="Клиент не найден"
            buttonClassName="h-10 rounded-md"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Дата сессии</label>
          <Input
            type="date"
            value={createForm.start_date}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, start_date: event.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Время начала</label>
          <Input
            type="time"
            value={createForm.start_time}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, start_time: event.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Длительность (минуты)</label>
          <Input
            type="number"
            min={1}
            value={createForm.duration_minutes}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, duration_minutes: event.target.value }))
            }
            placeholder="60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Стоимость (₽)</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={createForm.price}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="3000"
            required
          />
        </div>
        <div className="mt-4 flex gap-2 lg:col-span-3 lg:justify-end">
          <Button type="submit" disabled={submitting}>
            <CalendarClock className="h-4 w-4 mr-1" />
            Создать
          </Button>
          <Button type="button" variant="outline" onClick={resetCreateForm}>
            Сброс
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground">
        Ссылка для клиента создается автоматически вместе с сессией. В таблице используйте кнопку
        «Скопировать ссылку».
      </p>

      <div className="mt-6 rounded-xl border bg-card overflow-hidden">
          <div className={`hidden md:grid ${tableGridClass} gap-3 p-4 border-b text-xs text-muted-foreground`}>
            <span>Клиент</span>
            <span>Дата и время</span>
            <span>Цена</span>
            <span>Статус</span>
            <span>Действия</span>
          </div>
          {filteredSessions.map((session) => {
          const isEditing = editingId === session.id && editForm !== null;
          const canFullyEdit = session.status === "scheduled";

          if (isEditing && editForm) {
            return (
              <div
                key={session.id}
                className={`grid ${tableGridClass} items-center gap-3 p-4 border-b last:border-b-0 text-sm bg-muted/30`}
              >
                <div className="min-w-0">
                  {canFullyEdit ? (
                    <ClientCombobox
                      clients={activeClients}
                      value={editForm.client_id}
                      onChange={(value) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, client_id: value } : prev,
                        )
                      }
                      placeholder="Выберите клиента"
                      searchPlaceholder="Найти клиента"
                      emptyText="Клиент не найден"
                      buttonClassName="h-9 rounded-md"
                    />
                  ) : (
                    <span className="block truncate font-medium">
                      {clientMap.get(session.client_id) ?? `#${session.client_id}`}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  {canFullyEdit ? (
                    <div className="grid min-w-0 grid-cols-1 gap-2">
                      <Input
                        type="date"
                        value={editForm.start_date}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, start_date: event.target.value } : prev,
                          )
                        }
                        className="h-9 min-w-0 pr-9"
                      />
                      <Input
                        type="time"
                        value={editForm.start_time}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, start_time: event.target.value } : prev,
                          )
                        }
                        className="h-9 min-w-0 pr-8"
                      />
                    </div>
                  ) : (
                    <span className="block truncate text-muted-foreground">
                      {formatSessionDateTime(session.start_time)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  {canFullyEdit ? (
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={editForm.price}
                      onChange={(event) =>
                        setEditForm((prev) => (prev ? { ...prev, price: event.target.value } : prev))
                      }
                      className="h-9"
                    />
                  ) : (
                    <span className="block whitespace-nowrap">{formatMoneyCompact(session.price)}</span>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="block min-w-0 truncate whitespace-nowrap">
                    {statusLabel(session.status)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Длительность: {editForm.duration_minutes} мин
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => void saveInlineEdit(session)}
                    disabled={savingEdit}
                    className="h-9 w-full"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Сохранить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelInlineEdit}
                    disabled={savingEdit}
                    className="h-9 w-full"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Отмена
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={session.id} className={`grid ${tableGridClass} items-center gap-3 p-4 border-b last:border-b-0 text-sm`}>
              {(() => {
                const transaction = latestTransactionBySessionId.get(session.id) ?? null;
                const transactionText = transactionStatusText(transaction?.status ?? null);
                return (
                  <>
              <span className="block min-w-0 truncate font-medium">{clientMap.get(session.client_id) ?? `#${session.client_id}`}</span>
              <span className="block min-w-0 truncate text-muted-foreground">{formatSessionDateTime(session.start_time)}</span>
              <span className="block min-w-0 whitespace-nowrap">{formatMoneyCompact(session.price)}</span>
              <div className="min-w-0">
                <span className="block truncate whitespace-nowrap">{statusLabel(session.status)}</span>
                {transactionText && <span className="mt-1 block text-xs text-muted-foreground">{transactionText}</span>}
                {session.outcome_confirmed && outcomeLabel(session.outcome_type) && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Итог: {outcomeLabel(session.outcome_type)}
                  </span>
                )}
                {!session.outcome_confirmed && new Date(session.start_time) < new Date() && (
                  <span className="mt-1 block text-xs text-amber-700">Итог не подтвержден</span>
                )}
              </div>
              <div className="flex min-w-[200px] flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => void copyClientLink(session.id)}
                  disabled={linkActionSessionId === session.id}
                  className="h-9 w-full justify-center whitespace-nowrap"
                >
                  <Copy className="mr-1 h-3.5 w-3.5 shrink-0" />
                  Скопировать
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-full justify-center">
                      <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                      Еще
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => startInlineEdit(session)}
                      disabled={session.status !== "scheduled"}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-2" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void openClientLink(session.id)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Предпросмотр ссылки
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void cancelSession(session.id)}
                      disabled={session.status !== "scheduled"}
                      className="text-destructive focus:text-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-2" />
                      Отменить сессию
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!transaction && session.status === "cancelled" && (
                  <span className="text-xs text-muted-foreground">
                    Если штраф не появился, проверьте: есть ли у клиента привязанная карта и настроена ли YooKassa.
                  </span>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          );
          })}
          {!loading && filteredSessions.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Сессии не найдены</p>
          )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-medium text-foreground">Транзакции</h2>
        </div>
        {transactions.map((tx) => (
          <div key={tx.id} className="grid grid-cols-5 gap-3 p-4 border-b last:border-b-0 text-sm">
            <span>#{tx.id}</span>
            <span>session #{tx.session_id}</span>
            <span>{tx.amount} RUB</span>
            <span>{tx.status}</span>
            <span className="text-muted-foreground">
              {new Date(tx.created_at).toLocaleString()}
            </span>
          </div>
        ))}
        {!loading && transactions.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Транзакций пока нет
          </p>
        )}
      </div>
    </div>
  );
}
