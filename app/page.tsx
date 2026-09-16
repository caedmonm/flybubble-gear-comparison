import { redirect } from 'next/navigation';
import rows from '@/data/catalogue-rows.json';
import { buildCatalogue } from '@/shared/catalogue.mjs';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string | string[] }>;
}) {
  const { selection } = await searchParams;
  let path = '/wings';
  if (typeof selection === 'string') {
    try {
      const selected = JSON.parse(selection);
      const products = buildCatalogue(rows);
      const first =
        Array.isArray(selected) &&
        selected
          .map((item) => products.find((product) => product.id === item?.id))
          .find(Boolean);
      if (first && first.category === 'Reserves') path = '/reserves';
    } catch {
      /* Invalid legacy comparison links still open the wing catalogue. */
    }
    redirect(`${path}?${new URLSearchParams({ selection })}`);
  }
  redirect(path);
}
