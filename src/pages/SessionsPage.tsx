import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Edit2, Search, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  api,
  ApiError,
  ClientDto,
  SessionCancelResponse,
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
  status: SessionStatus;
};

const emptySessionForm: SessionForm = {
  client_id: "",
  start_date: "",
  start_time: "",
  duration_minutes: "60",
  price: "3000.00",
  notes: "",
  status: "scheduled",
};

function toDatetimeIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
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
  const [form, setForm] = useState<SessionForm>(emptySessionForm);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cancelResult, setCancelResult] = useState<SessionCancelResponse | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setForm(emptySessionForm);
  };

  const submitSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.client_id || !form.start_date || !form.start_time) return;
    setSubmitting(true);
    try {
      const payload = {
        client_id: Number(form.client_id),
        start_time: toDatetimeIso(form.start_date, form.start_time),
        duration_minutes: Number(form.duration_minutes),
        price: Number(form.price).toFixed(2),
        status: form.status,
        notes: form.notes || null,
      };
      if (editingId) {
        await api.updateSession(editingId, payload);
        toast({ title: "Сессия обновлена" });
      } else {
        await api.createSession(payload);
        toast({ title: "Сессия создана" });
      }
      resetForm();
      await loadAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to save session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const editSession = (session: SessionDto) => {
    const dateObj = new Date(session.start_time);
    setEditingId(session.id);
    setForm({
      client_id: String(session.client_id),
      start_date: dateObj.toISOString().slice(0, 10),
      start_time: dateObj.toISOString().slice(11, 16),
      duration_minutes: String(session.duration_minutes),
      price: session.price,
      notes: session.notes ?? "",
      status: session.status,
    });
  };

  const cancelSession = async (sessionId: number) => {
    try {
      const result = await api.cancelSession(sessionId);
      setCancelResult(result);
      toast({
        title: result.is_late_cancellation ? "Поздняя отмена" : "Сессия отменена",
        description: result.is_late_cancellation
          ? `Штраф: ${result.charge_amount ?? "0.00"} RUB`
          : "Штраф не применяется",
      });
      await loadAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to cancel session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    }
  };

  const requestPenalty = async (sessionId: number) => {
    try {
      const result = await api.requestPenaltyCharge(sessionId);
      toast({
        title: "Штраф инициирован",
        description: `Транзакция #${result.transaction_id}, сумма ${result.amount} RUB`,
      });
      await loadAll();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Penalty charge failed";
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
        <select
          value={form.client_id}
          onChange={(event) => setForm((prev) => ({ ...prev, client_id: event.target.value }))}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Клиент</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={form.start_date}
          onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
          required
        />
        <Input
          type="time"
          value={form.start_time}
          onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
          required
        />
        <Input
          type="number"
          min={1}
          value={form.duration_minutes}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, duration_minutes: event.target.value }))
          }
          placeholder="Длительность (мин)"
        />
        <Input
          type="number"
          min={0.01}
          step={0.01}
          value={form.price}
          onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
          placeholder="Цена"
          required
        />
        <select
          value={form.status}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, status: event.target.value as SessionStatus }))
          }
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="scheduled">Запланирована</option>
          <option value="completed">Завершена</option>
          <option value="cancelled">Отменена</option>
        </select>
        <Input
          className="lg:col-span-2"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Заметки"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            <CalendarClock className="h-4 w-4 mr-1" />
            {editingId ? "Сохранить" : "Создать"}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm}>
            Сброс
          </Button>
        </div>
      </form>

      {cancelResult && (
        <div className="rounded-xl border bg-card p-4 text-sm space-y-1">
          <p className="font-medium">Результат отмены сессии #{cancelResult.session.id}</p>
          <p>Окно отмены: {cancelResult.cancellation_window_hours}ч</p>
          <p>До начала: {cancelResult.hours_before_start}ч</p>
          <p>Поздняя отмена: {cancelResult.is_late_cancellation ? "да" : "нет"}</p>
          <p>Сумма штрафа: {cancelResult.charge_amount ?? "0.00"} RUB</p>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-7 gap-3 p-4 border-b text-xs text-muted-foreground">
          <span>Клиент</span>
          <span>Начало</span>
          <span>Длительность</span>
          <span>Цена</span>
          <span>Статус</span>
          <span>Заметки</span>
          <span>Действия</span>
        </div>
        {filteredSessions.map((session) => (
          <div key={session.id} className="grid md:grid-cols-7 gap-2 p-4 border-b last:border-b-0 text-sm">
            <span className="font-medium">{clientMap.get(session.client_id) ?? `#${session.client_id}`}</span>
            <span className="text-muted-foreground">{new Date(session.start_time).toLocaleString()}</span>
            <span className="text-muted-foreground">{session.duration_minutes} мин</span>
            <span>{session.price} RUB</span>
            <span>{statusLabel(session.status)}</span>
            <span className="text-muted-foreground">{session.notes ?? "-"}</span>
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" onClick={() => editSession(session)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void cancelSession(session.id)}
                className="text-destructive"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void requestPenalty(session.id)}
                disabled={session.status !== "cancelled"}
              >
                <CircleDollarSign className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
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
