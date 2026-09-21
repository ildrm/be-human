import Link from 'next/link';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Set up your first plan' };

export default function Onboarding() {
  return <main className="onboarding-shell">
    <Link className="brand" href="/"><span className="brand-mark">BH</span><span>Be Human</span></Link>
    <section className="onboarding-card">
      <p className="eyebrow">Step 1 of 4 · about 2 minutes</p>
      <h1>What needs to fit today?</h1>
      <p className="lede">Start with only what changes the plan. You can add context later, skip sensitive questions, or change any answer.</p>
      <OnboardingForm />
    </section>
  </main>;
}
