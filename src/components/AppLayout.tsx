import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CreateSessionButton } from "@/components/CreateSessionButton";
import { Button } from "@/components/ui/button";
import { api, ApiError, AuthUser, ClientDto, SessionDto, SessionOutcomeType } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function AppLayout() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [attentionSessions, setAttentionSessions] = useState<SessionDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [confirmingSessionId, setConfirmingSessionId] = useState<number | null>(null);
  const { pathname } = useLocation();
  const isAuthenticatedApp = pathname.startsWith("/app");
  const isDemoApp = pathname.startsWith("/demo");

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );

  useEffect(() => {
    api
      .me()
      .then(setCurrentUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticatedApp) {
      setAttentionSessions([]);
      return;
    }

    const loadAttentionData = () => {
      Promise.all([api.listSessionsRequiresAttention(), api.listClients()])
        .then(([sessions, clientList]) => {
          setAttentionSessions(sessions);
          setClients(clientList);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) return;
          setAttentionSessions([]);
        });
    };

    loadAttentionData();

    const handleRefresh = () => loadAttentionData();
    window.addEventListener("rule24-attention-updated", handleRefresh);
    return () => window.removeEventListener("rule24-attention-updated", handleRefresh);
  }, [isAuthenticatedApp, pathname]);

  const confirmOutcome = async (sessionId: number, outcomeType: SessionOutcomeType) => {
    setConfirmingSessionId(sessionId);
    try {
      await api.confirmSessionOutcome(sessionId, { outcome_type: outcomeType });
      setAttentionSessions((current) => current.filter((session) => session.id !== sessionId));
      window.dispatchEvent(new Event("rule24-attention-updated"));
      toast({ title: "Итог подтвержден" });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Не удалось подтвердить итог";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    } finally {
      setConfirmingSessionId(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1 text-sm text-muted-foreground">
              {currentUser ? currentUser.email : ""}
            </div>
            <CreateSessionButton />
          </header>
          {isDemoApp && (
            <div className="border-b bg-primary/5 px-4 py-3">
              <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Это демо-версия Rule24</p>
                  <p className="text-xs text-muted-foreground">
                    Здесь показан ознакомительный сценарий. Для основной версии перейдите на главную страницу.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/">Перейти в основную версию</Link>
                </Button>
              </div>
            </div>
          )}
          {isAuthenticatedApp && attentionSessions.length > 0 && (
            <div className="border-b bg-amber-50 px-4 py-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">Требует внимания</h2>
                    <p className="text-sm text-muted-foreground">
                      Есть прошедшие сессии без подтвержденного итога
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900">
                    {attentionSessions.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {attentionSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-lg border border-amber-200 bg-background p-3 space-y-3"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {clientMap.get(session.client_id) ?? `Клиент #${session.client_id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.start_time).toLocaleString("ru-RU")} · {session.duration_minutes} мин · {session.price} RUB
                          </p>
                        </div>
                        <span className="text-xs font-medium text-amber-700">
                          Нужно подтвердить итог
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirmingSessionId === session.id}
                          onClick={() => void confirmOutcome(session.id, "completed")}
                        >
                          Сессия состоялась
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirmingSessionId === session.id}
                          onClick={() => void confirmOutcome(session.id, "late_cancellation")}
                        >
                          Поздняя отмена
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirmingSessionId === session.id}
                          onClick={() => void confirmOutcome(session.id, "no_show")}
                        >
                          Неявка
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <main className="flex-1 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
