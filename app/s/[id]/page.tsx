import { notFound } from 'next/navigation';
import CataloguePage from '@/components/catalogue-page';
import { shareLinkService } from '@/server/share-links.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Shared gear | Flybubble Compare',
  robots: { index: false, follow: false },
};

export default async function SharedCatalogue({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let target: string | null;
  try {
    target = await shareLinkService.resolve((await params).id);
  } catch {
    return (
      <main className="workspace">
        <h1>Shared links are temporarily unavailable</h1>
        <p>Please try again later.</p>
      </main>
    );
  }
  if (!target) notFound();
  const url = new URL(target, 'https://share.invalid');
  return (
    <CataloguePage
      category={url.pathname === '/reserves' ? 'Reserves' : 'Wings'}
      initialSearch={url.search}
    />
  );
}
