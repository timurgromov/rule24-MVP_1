import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, ClientDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: ClientForm = { name: "", email: "", phone: "", notes: "" };

function formatCardBindingStatus(client: ClientDto): string {
  if (!client.has_saved_payment_method) return "Не привязана";
  const brand = (client.card_brand ?? "Карта").toUpperCase();
  const last4 = client.card_last4 ? ` ****${client.card_last4}` : "";
  const boundAt = client.payment_method_bound_at
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(client.payment_method_bound_at))
    : null;
  return boundAt ? `${brand}${last4} · ${boundAt}` : `${brand}${last4}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.listClients();
      setClients(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to load clients";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        client.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [clients, search],
  );

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (client: ClientDto) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateClient(editingId, {
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          notes: form.notes || null,
        });
        toast({ title: "Клиент обновлен" });
      } else {
        await api.createClient({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          notes: form.notes || null,
        });
        toast({ title: "Клиент создан" });
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadClients();
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to save client";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const removeClient = async (clientId: number) => {
    try {
      await api.deleteClient(clientId);
      setClients((prev) => prev.filter((item) => item.id !== clientId));
      if (editingId === clientId) {
        setEditingId(null);
        setForm(emptyForm);
      }
      toast({ title: "Клиент архивирован" });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to delete client";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Клиенты</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Загрузка..." : `${clients.length} клиентов`}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Как работать со списком клиентов</p>
              <Badge variant="outline">Безопасно для истории</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Архивируйте клиента, если он больше не активен. Его прошлые сессии, ссылки и платежная
              история останутся в системе.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={startCreate}>
            Новый клиент
          </Button>
        </div>
      </div>

      <form className="rounded-xl border bg-card p-4 grid gap-3 sm:grid-cols-2" onSubmit={submitForm}>
        <Input
          placeholder="Имя"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <Input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          placeholder="Телефон"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <Input
          placeholder="Заметки"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" disabled={submitting}>
            <Plus className="h-4 w-4 mr-1" />
            {editingId ? "Сохранить" : "Добавить клиента"}
          </Button>
          <Button type="button" variant="outline" onClick={startCreate}>
            Очистить
          </Button>
        </div>
      </form>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="hidden sm:grid grid-cols-5 gap-3 p-4 border-b text-xs text-muted-foreground">
          <span>Имя</span>
          <span>Email</span>
          <span>Телефон</span>
          <span>Карта</span>
          <span>Действия</span>
        </div>
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="grid sm:grid-cols-5 gap-2 sm:gap-3 p-4 border-b last:border-b-0 text-sm"
          >
            <span className="font-medium">{client.name}</span>
            <span className="text-muted-foreground">{client.email ?? "-"}</span>
            <span className="text-muted-foreground">{client.phone ?? "-"}</span>
            <div className="min-w-0">
              <span className="block truncate text-muted-foreground">
                {formatCardBindingStatus(client)}
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => startEdit(client)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => void removeClient(client.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!loading && filteredClients.length === 0 && (
          <div className="p-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Клиенты не найдены</p>
            <p className="text-xs text-muted-foreground">
              Создайте первого клиента или измените поисковый запрос.
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Архивные клиенты скрываются из списка, но сохраняются в истории сессий и платежей.
      </p>
    </div>
  );
}
