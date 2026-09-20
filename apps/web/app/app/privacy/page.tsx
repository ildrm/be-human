import type { Metadata } from 'next';
import { PrivacyWorkspace } from './workspace';
export const metadata: Metadata = { title: 'Privacy and data' };
export default function PrivacyPage() { return <PrivacyWorkspace />; }
