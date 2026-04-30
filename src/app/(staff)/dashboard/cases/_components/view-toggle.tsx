import { LayoutGrid, List as ListIcon } from "lucide-react";
import Link from "next/link";

export type CasesView = "list" | "board";

const TABS: ReadonlyArray<{
  key: CasesView;
  label: string;
  Icon: typeof ListIcon;
}> = [
  { key: "list", label: "List", Icon: ListIcon },
  { key: "board", label: "Board", Icon: LayoutGrid },
];

export function ViewToggle({ activeView }: { activeView: CasesView }) {
  return (
    <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5">
      {TABS.map(({ key, label, Icon }) => {
        const active = key === activeView;
        const href =
          key === "board" ? "/dashboard/cases" : `/dashboard/cases?view=${key}`;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-[var(--navy)] text-white"
                : "text-stone-600 hover:bg-stone-100",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
