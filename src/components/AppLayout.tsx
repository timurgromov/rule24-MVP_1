import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CreateSessionButton } from "@/components/CreateSessionButton";
import { api, ApiError, AuthUser } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

export default function AppLayout() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setCurrentUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearAccessToken();
          window.location.href = "/login";
        }
      });
  }, []);

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
