import type { Database } from "@/lib/supabase/types";

export type CaseStatus = Database["crm"]["Enums"]["case_status"];

/**
 * Maps a case_status to a phase index 1-6 used by the pipeline UI.
 * Closed cases return -1 and are rendered outside the pipeline.
 *
 * Mirrors crm.phase_of() in SQL but exposed for client-side use.
 */
export function phaseIndex(status: CaseStatus): number {
  switch (status) {
    case "retainer_signed":
      return 1;
    case "documentation_in_progress":
      return 2;
    case "documentation_review":
      return 3;
    case "submitted_to_ircc":
      return 4;
    case "biometrics_pending":
    case "biometrics_completed":
    case "awaiting_decision":
      return 5;
    case "passport_requested":
    case "refused":
    case "additional_info_requested":
      return 6;
    case "closed":
      return -1;
  }
}

export const PHASE_LABELS: Record<number, string> = {
  1: "Retainer",
  2: "Documents",
  3: "Review",
  4: "Submitted",
  5: "Biometrics",
  6: "Decision",
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  retainer_signed: "Retainer Signed",
  documentation_in_progress: "Documentation in Progress",
  documentation_review: "Documentation Review",
  submitted_to_ircc: "Submitted to IRCC",
  biometrics_pending: "Biometrics Pending",
  biometrics_completed: "Biometrics Completed",
  awaiting_decision: "Awaiting Decision",
  passport_requested: "Passport Requested",
  refused: "Refused",
  additional_info_requested: "Additional Info Requested",
  closed: "Closed",
};

/**
 * Linear forward target for statuses that advance to a single next status.
 * Branching statuses (awaiting_decision, additional_info_requested) are not
 * keyed here — the UI presents multiple options instead.
 */
export const LINEAR_NEXT: Partial<Record<CaseStatus, CaseStatus>> = {
  retainer_signed: "documentation_in_progress",
  documentation_in_progress: "documentation_review",
  documentation_review: "submitted_to_ircc",
  submitted_to_ircc: "biometrics_pending",
  biometrics_pending: "biometrics_completed",
  biometrics_completed: "awaiting_decision",
  passport_requested: "closed",
  refused: "closed",
};
