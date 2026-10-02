import Catalogue from '@/components/catalogue';
import rows from '@/data/catalogue-rows.json';
import images from '@/data/images.json';
import { buildCatalogue } from '@/shared/catalogue.mjs';

export default function CataloguePage({
  category,
  initialSearch,
}: {
  category: 'Wings' | 'Reserves';
  initialSearch?: string;
}) {
  return (
    <Catalogue
      key={category}
      category={category}
      initialSearch={initialSearch}
      initialProducts={buildCatalogue(rows, images)}
    />
  );
}
