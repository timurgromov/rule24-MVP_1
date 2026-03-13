import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CreateSessionButton() {
  return (
    <Button asChild size="sm" className="gap-2">
      <Link to="/app/sessions#create-session">
        <Plus className="h-4 w-4" />
        Создать сессию
      </Link>
    </Button>
  );
}
