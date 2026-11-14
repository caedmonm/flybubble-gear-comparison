import { cookies } from 'next/headers';
import {
  configured,
  cookieName,
  validSession,
} from '@/server/admin-session.mjs';
import { writesConfigured } from '@/server/import-store.mjs';
import { ImportDesk } from './import-desk';
import './import.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Catalogue import | Flybubble',
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  const signedIn = validSession((await cookies()).get(cookieName)?.value);
  return (
    <ImportDesk
      initialSession={signedIn}
      enabled={configured()}
      canResearch={signedIn && !!process.env.DO_AI_KEY}
      canWrite={signedIn && writesConfigured()}
    />
  );
}
