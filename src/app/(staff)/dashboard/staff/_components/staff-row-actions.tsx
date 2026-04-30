"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Role } from "@/lib/auth/permissions";
import { canActOnRole } from "@/lib/validators/staff";

import {
  deactivateStaff,
  reactivateStaff,
  resetStaffPassword,
  type ResetStaffPasswordResult,
} from "../actions";

type Target = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  deactivated: boolean;
};

export function StaffRowActions({
  actorRole,
  actorId,
  target,
}: {
  actorRole: Role;
  actorId: string;
  target: Target;
}) {
  // The actor's role determines which actions are even available.
  const canManageThisRow = canActOnRole(actorRole, target.role);

  return (
    <div className="inline-flex items-center gap-1">
      <Link
        href={`/dashboard/staff/${target.id}`}
        className={buttonVariants({ size: "sm", variant: "ghost" })}
        aria-label={`Edit ${target.firstName} ${target.lastName}`}
      >
        Edit
      </Link>

      {canManageThisRow && !target.deactivated && (
        <ResetPasswordButton target={target} />
      )}

      {canManageThisRow && (
        <DeactivateButton
          target={target}
          actorIsSelf={actorId === target.id}
          actorRole={actorRole}
        />
      )}
    </div>
  );
}

/* ───────────────────── Reset password ───────────────────── */

function ResetPasswordButton({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResetStaffPasswordResult | null>(null);

  function handleReset() {
    startTransition(async () => {
      const r = await resetStaffPassword(target.id);
      setResult(r);
    });
  }

  function close() {
    setOpen(false);
    setTimeout(() => setResult(null), 200);
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Reset password
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent>
          {result && "ok" in result ? (
            <ResetSuccessView result={result} onClose={close} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Generate a new temporary password for{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>{" "}
                  ({target.email}). Their next sign-in will require a reset.
                </DialogDescription>
              </DialogHeader>
              {result && "error" in result && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {result.error}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={handleReset} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetSuccessView({
  result,
  onClose,
}: {
  result: { ok: true; tempPassword: string; emailSent: boolean; emailError?: string };
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              {result.emailSent
                ? "Email sent with the new temporary password."
                : "Email could not be sent — share the password manually."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Temporary password
        </div>
        <code className="block rounded bg-white px-3 py-2 font-mono text-sm">
          {result.tempPassword}
        </code>
        {!result.emailSent && result.emailError && (
          <p className="text-xs text-destructive">
            Email error: {result.emailError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}

/* ───────────────────── Deactivate / Reactivate ───────────────────── */

function DeactivateButton({
  target,
  actorIsSelf,
  actorRole,
}: {
  target: Target;
  actorIsSelf: boolean;
  actorRole: Role;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const action = target.deactivated ? "Reactivate" : "Deactivate";

  function handle() {
    setError(null);
    startTransition(async () => {
      const r = target.deactivated
        ? await reactivateStaff(target.id)
        : await deactivateStaff(target.id);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={
          target.deactivated ? "text-green-700" : "text-destructive"
        }
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {action}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action} staff</DialogTitle>
            <DialogDescription>
              {target.deactivated ? (
                <>
                  Reactivate{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>
                  ? They&apos;ll be able to sign in again.
                </>
              ) : (
                <>
                  Deactivate{" "}
                  <strong>
                    {target.firstName} {target.lastName}
                  </strong>
                  {actorIsSelf ? " (yourself)" : ""}? They lose access
                  immediately and existing sessions are invalidated.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actorIsSelf && actorRole === "super_user" && !target.deactivated && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You&apos;re deactivating yourself. The action will fail if you
              are the only active super user.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={handle}
              disabled={pending}
              variant={target.deactivated ? "default" : "destructive"}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Working…
                </>
              ) : (
                action
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
