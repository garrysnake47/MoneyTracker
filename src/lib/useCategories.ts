'use client';

import { useEffect, useState } from 'react';

export interface SubcategoryOpt {
  id: number;
  name: string;
  isExpense: boolean;
}
export interface CategoryOpt {
  id: number;
  name: string;
  isExpense: boolean;
  subcategories: SubcategoryOpt[];
}

// Module-level cache so every editor instance shares one fetch.
let cache: CategoryOpt[] | null = null;
let inflight: Promise<CategoryOpt[]> | null = null;

async function load(): Promise<CategoryOpt[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => {
        cache = (d.categories ?? []) as CategoryOpt[];
        return cache;
      })
      .catch(() => {
        inflight = null; // allow retry on next mount
        return [] as CategoryOpt[];
      });
  }
  return inflight;
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryOpt[]>(cache ?? []);
  useEffect(() => {
    let live = true;
    load().then((c) => live && setCategories(c));
    return () => {
      live = false;
    };
  }, []);
  return categories;
}
