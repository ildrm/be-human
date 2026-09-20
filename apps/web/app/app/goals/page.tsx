import type { Metadata } from 'next';
import { GoalsWorkspace } from './workspace';
export const metadata: Metadata = { title: 'Goals' };
export default function GoalsPage() { return <GoalsWorkspace />; }
