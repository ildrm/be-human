'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-shell"><p className="eyebrow">A pause, not a failure</p><h1>We couldn’t load this view.</h1><p>Your saved plan has not been changed.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
