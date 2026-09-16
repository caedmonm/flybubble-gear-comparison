import Catalogue from '@/components/catalogue';
import rows from '@/data/catalogue-rows.json';
import images from '@/data/images.json';
import { buildCatalogue } from '@/shared/catalogue.mjs';

export default function CataloguePage({
  category,
}: {
  category: 'Wings' | 'Reserves';
}) {
  return (
    <Catalogue
      key={category}
      category={category}
      initialProducts={buildCatalogue(rows, images)}
    />
  );
}
