import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CreateSessionButton } from "@/components/CreateSessionButton";
import { api, ApiError, AuthUser } from "@/lib/api";

export default function AppLayout() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [requiresAttentionCount, setRequiresAttentionCount] = useState(0);
  const { pathname } = useLocation();
  const isAuthenticatedApp = pathname.startsWith("/app");

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
      setRequiresAttentionCount(0);
      return;
    }

    const loadRequiresAttention = () => {
      api
        .listSessionsRequiresAttention()
        .then((sessions) => setRequiresAttentionCount(sessions.length))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) return;
          setRequiresAttentionCount(0);
        });
    };

    loadRequiresAttention();

    const handleRefresh = () => loadRequiresAttention();
    window.addEventListener("rule24-attention-updated", handleRefresh);
    return () => window.removeEventListener("rule24-attention-updated", handleRefresh);
  }, [isAuthenticatedApp, pathname]);

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
          {isAuthenticatedApp && requiresAttentionCount > 0 && (
            <div className="border-b bg-amber-50 px-4 py-3">
              <Link
                to="/app/sessions#requires-attention"
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2 text-sm text-amber-900 transition-colors hover:bg-amber-100"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Требует внимания: есть сессии без подтвержденного исхода
                </span>
                <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium">
                  {requiresAttentionCount}
                </span>
              </Link>
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
