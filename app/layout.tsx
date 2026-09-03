import type { Metadata } from 'next';
import './globals.css';
export async function generateMetadata(): Promise<Metadata> {
  const metadataBase=new URL(process.env.SITE_ORIGIN || 'http://localhost:3000');
  return {
  metadataBase,
  title: 'Flybubble Compare — Find your next flight',
  description: 'Explore and compare paragliding wings and reserves, size by size, using the Flybubble product catalogue.',
  openGraph: { title: 'Flybubble Compare', description: 'Your next flight starts with the right gear.', type: 'website', images:[{url:new URL('/og.png',metadataBase).href,width:1731,height:909,alt:'Flybubble Compare — Find your next flight.'}] },
  twitter: { card: 'summary_large_image', title: 'Flybubble Compare', description: 'Your next flight starts with the right gear.',images:[new URL('/og.png',metadataBase).href] },
  icons:{icon:'/favicon.svg'},
};
}
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
