"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LINEAR_NEXT, STATUS_LABEL, type CaseStatus } from "@/lib/utils/phase";

import { advancePhase } from "../actions";
import { RecordPaymentTrigger } from "./record-payment-trigger";

type Stage = "main" | "confirm-refused" | "gate-blocked";

type Props = {
  caseId: string;
  currentStatus: CaseStatus;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
};

const formatCad = (n: number) =>
  n.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function triggerLabel(status: CaseStatus): string | null {
  if (status === "closed") return null;
  if (status === "awaiting_decision") return "Mark decision →";
  if (status === "additional_info_requested") return "Choose next step →";
  if (status === "passport_requested" || status === "refused") {
    return "Mark case closed";
  }
  return "Advance to next phase →";
}

export function AdvanceDialog({
  caseId,
  currentStatus,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("main");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const label = triggerLabel(currentStatus);
  if (!label) return null;

  function close() {
    setOpen(false);
    // Reset internal state once the close animation has played out.
    setTimeout(() => {
      setStage("main");
      setError(null);
    }, 200);
  }

  function runAdvance(target: CaseStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advancePhase({ caseId, targetStatus: target });
      if ("error" in result) {
        setError(result.error);
        setStage("gate-blocked");
        return;
      }
      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger
        className={`${buttonVariants({ variant: "outline", size: "sm" })} ml-2`}
      >
        {label}
      </DialogTrigger>

      <DialogContent>
        {stage === "gate-blocked" ? (
          <GateBlockedView
            caseId={caseId}
            reason={error ?? "Phase advancement blocked"}
            quotedFeeCad={quotedFeeCad}
            retainerMinimumCad={retainerMinimumCad}
            collectedCad={collectedCad}
            onCancel={close}
          />
        ) : stage === "confirm-refused" ? (
          <ConfirmRefusedView
            pending={pending}
            onConfirm={() => runAdvance("refused")}
            onBack={() => setStage("main")}
          />
        ) : currentStatus === "awaiting_decision" ? (
          <DecisionBranchView
            pending={pending}
            onChoose={(target) => {
              if (target === "refused") {
                setStage("confirm-refused");
                return;
              }
              runAdvance(target);
            }}
          />
        ) : currentStatus === "additional_info_requested" ? (
          <AdditionalInfoBranchView
            pending={pending}
            onResubmit={() => runAdvance("submitted_to_ircc")}
            onClose={() => runAdvance("closed")}
          />
        ) : (
          <LinearConfirmView
            from={currentStatus}
            target={LINEAR_NEXT[currentStatus]!}
            pending={pending}
            onConfirm={() => runAdvance(LINEAR_NEXT[currentStatus]!)}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinearConfirmView({
  from,
  target,
  pending,
  onConfirm,
  onCancel,
}: {
  from: CaseStatus;
  target: CaseStatus;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Advance phase</DialogTitle>
        <DialogDescription>
          Move this case from <strong>{STATUS_LABEL[from]}</strong> to{" "}
          <strong>{STATUS_LABEL[target]}</strong>.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? "Working…" : "Confirm"}
        </Button>
      </DialogFooter>
    </>
  );
}

function DecisionBranchView({
  pending,
  onChoose,
}: {
  pending: boolean;
  onChoose: (target: CaseStatus) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Mark IRCC decision</DialogTitle>
        <DialogDescription>
          Pick the outcome IRCC has communicated for this case.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={pending}
          onClick={() => onChoose("passport_requested")}
        >
          Approved (Passport Requested)
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={pending}
          onClick={() => onChoose("additional_info_requested")}
        >
          Additional info requested by IRCC
        </Button>
        <Button
          className="w-full justify-start text-destructive"
          variant="outline"
          disabled={pending}
          onClick={() => onChoose("refused")}
        >
          Refused
        </Button>
      </div>
    </>
  );
}

function ConfirmRefusedView({
  pending,
  onConfirm,
  onBack,
}: {
  pending: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm refusal</DialogTitle>
        <DialogDescription>
          Marking this case as <strong>Refused</strong> is a final outcome and
          cannot be undone from the UI. Are you sure?
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Working…" : "Confirm refusal"}
        </Button>
      </DialogFooter>
    </>
  );
}

function AdditionalInfoBranchView({
  pending,
  onResubmit,
  onClose,
}: {
  pending: boolean;
  onResubmit: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Next step</DialogTitle>
        <DialogDescription>
          IRCC requested additional information. Resubmit once it&apos;s ready,
          or close the case if the client withdraws.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={pending}
          onClick={onResubmit}
        >
          Resubmit (back to Submitted to IRCC)
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          disabled={pending}
          onClick={onClose}
        >
          Close case
        </Button>
      </div>
    </>
  );
}

function GateBlockedView({
  caseId,
  reason,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
  onCancel,
}: {
  caseId: string;
  reason: string;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
  onCancel: () => void;
}) {
  const shortfall = Math.max(
    0,
    (retainerMinimumCad ?? quotedFeeCad) - collectedCad,
  );

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <DialogTitle>Cannot advance</DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <dl className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <Row label="Quoted fee" value={`$${formatCad(quotedFeeCad)} CAD`} />
        {retainerMinimumCad !== null && (
          <Row
            label="Retainer minimum"
            value={`$${formatCad(retainerMinimumCad)} CAD`}
          />
        )}
        <Row
          label="Received so far"
          value={`$${formatCad(collectedCad)} CAD`}
          emphasised={shortfall > 0}
        />
      </dl>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <RecordPaymentTrigger
          caseId={caseId}
          defaultAmount={shortfall > 0 ? shortfall : undefined}
          onSuccess={onCancel}
          triggerVariant="default"
          triggerSize="default"
          triggerClassName=""
        >
          Record payment →
        </RecordPaymentTrigger>
      </DialogFooter>
    </>
  );
}

function Row({
  label,
  value,
  emphasised = false,
}: {
  label: string;
  value: string;
  emphasised?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd
        className={`font-medium ${emphasised ? "text-destructive" : "text-stone-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}
