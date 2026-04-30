import Link from "next/link";

const TABS = [
  { key: "documents", label: "Documents" },
  { key: "intake", label: "Intake form" },
  { key: "activity", label: "Activity" },
  { key: "tasks", label: "Tasks" },
  { key: "payments", label: "Payments" },
  { key: "notes", label: "Notes" },
] as const;

export type Tab = (typeof TABS)[number]["key"];

export const VALID_TABS = TABS.map((t) => t.key) as readonly Tab[];

export function CaseTabs({
  caseId,
  activeTab,
}: {
  caseId: string;
  activeTab: Tab;
}) {
  return (
    <nav className="flex gap-6 border-b border-stone-200">
      {TABS.map((t) => {
        const active = t.key === activeTab;
        const href =
          t.key === "documents"
            ? `/dashboard/cases/${caseId}`
            : `/dashboard/cases/${caseId}?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "-mb-px border-b-2 px-1 pb-2 text-sm transition-colors",
              active
                ? "border-[var(--navy)] font-medium text-[var(--navy)]"
                : "border-transparent text-stone-500 hover:text-stone-800",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
