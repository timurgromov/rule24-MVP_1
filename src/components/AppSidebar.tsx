import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CalendarDays, Users, Settings, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAccessToken } from "@/lib/auth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/demo") ? "/demo" : "/app";
  const items = [
    { title: "Дашборд", url: basePath, icon: LayoutDashboard },
    { title: "Сессии", url: `${basePath}/sessions`, icon: CalendarDays },
    { title: "Клиенты", url: `${basePath}/clients`, icon: Users },
    { title: "Настройки", url: `${basePath}/settings`, icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <Link to="/" className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 hover:bg-sidebar-accent/50 transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          R
        </div>
        {!collapsed && <span className="text-base font-semibold text-foreground">Rule24</span>}
      </Link>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === basePath}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href="https://t.me/rule24support" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-xs">Написать в поддержку</span>}
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => {
            clearAccessToken();
            window.location.href = "/";
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-xs">Выйти</span>}
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
