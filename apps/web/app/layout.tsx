import type { Metadata, Viewport } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import './globals.css';

const sans = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Be Human — Life fit, not life score', template: '%s · Be Human' },
  description: 'A calm, evidence-governed way to plan around your real capacity, commitments, values, and changing life.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f6f4ee' }, { media: '(prefers-color-scheme: dark)', color: '#171b19' }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>;
}
