// Deterministic color pairing per staff id. Same id always gets the same
// pair, so a person reads as the same colour everywhere they show up.
//
// The class strings are kept as literals (not template-built) so Tailwind's
// JIT scanner can see and emit them.

export type AssigneeColor = {
  bg: string;
  fg: string;
  ring: string;
};

const PALETTE: AssigneeColor[] = [
  { bg: "bg-emerald-100", fg: "text-emerald-800", ring: "ring-emerald-200" },
  { bg: "bg-sky-100", fg: "text-sky-800", ring: "ring-sky-200" },
  { bg: "bg-amber-100", fg: "text-amber-800", ring: "ring-amber-200" },
  { bg: "bg-violet-100", fg: "text-violet-800", ring: "ring-violet-200" },
  { bg: "bg-rose-100", fg: "text-rose-800", ring: "ring-rose-200" },
  { bg: "bg-teal-100", fg: "text-teal-800", ring: "ring-teal-200" },
  { bg: "bg-indigo-100", fg: "text-indigo-800", ring: "ring-indigo-200" },
  { bg: "bg-pink-100", fg: "text-pink-800", ring: "ring-pink-200" },
  { bg: "bg-orange-100", fg: "text-orange-800", ring: "ring-orange-200" },
  { bg: "bg-cyan-100", fg: "text-cyan-800", ring: "ring-cyan-200" },
];

const UNASSIGNED: AssigneeColor = {
  bg: "bg-stone-100",
  fg: "text-stone-500",
  ring: "ring-stone-200",
};

export function assigneeColor(id: string | null | undefined): AssigneeColor {
  if (!id) return UNASSIGNED;

  // FNV-1a 32-bit. Stable, distributes UUIDs evenly across the palette.
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % PALETTE.length;
  return PALETTE[idx];
}
