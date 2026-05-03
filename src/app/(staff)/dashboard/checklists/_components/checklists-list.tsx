"use client";

import { useMemo, useState } from "react";

import { NewCategoryDialog } from "@/components/checklists/new-category-dialog";
import {
  NewChecklistDialog,
  type NewChecklistCategory,
  type NewChecklistCopySource,
} from "@/components/checklists/new-checklist-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  CategoryCard,
  type CategoryCardData,
} from "./category-card";

export function ChecklistsList({
  categories,
  newDialogProps,
}: {
  categories: CategoryCardData[];
  newDialogProps: {
    categoryOptions: NewChecklistCategory[];
    copySources: NewChecklistCopySource[];
    subCategoriesByCategory: Record<string, string[]>;
  };
}) {
  const [query, setQuery] = useState("");
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newChecklistOpen, setNewChecklistOpen] = useState(false);
  const [newChecklistDefaultCategory, setNewChecklistDefaultCategory] =
    useState("");

  function openNewChecklist(categoryCode: string = "") {
    setNewChecklistDefaultCategory(categoryCode);
    setNewChecklistOpen(true);
  }

  // Filter checklists in-place per card. Cards themselves stay so the
  // category structure is still scannable while searching.
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.map((cat) => ({
      ...cat,
      checklists: cat.checklists.filter((c) =>
        c.name.toLowerCase().includes(q),
      ),
    }));
  }, [query, categories]);

  const hasCategories = categories.length > 0;
  const showSearch = categories.length >= 2;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => openNewChecklist("")}
            disabled={!hasCategories}
            title={!hasCategories ? "Create a category first" : undefined}
          >
            + New checklist
          </Button>
          <Button variant="outline" onClick={() => setNewCategoryOpen(true)}>
            + New category
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="relative max-w-sm">
          <Input
            type="search"
            placeholder="Search checklists by name…"
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
      )}

      {!hasCategories ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-stone-700">No categories yet.</p>
          <p className="mt-1 text-xs text-stone-500">
            Click + New category to create your first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.code}
              category={cat}
              onAddChecklist={openNewChecklist}
            />
          ))}
        </div>
      )}

      <NewCategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
      />

      <NewChecklistDialog
        open={newChecklistOpen}
        onOpenChange={setNewChecklistOpen}
        categories={newDialogProps.categoryOptions}
        copySources={newDialogProps.copySources}
        subCategoriesByCategory={newDialogProps.subCategoriesByCategory}
        defaultCategoryCode={newChecklistDefaultCategory}
      />
    </>
  );
}
