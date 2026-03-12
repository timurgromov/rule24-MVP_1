import { useEffect, useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, ApiError, ClientDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export function CreateSessionButton() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("3000.00");
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(clientId) &&
      Boolean(date) &&
      Boolean(time) &&
      Number(duration) > 0 &&
      Number(price) > 0,
    [clientId, date, time, duration, price],
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .listClients()
      .then(setClients)
      .catch((err) => {
        const message = err instanceof ApiError ? err.detail : "Failed to load clients";
        toast({ title: "Ошибка", description: message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [open]);

  const closeDialog = () => {
    setOpen(false);
    setClientId("");
    setDate("");
    setTime("");
    setDuration("60");
    setPrice("3000.00");
    setNotes("");
    setPaymentLink(null);
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const start = new Date(`${date}T${time}`);
      const created = await api.createSession({
        client_id: Number(clientId),
        start_time: start.toISOString(),
        duration_minutes: Number(duration),
        price: Number(price).toFixed(2),
        notes: notes || null,
      });
      const link = `${window.location.origin}/pay/${created.id}`;
      setPaymentLink(link);
      toast({ title: "Сессия создана" });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to create session";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? closeDialog() : setOpen(true))}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Создать сессию
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая сессия</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка клиентов...</p>
          ) : (
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">Выберите клиента</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="Длительность (мин)"
            />
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Цена (RUB)"
            />
          </div>
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Заметки (опционально)"
          />
          <Button onClick={handleCreate} disabled={!canSubmit || submitting} className="w-full">
            {submitting ? "Создание..." : "Создать"}
          </Button>
          {paymentLink && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 text-muted-foreground">Ссылка для клиента:</p>
              <a
                className="inline-flex items-center gap-1 text-primary underline"
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
              >
                <Link2 className="h-3.5 w-3.5" />
                {paymentLink}
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
