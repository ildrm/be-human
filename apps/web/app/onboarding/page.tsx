import Link from 'next/link';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'How planning works' };

export default function Onboarding() {
  return <main className="onboarding-shell">
    <Link className="brand" href="/"><span className="brand-mark">BH</span><span>Be Human</span></Link>
    <section className="onboarding-card">
      <p className="eyebrow">How planning works</p>
      <h1>Start with what you know.</h1>
      <p className="lede">You can add commitments after signing in. No personal details are collected on this public page.</p>
      <OnboardingForm />
    </section>
  </main>;
}
