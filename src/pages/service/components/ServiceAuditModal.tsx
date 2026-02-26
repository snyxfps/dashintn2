import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceAuditLog } from "./ServiceAuditLog";

export function ServiceAuditModal({
  open,
  onOpenChange,
  recordId,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recordId: string | null;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Histórico (Auditoria)"}</DialogTitle>
        </DialogHeader>

        {recordId ? <ServiceAuditLog recordId={recordId} /> : null}
      </DialogContent>
    </Dialog>
  );
}