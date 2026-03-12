import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Edit2, Save, Search, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  api,
  ApiError,
  ClientDto,
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
  notes: string;
};

const emptySessionForm: SessionForm = {
  client_id: "",
  start_date: "",
  start_time: "",
  duration_minutes: "60",
  price: "3000.00",
  notes: "",
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

function statusLabel(status: SessionStatus) {
  if (status === "completed") return "Завершена";
  if (status === "cancelled") return "Отменена";
  return "Запланирована";
}

export default function SessionsPage() {
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

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sessionsData, clientsData, transactionsData] = await Promise.all([
        api.listSessions(),
        api.listClients(),
        api.listTransactions(),
      ]);
      setSessions(sessionsData);
      setClients(clientsData);
      setTransactions(transactionsData);
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to load sessions";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );

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
        notes: createForm.notes || null,
      });
      toast({ title: "Сессия создана" });
      resetCreateForm();
      await loadAll();
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
      notes: session.notes ?? "",
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
          notes: editForm.notes || null,
        });
      } else {
        await api.updateSession(session.id, {
          notes: editForm.notes || null,
        });
      }
      toast({ title: "Сессия обновлена" });
      cancelInlineEdit();
      await loadAll();
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
      toast({
        title: "Сессия отменена",
        description: result.is_late_cancellation
          ? `Штраф будет применён: ${result.charge_amount ?? "0.00"} RUB`
          : "Штраф не применён.",
      });
      await loadAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to cancel session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    }
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

      <form onSubmit={submitSession} className="rounded-xl border bg-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Клиент</label>
          <select
            value={createForm.client_id}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, client_id: event.target.value }))
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Клиент</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
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
            min={0.01}
            step={0.01}
            value={createForm.price}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder="3000"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Комментарий</label>
          <Input
            value={createForm.notes}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Комментарий к сессии"
          />
        </div>
        <div className="mt-4 flex gap-2 lg:col-start-3 lg:justify-end">
          <Button type="submit" disabled={submitting}>
            <CalendarClock className="h-4 w-4 mr-1" />
            Создать
          </Button>
          <Button type="button" variant="outline" onClick={resetCreateForm}>
            Сброс
          </Button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border bg-card overflow-x-auto">
        <div className="hidden md:grid md:grid-cols-7 gap-3 p-4 border-b text-xs text-muted-foreground">
          <span>Клиент</span>
          <span>Начало</span>
          <span>Длительность</span>
          <span>Цена</span>
          <span>Статус</span>
          <span>Заметки</span>
          <span>Действия</span>
        </div>
        {filteredSessions.map((session) => {
          const isEditing = editingId === session.id && editForm !== null;
          const canFullyEdit = session.status === "scheduled";

          if (isEditing && editForm) {
            return (
              <div
                key={session.id}
                className="grid md:grid-cols-7 gap-2 p-4 border-b last:border-b-0 text-sm bg-muted/30"
              >
                <div>
                  {canFullyEdit ? (
                    <select
                      value={editForm.client_id}
                      onChange={(event) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, client_id: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                    >
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium">
                      {clientMap.get(session.client_id) ?? `#${session.client_id}`}
                    </span>
                  )}
                </div>
                <div className="space-y-1 min-w-[170px]">
                  {canFullyEdit ? (
                    <>
                      <Input
                        type="date"
                        value={editForm.start_date}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, start_date: event.target.value } : prev,
                          )
                        }
                        className="h-8 pr-9"
                      />
                      <Input
                        type="time"
                        value={editForm.start_time}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, start_time: event.target.value } : prev,
                          )
                        }
                        className="h-8 pr-9"
                      />
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {new Date(session.start_time).toLocaleString()}
                    </span>
                  )}
                </div>
                <div>
                  {canFullyEdit ? (
                    <Input
                      type="number"
                      min={1}
                      value={editForm.duration_minutes}
                      onChange={(event) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, duration_minutes: event.target.value } : prev,
                        )
                      }
                      className="h-8"
                    />
                  ) : (
                    <span className="text-muted-foreground">{session.duration_minutes} мин</span>
                  )}
                </div>
                <div>
                  {canFullyEdit ? (
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={editForm.price}
                      onChange={(event) =>
                        setEditForm((prev) => (prev ? { ...prev, price: event.target.value } : prev))
                      }
                      className="h-8"
                    />
                  ) : (
                    <span>{session.price} RUB</span>
                  )}
                </div>
                <span>{statusLabel(session.status)}</span>
                <Input
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                  placeholder="Комментарий к сессии"
                  className="h-8"
                />
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    onClick={() => void saveInlineEdit(session)}
                    disabled={savingEdit}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Сохранить
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelInlineEdit} disabled={savingEdit}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Отмена
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={session.id} className="grid md:grid-cols-7 gap-2 p-4 border-b last:border-b-0 text-sm">
              <span className="font-medium">{clientMap.get(session.client_id) ?? `#${session.client_id}`}</span>
              <span className="text-muted-foreground">{new Date(session.start_time).toLocaleString()}</span>
              <span className="text-muted-foreground">{session.duration_minutes} мин</span>
              <span>{session.price} RUB</span>
              <span>{statusLabel(session.status)}</span>
              <span className="text-muted-foreground">{session.notes ?? "-"}</span>
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" size="sm" onClick={() => startInlineEdit(session)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void cancelSession(session.id)}
                  className="text-destructive"
                  disabled={session.status !== "scheduled"}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
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
