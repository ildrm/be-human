import type { Metadata } from 'next';
import { AuthenticatedToday } from './authenticated-today';
export const metadata: Metadata = { title: 'Today' };
export default function TodayPage() { return <AuthenticatedToday />; }
