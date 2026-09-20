import Link from 'next/link';

export const metadata = { title: 'Set up your first plan' };

export default function Onboarding() {
  return <main className="onboarding-shell">
    <Link className="brand" href="/"><span className="brand-mark">BH</span><span>Be Human</span></Link>
    <section className="onboarding-card">
      <p className="eyebrow">Step 1 of 4 · about 2 minutes</p>
      <h1>What needs to fit today?</h1>
      <p className="lede">Start with only what changes the plan. You can add context later, skip sensitive questions, or change any answer.</p>
      <form className="setup-form">
        <fieldset><legend>Choose up to two priorities</legend><div className="choice-grid">
          {['Protect sleep & recovery','Reduce overload','Make room for family','Move a meaningful goal','Steady finances','Something else'].map((label) => <label className="choice" key={label}><input type="checkbox" name="priority" /><span>{label}</span></label>)}
        </div></fieldset>
        <label className="field"><span>What is fixed today?</span><textarea name="commitments" rows={3} placeholder="For example: work 09:00–17:00, school pickup 17:30" /><small>This helps us avoid suggesting impossible times.</small></label>
        <div className="form-actions"><button type="button" className="button ghost">Save and leave</button><Link href="/" className="button primary">Continue</Link></div>
      </form>
    </section>
  </main>;
}
