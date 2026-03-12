import { FormEvent, useEffect, useState } from "react";
import { Clock, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, CancellationRuleDto } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [rule, setRule] = useState<CancellationRuleDto | null>(null);
  const [hoursBefore, setHoursBefore] = useState("24");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRule = async () => {
    setLoading(true);
    try {
      const data = await api.getCancellationRule();
      setRule(data);
      setHoursBefore(String(data.hours_before));
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to load settings";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRule();
  }, []);

  const updateRule = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateCancellationRule({
        hours_before: Number(hoursBefore),
        penalty_amount: null,
      });
      setRule(updated);
      setHoursBefore(String(updated.hours_before));
      toast({ title: "Правило обновлено" });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Failed to update rule";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Правило отмены и бизнес-логика Rule24
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium">Cancellation rule</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          По умолчанию окно отмены 24 часа. Поздняя отмена (&lt; окна) = полный
          штраф равный цене конкретной сессии (`session.price`).
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : (
          <form onSubmit={updateRule} className="space-y-3">
            <Input
              type="number"
              min={1}
              max={168}
              value={hoursBefore}
              onChange={(event) => setHoursBefore(event.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить правило"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadRule()}>
                <RefreshCcw className="h-4 w-4 mr-1" />
                Обновить
              </Button>
            </div>
            {rule && (
              <p className="text-xs text-muted-foreground">
                Текущее правило: {rule.hours_before}ч, legacy penalty_amount:{" "}
                {rule.penalty_amount ?? "null"}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
