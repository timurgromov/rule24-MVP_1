import { useState } from "react";
import { Session, statusLabels, fakeClients, Client } from "@/lib/data";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, DollarSign, ExternalLink, Copy, CreditCard, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  session: Session | null;
  onClose: () => void;
}

const auditLog = [
  { time: "10:00", event: "Сессия создана" },
  { time: "10:01", event: "Ссылка отправлена клиенту" },
  { time: "11:30", event: "Клиент открыл ссылку" },
  { time: "11:32", event: "Карта привязана" },
  { time: "09:45", event: "Клиент отменил (менее 24ч)" },
  { time: "09:46", event: "Статус → Поздняя отмена" },
  { time: "09:46", event: "Списание выполнено" },
];

export function SessionDetailDrawer({ session, onClose }: Props) {
  const [clients, setClients] = useState<Client[]>(fakeClients);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  if (!session) return null;

  const client = clients.find(c => c.name === session.clientName);
  const hasCard = client?.hasCard ?? false;
  const maskedCard = client?.maskedCard;

  const handleRemoveCard = () => {
    if (!client) return;
    setClients(prev =>
      prev.map(c => c.id === client.id ? { ...c, hasCard: false, maskedCard: undefined } : c)
    );
    setShowRemoveDialog(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/10" />
      <div className="relative w-full max-w-md bg-card border-l shadow-xl overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{session.clientName}</h2>
              <p className="text-sm text-muted-foreground">{session.date} · {session.time}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Статус</span>
              <StatusBadge status={session.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Стоимость</span>
              <span className="text-sm font-medium">{session.price.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Оплата</span>
              <span className={`text-sm font-medium ${session.isPaid ? 'text-primary' : 'text-destructive'}`}>
                {session.isPaid ? 'Получена' : 'Не зафиксирована'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Правило отмены</span>
              <span className="text-sm">24 часа</span>
            </div>
          </div>

          {/* Card status */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Карта клиента</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={hasCard ? "success" : "danger"} className="text-[11px] gap-1">
                  <CreditCard className="h-3 w-3" />
                  {hasCard ? "Привязана" : "Не привязана"}
                </Badge>
                {hasCard && maskedCard && (
                  <span className="text-xs font-mono text-muted-foreground">{maskedCard}</span>
                )}
              </div>
              {hasCard && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1 h-7"
                  onClick={() => setShowRemoveDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Отвязать
                </Button>
              )}
            </div>
          </div>

          {/* Payment link */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Ссылка для клиента</h3>
            <p className="text-xs text-muted-foreground">Отправьте клиенту для подтверждения записи и привязки карты.</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pay/${session.id}`);
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Скопировать
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/pay/${session.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Открыть
                </a>
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <DollarSign className="h-4 w-4 mr-2" /> Отметить как оплачено
            </Button>
          </div>

          {/* Audit log */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">История изменений</h3>
            <div className="space-y-0 border-l-2 border-border ml-2">
              {auditLog.map((entry, i) => (
                <div key={i} className="relative pl-5 pb-4 last:pb-0">
                  <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                  <p className="text-sm text-foreground">{entry.event}</p>
                  <p className="text-xs text-muted-foreground">{entry.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Remove card confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Отвязать карту — {session.clientName}?</AlertDialogTitle>
            <AlertDialogDescription>
              После этого автоматические списания для этого клиента больше не будут работать. Клиенту нужно будет привязать карту заново.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отменить</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Отвязать карту
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
