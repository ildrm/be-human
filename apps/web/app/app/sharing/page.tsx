import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SharingWorkspace } from './workspace';
export const metadata: Metadata = { title: 'Household sharing' };
export default function SharingPage() { return <Suspense fallback={<main className="loading-shell"><p>Loading sharing controls…</p></main>}><SharingWorkspace /></Suspense>; }
