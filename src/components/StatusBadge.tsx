import { Badge } from "@/components/ui/badge";
import { SessionStatus, statusLabels, statusVariants } from "@/lib/data";

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
