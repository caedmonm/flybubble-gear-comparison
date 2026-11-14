import { labels } from '@/shared/import-fields.mjs';
export type Category = 'Wings' | 'Reserves';
export type Sheet = { name: string; data: string[][] };
export type Layout = {
  category: Category;
  include: boolean;
  header: number;
  mapping: string[];
};
export type Source = { value: string; url: string; evidence: string };
export type PhotoReview =
  | { status: 'found'; source: string; image: string; include: boolean }
  | { status: 'existing'; source?: string; image: string }
  | { status: 'missing' | 'error' };
export type Row = {
  id: string;
  location: string;
  category: Category;
  values: Record<string, string>;
  sources: Record<string, Source>;
  edited: Record<string, boolean>;
  selected: boolean;
  result?: 'added' | 'already exists';
};
export const label = (k: string) => (labels as Record<string, string>)[k];
