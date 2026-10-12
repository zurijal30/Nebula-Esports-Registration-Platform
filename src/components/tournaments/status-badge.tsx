import { registrationLabels } from "@/lib/tournament-status";
import type { RegistrationStatus } from "@/types/tournament";

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  return <span className={`status-badge status-${status}`}><span className="small-dot" />{registrationLabels[status]}</span>;
}
