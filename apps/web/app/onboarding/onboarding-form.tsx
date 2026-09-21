'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Draft = { priorities: string[]; commitments: string };
const priorities = ['Protect sleep & recovery', 'Reduce overload', 'Make room for family', 'Move a meaningful goal', 'Steady finances', 'Something else'];

function storedDraft(): Draft {
  if (typeof window === 'undefined') return { priorities: [], commitments: '' };
  const saved = window.localStorage.getItem('be-human:onboarding-draft:v1');
  if (!saved) return { priorities: [], commitments: '' };
  try {
    const draft = JSON.parse(saved) as Draft;
    return { priorities: Array.isArray(draft.priorities) ? draft.priorities.slice(0, 2) : [], commitments: typeof draft.commitments === 'string' ? draft.commitments : '' };
  } catch { window.localStorage.removeItem('be-human:onboarding-draft:v1'); return { priorities: [], commitments: '' }; }
}

export function OnboardingForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(storedDraft);
  const [message, setMessage] = useState('');

  function toggle(priority: string) {
    setMessage('');
    if (draft.priorities.includes(priority)) {
      setDraft({ ...draft, priorities: draft.priorities.filter((item) => item !== priority) });
    } else if (draft.priorities.length >= 2) {
      setMessage('Choose no more than two priorities.');
    } else {
      setDraft({ ...draft, priorities: [...draft.priorities, priority] });
    }
  }

  function save(destination: string) {
    window.localStorage.setItem('be-human:onboarding-draft:v1', JSON.stringify(draft));
    router.push(destination);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save('/app/today');
  }

  return <form className="setup-form" onSubmit={submit}>
    <fieldset><legend>Choose up to two priorities</legend><div className="choice-grid">
      {priorities.map((label) => <label className="choice" key={label}><input type="checkbox" name="priority" value={label} checked={draft.priorities.includes(label)} onChange={() => toggle(label)} /><span>{label}</span></label>)}
    </div></fieldset>
    <label className="field"><span>What is fixed today?</span><textarea name="commitments" rows={3} value={draft.commitments} onChange={(event) => setDraft((current) => ({ ...current, commitments: event.target.value }))} placeholder="For example: work 09:00–17:00, school pickup 17:30" /><small>This helps us avoid suggesting impossible times.</small></label>
    {message && <p className="form-error" role="alert">{message}</p>}
    <div className="form-actions"><button type="button" className="button ghost" onClick={() => save('/')}>Save and leave</button><button className="button primary">Continue</button></div>
  </form>;
}
