import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CreateSessionButton() {
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/demo") ? "/demo" : "/app";

  return (
    <Button asChild size="sm" className="gap-2">
      <Link to={`${basePath}/sessions#create-session`}>
        <Plus className="h-4 w-4" />
        Создать сессию
      </Link>
    </Button>
  );
}
