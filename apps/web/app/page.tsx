import { ArrowRight, CheckCircle2, LockKeyhole, Scale, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return <main className="landing-shell">
    <nav className="landing-nav" aria-label="Public navigation"><Link className="brand" href="/"><span className="brand-mark">BH</span><span>Be Human</span></Link><div><Link className="button ghost" href="/onboarding">How it works</Link><Link className="button primary" href="/login">Sign in</Link></div></nav>
    <section className="landing-hero"><p className="eyebrow">Life fit · not a life score</p><h1>Plan a human life without pretending every day is equal.</h1><p className="lede">Be Human helps your commitments, recovery, capacity, accessibility needs, and values fit together—without diagnosing you or turning your life into a leaderboard.</p><div className="landing-actions"><Link className="button primary" href="/login">Open your private space <ArrowRight /></Link><Link className="button secondary" href="/onboarding">See the planning approach</Link></div></section>
    <section className="promise-grid" aria-label="Product principles"><article><Scale/><h2>Constraints first</h2><p>Sleep, care, accessibility, fixed commitments, and professional restrictions cannot be cancelled out by unrelated positives.</p></article><article><Sparkles/><h2>Explainable suggestions</h2><p>Every recommendation separates your context, the calculation, evidence, uncertainty, and limitations.</p></article><article><LockKeyhole/><h2>Private by default</h2><p>Your records stay yours. Sharing is explicit, narrow, revocable, and enforced on the server.</p></article></section>
    <footer className="landing-footer"><span><CheckCircle2/> Planning support, not medical advice</span><span>Built for uncertainty, recovery, and real life.</span></footer>
  </main>;
}
