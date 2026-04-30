"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ClientRow = {
  id: string;
  clientNumber: string;
  legalName: string;
  email: string | null;
  phone: string | null;
  citizenship: string | null;
  createdAt: string;
  totalCases: number;
  openCases: number;
};

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.legalName.toLowerCase().includes(q) ||
        r.clientNumber.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Input
          type="search"
          placeholder="Search by name, email, or client number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-white pl-9"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-stone-100 bg-stone-50/30 hover:bg-stone-50/30">
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Client #
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Name
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Email
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Phone
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Citizenship
              </TableHead>
              <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                Cases
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-sm text-stone-500"
                >
                  {rows.length === 0
                    ? "No clients yet."
                    : "No clients match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm text-stone-700">
                    {r.clientNumber}
                  </TableCell>
                  <TableCell className="font-medium">{r.legalName}</TableCell>
                  <TableCell className="text-stone-700">
                    {r.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-stone-700">
                    {r.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-stone-700">
                    {r.citizenship ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-sm text-stone-700">
                      <span className="font-semibold tabular-nums text-stone-900">
                        {r.openCases}
                      </span>
                      <span className="text-stone-400">/</span>
                      <span className="tabular-nums text-stone-500">
                        {r.totalCases}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="border-t border-stone-100 bg-stone-50/30 px-4 py-2.5 text-xs text-stone-500">
          {filtered.length} of {rows.length} client
          {rows.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
