'use client';

import {
  Accessibility, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, Clock3,
  Coffee, Compass, Home, Leaf, LogOut, Menu, Moon, MoreHorizontal, ShieldCheck, Sparkles, SunMedium, Trash2, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Mode = 'stability' | 'growth' | 'recovery' | 'survival';
type Appearance = 'light' | 'dark' | 'contrast';
type Capacity = { physical: number; cognitive: number; emotional: number; executive: number };
type PlanItem = {
  id: string; title: string; startsAt: string; endsAt: string; fixed: boolean; essential: boolean;
  status: 'planned' | 'completed' | 'skipped'; demand?: { detail?: string; category?: string };
};
type Plan = { id: string; planDate: string; mode: Mode; feasible: boolean; explanation?: { bufferMinutes?: number; summary?: string }; items: PlanItem[] };
export type TodayData = { greeting: string; timezone: string; plan: Plan | null; goals: unknown[]; capacity: Capacity | null; bufferMinutes: number; confidence: string };
type WeekPlan = Plan & { timezone: string };
type Drawer = 'evidence' | 'week' | 'add' | 'map' | 'capacity' | 'accessibility' | 'account' | 'task' | null;

const nav = [
  { label: 'Today', icon: Home, href: '/app/today', active: true },
  { label: 'Plan', icon: CalendarDays, href: '#today-plan' },
  { label: 'Life map', icon: Compass, href: '#life-map' },
  { label: 'Goals', icon: Sparkles, href: '/app/goals' },
  { label: 'Insights', icon: BookOpen, href: '#fit-heading' },
];

const fit = [
  { label: 'Essential stability', status: 'Supported', note: 'Today’s basics are covered', tone: 'good' },
  { label: 'Sleep & recovery', status: 'Strained', note: '2h 10m estimated debt · low confidence', tone: 'watch' },
  { label: 'Demand & capacity', status: 'Little buffer', note: 'Evening is the tightest period', tone: 'watch' },
  { label: 'Social connection', status: 'Supported', note: 'Family time is protected', tone: 'good' },
  { label: 'Financial resilience', status: 'Unknown', note: 'Add only if useful to your planning', tone: 'neutral' },
];

const defaultCapacity: Capacity = { physical: 48, cognitive: 56, emotional: 42, executive: 51 };

function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BH'; }
function dateLabel(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year!, month! - 1, day));
}
function timeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }).format(new Date(value));
}
function durationMinutes(item: PlanItem) { return Math.max(5, Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60_000)); }
function storedAppearance(): Appearance {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('be-human:appearance:v1');
  return saved && ['light', 'dark', 'contrast'].includes(saved) ? saved as Appearance : 'light';
}

export function LifeOS({ displayName, email, initialToday }: { displayName: string; email: string; initialToday: TodayData }) {
  const router = useRouter();
  const [today, setToday] = useState(initialToday);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [selectedTask, setSelectedTask] = useState<PlanItem | null>(null);
  const [week, setWeek] = useState<WeekPlan[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(storedAppearance);
  const [suggestionVisible, setSuggestionVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const tasks = useMemo(() => today.plan?.items ?? [], [today.plan?.items]);
  const capacity = today.capacity ?? defaultCapacity;
  const doneCount = useMemo(() => tasks.filter((task) => task.status === 'completed').length, [tasks]);
  const planDate = today.plan?.planDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    window.localStorage.setItem('be-human:appearance:v1', appearance);
  }, [appearance]);
  useEffect(() => {
    if (!drawer) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawer(null); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [drawer]);

  async function refreshToday() {
    const result = await api<{ data: TodayData }>('today');
    setToday(result.data);
  }

  async function mutate(work: () => Promise<unknown>, success: string, close = true) {
    setBusy(true); setError(''); setMessage('');
    try {
      await work();
      await refreshToday();
      setMessage(success);
      if (close) setDrawer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  async function openWeek() {
    setDrawer('week'); setBusy(true); setError('');
    try {
      const result = await api<{ data: WeekPlan[] }>(`plans/week?start=${encodeURIComponent(planDate)}`);
      setWeek(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The week plan could not be loaded.');
    } finally { setBusy(false); }
  }

  function changeMode(mode: Mode) {
    if (!today.plan) return;
    void mutate(() => api(`plans/${today.plan!.id}/mode`, { method: 'PATCH', body: JSON.stringify({ mode }) }), `Mode changed to ${titleCase(mode)}.`, false);
  }

  function toggleTask(task: PlanItem) {
    const status = task.status === 'completed' ? 'planned' : 'completed';
    void mutate(() => api(`plans/items/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }), status === 'completed' ? `${task.title} completed.` : `${task.title} reopened.`, false);
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void mutate(() => api('plans/items', { method: 'POST', body: JSON.stringify({
      planDate: String(values.get('planDate')), title: String(values.get('title')), startTime: String(values.get('startTime')),
      durationMinutes: Number(values.get('durationMinutes')), detail: String(values.get('detail') || 'Added by you'),
      category: String(values.get('category')), mode: today.plan?.mode ?? 'stability',
    }) }), 'Added to your plan.');
  }

  function updateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const values = new FormData(event.currentTarget);
    void mutate(() => api(`plans/items/${selectedTask.id}`, { method: 'PATCH', body: JSON.stringify({
      title: String(values.get('title')), startTime: String(values.get('startTime')),
      durationMinutes: Number(values.get('durationMinutes')), detail: String(values.get('detail') || 'Updated by you'),
      category: String(values.get('category')), essential: values.get('essential') === 'on',
    }) }), 'Plan item updated.');
  }

  function correctCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void mutate(() => api('today/capacity', { method: 'POST', body: JSON.stringify({
      physical: Number(values.get('physical')), cognitive: Number(values.get('cognitive')),
      emotional: Number(values.get('emotional')), executive: Number(values.get('executive')),
    }) }), 'Capacity estimate updated.');
  }

  function openTask(task: PlanItem) { setSelectedTask(task); setDrawer('task'); setError(''); }

  async function signOut() {
    setBusy(true); setError('');
    try {
      await api('auth/logout', { method: 'POST' });
      window.setTimeout(() => { router.replace('/login'); router.refresh(); }, 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out.');
      setBusy(false);
    }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to today</a>
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-top"><a className="brand" href="#main"><span className="brand-mark">BH</span><span>Be Human</span></a><button className="icon-button mobile-only" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></button></div>
      <nav className="nav-list">{nav.map(({ label, icon: Icon, href, active }) => <Link href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} key={label} onClick={() => setMobileNav(false)}><Icon aria-hidden="true"/><span>{label}</span>{active && <span className="nav-pip" />}</Link>)}</nav>
      <div className="sidebar-context"><p className="eyebrow">Your current focus</p><div className="focus-card"><span className="focus-icon"><Leaf /></span><div><strong>Restore capacity</strong><span>This week</span></div></div></div>
      <div className="sidebar-bottom"><Link href="/app/privacy"><ShieldCheck/><span>Privacy & sharing</span></Link><Link href="/onboarding"><CircleHelp/><span>How this works</span></Link><button className="sidebar-action" onClick={() => setDrawer('account')}><LogOut/><span>Account & sign out</span></button><button className="profile-chip" onClick={() => setDrawer('account')}><span className="avatar">{initials(displayName)}</span><span><strong>{displayName}</strong><small>{email}</small></span><MoreHorizontal /></button></div>
    </aside>

    <main id="main" className="main-content">
      <header className="topbar"><button className="icon-button mobile-only" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></button><div className="today-label"><SunMedium aria-hidden="true"/><span>{dateLabel(planDate)}</span></div><div className="top-actions"><label className="appearance-label"><span className="sr-only">Appearance</span><select value={appearance} onChange={(event) => setAppearance(event.target.value as Appearance)}><option value="light">Light</option><option value="dark">Dark</option><option value="contrast">High contrast</option></select></label><button className="icon-button" aria-label="Accessibility settings" onClick={() => setDrawer('accessibility')}><Accessibility /></button><button className="avatar-button" aria-label="Open account menu" onClick={() => setDrawer('account')}>{initials(displayName)}</button></div></header>

      <div className="content-wrap">
        <div className="status-region" aria-live="polite">{message && <p className="form-message">{message}</p>}{error && <p className="form-error">{error}</p>}</div>
        <section className="welcome-row"><div><p className="eyebrow">Today · your local plan</p><h1>Good morning, {displayName.split(' ')[0]}.</h1><p className="lede">{today.plan?.explanation?.summary ?? 'Build a realistic plan with room for life to happen.'}</p></div><div className="mode-control"><label htmlFor="mode">Operating mode</label><select id="mode" value={today.plan?.mode ?? 'stability'} disabled={!today.plan || busy} onChange={(event) => changeMode(event.target.value as Mode)}><option value="stability">Stability</option><option value="growth">Growth</option><option value="recovery">Recovery</option><option value="survival">Survival</option></select><span className="mode-note">You’re always in control</span></div></section>

        <section className="notice" aria-labelledby="adapt-heading"><span className="notice-icon"><Leaf /></span><div><h2 id="adapt-heading">Your plan adapted for {today.plan?.mode ?? 'stability'} mode</h2><p>{today.plan?.mode === 'recovery' || today.plan?.mode === 'survival' ? 'Optional load stays low while care and recovery remain protected.' : 'Optional goals stay visible when capacity permits; fixed constraints remain protected.'}</p></div><button className="text-button" onClick={() => setDrawer('evidence')}>See what changed <ArrowRight /></button></section>

        <div className="dashboard-grid">
          <section className="panel schedule-panel" aria-labelledby="today-plan"><div className="panel-header"><div><p className="eyebrow">Your day</p><h2 id="today-plan">A plan with breathing room</h2></div><span className="completion">{doneCount} of {tasks.length} checked</span></div>
            {tasks.length ? <ol className="timeline">{tasks.map((task) => <li className={task.status === 'completed' ? 'done' : ''} key={task.id}><time dateTime={task.startsAt}>{timeLabel(task.startsAt, today.timezone)}</time><span className={`timeline-dot ${task.demand?.category ?? 'personal'}`} /><button className="task-check" aria-label={`${task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} aria-pressed={task.status === 'completed'} disabled={busy} onClick={() => toggleTask(task)}>{task.status === 'completed' && <Check />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.demand?.detail ?? `${durationMinutes(task)} min`}</span></div><button className="icon-button quiet" aria-label={`More options for ${task.title}`} onClick={() => openTask(task)}><MoreHorizontal /></button></li>)}</ol> : <div className="empty-plan"><p>No items yet. Start with one commitment that matters today.</p></div>}
            <div className="schedule-footer"><button className="button secondary" onClick={() => void openWeek()}><CalendarDays /> Open week plan</button><button className="text-button" onClick={() => { setError(''); setDrawer('add'); }}>Add something <span aria-hidden="true">+</span></button></div>
          </section>

          <div className="side-stack">
            <section className="panel capacity-panel" aria-labelledby="capacity-heading"><div className="panel-header"><div><p className="eyebrow">Capacity estimate</p><h2 id="capacity-heading">Energy is limited today</h2></div><span className="confidence">{titleCase(today.confidence)} confidence</span></div><p>Based on your latest check-in—not a clinical measurement.</p><div className="capacity-list" role="list">{Object.entries(capacity).map(([label, value]) => <div className="capacity-row" role="listitem" key={label}><span>{titleCase(label)}</span><div className="meter" role="meter" aria-label={`${label} capacity estimate`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}</div><button className="text-button" onClick={() => setDrawer('capacity')}>Correct this estimate <ChevronRight /></button></section>

            <section className="panel buffer-panel" aria-labelledby="buffer-heading"><div className="buffer-visual" aria-hidden="true"><Clock3 /><span>{today.bufferMinutes}<small>min</small></span></div><div><p className="eyebrow">Protected buffer</p><h2 id="buffer-heading">Life can run late</h2><p>Your plan keeps {today.bufferMinutes} minutes unfilled. This is resilience, not wasted time.</p></div></section>

            {suggestionVisible && <section className="panel suggestion-panel" aria-labelledby="suggestion-heading"><span className="suggestion-icon"><Coffee /></span><div><p className="eyebrow">Gentle suggestion</p><h2 id="suggestion-heading">Move the project review?</h2><p>Your recent data suggests late mornings are steadier than early ones.</p><div className="suggestion-actions"><button className="button small primary" disabled={busy || !tasks.some((task) => task.title === 'Project review')} onClick={() => { const task = tasks.find((item) => item.title === 'Project review'); if (task) void mutate(() => api(`plans/items/${task.id}`, { method: 'PATCH', body: JSON.stringify({ startTime: '10:00' }) }), 'Project review moved to 10:00.', false); }}>Move to 10:00</button><button className="button small ghost" onClick={() => { setSuggestionVisible(false); setMessage('Suggestion dismissed.'); }}>Keep it</button></div><button className="why-link" onClick={() => setDrawer('evidence')}>Why am I seeing this?</button></div></section>}
          </div>
        </div>

        <section className="fit-section" id="life-map" aria-labelledby="fit-heading"><div className="section-heading"><div><p className="eyebrow">Life fit · not a life score</p><h2 id="fit-heading">What feels supported, strained, or still unknown</h2></div><button className="button secondary" onClick={() => setDrawer('map')}>Explore your life map <ArrowRight /></button></div><div className="fit-grid">{fit.map((item) => <button type="button" key={item.label} className="fit-card" onClick={() => setDrawer('map')}><span className={`status-mark ${item.tone}`} aria-hidden="true" /><span><h3>{item.label}</h3><strong>{item.status}</strong><p>{item.note}</p></span><ChevronRight aria-hidden="true" /></button>)}</div></section>

        <footer className="app-footer"><span><ShieldCheck /> Private by default</span><span>Planning support, not medical advice</span><a href="#evidence" onClick={(event) => { event.preventDefault(); setDrawer('evidence'); }}>Evidence & limitations</a></footer>
      </div>
    </main>

    {mobileNav && <button className="backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    {drawer && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDrawer(null); }}><section className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button className="icon-button drawer-close" aria-label="Close panel" autoFocus onClick={() => setDrawer(null)}><X /></button>
      {drawer === 'week' && <><p className="eyebrow">Seven-day view</p><h2 id="drawer-title">Your week plan</h2><p className="drawer-lede">See what is planned without losing sight of breathing room.</p>{busy && !week.length ? <p className="drawer-status">Loading your week…</p> : <div className="week-list">{Array.from({ length: 7 }, (_, index) => { const date = new Date(`${planDate}T12:00:00`); date.setDate(date.getDate() + index); const key = date.toISOString().slice(0, 10); const day = week.find((entry) => entry.planDate.slice(0, 10) === key); return <article key={key}><div><strong>{dateLabel(key)}</strong><span>{day?.items.length ?? 0} items</span></div>{day?.items.length ? <ul>{day.items.map((item) => <li key={item.id}><time>{timeLabel(item.startsAt, day.timezone)}</time>{item.title}</li>)}</ul> : <p>Nothing planned yet.</p>}</article>; })}</div>}<div className="drawer-actions"><button className="button primary" onClick={() => { setDrawer('add'); setError(''); }}>Add to this week</button></div></>}
      {drawer === 'add' && <><p className="eyebrow">Plan an item</p><h2 id="drawer-title">Add something</h2><p className="drawer-lede">Keep it realistic. You can edit or remove it later.</p><form className="drawer-form" onSubmit={addItem}><label className="field"><span>Title</span><input name="title" required maxLength={160} autoFocus /></label><div className="field-pair"><label className="field"><span>Date</span><input name="planDate" type="date" defaultValue={planDate} required /></label><label className="field"><span>Start time</span><input name="startTime" type="time" defaultValue="10:00" required /></label></div><div className="field-pair"><label className="field"><span>Duration</span><select name="durationMinutes" defaultValue="30"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option></select></label><label className="field"><span>Type</span><select name="category" defaultValue="personal"><option value="personal">Personal</option><option value="work">Work</option><option value="care">Care</option><option value="recovery">Recovery</option><option value="movement">Movement</option><option value="connection">Connection</option><option value="buffer">Buffer</option></select></label></div><label className="field"><span>Helpful detail</span><input name="detail" maxLength={500} placeholder="Optional context" /></label>{error && <p className="form-error">{error}</p>}<div className="drawer-actions"><button className="button primary" disabled={busy}>{busy ? 'Adding…' : 'Add to plan'}</button><button type="button" className="button ghost" onClick={() => setDrawer(null)}>Cancel</button></div></form></>}
      {drawer === 'task' && selectedTask && <><p className="eyebrow">Plan item</p><h2 id="drawer-title">Edit {selectedTask.title}</h2><form className="drawer-form" onSubmit={updateItem}><label className="field"><span>Title</span><input name="title" required maxLength={160} defaultValue={selectedTask.title} /></label><div className="field-pair"><label className="field"><span>Start time</span><input name="startTime" type="time" required defaultValue={timeLabel(selectedTask.startsAt, today.timezone)} /></label><label className="field"><span>Duration</span><input name="durationMinutes" type="number" min="5" max="1440" required defaultValue={durationMinutes(selectedTask)} /></label></div><label className="field"><span>Type</span><select name="category" defaultValue={selectedTask.demand?.category ?? 'personal'}><option value="personal">Personal</option><option value="work">Work</option><option value="care">Care</option><option value="recovery">Recovery</option><option value="movement">Movement</option><option value="connection">Connection</option><option value="buffer">Buffer</option></select></label><label className="field"><span>Helpful detail</span><input name="detail" maxLength={500} defaultValue={selectedTask.demand?.detail ?? ''} /></label><label className="choice compact"><input type="checkbox" name="essential" defaultChecked={selectedTask.essential} /> Essential today</label>{error && <p className="form-error">{error}</p>}<div className="drawer-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><button type="button" className="button danger" disabled={busy} onClick={() => void mutate(() => api(`plans/items/${selectedTask.id}`, { method: 'DELETE' }), `${selectedTask.title} removed.`)}><Trash2 /> Remove</button></div></form></>}
      {drawer === 'capacity' && <><p className="eyebrow">Your correction</p><h2 id="drawer-title">How much capacity do you have?</h2><p className="drawer-lede">Your input replaces the current estimate. This is planning context, not a health assessment.</p><form className="drawer-form" onSubmit={correctCapacity}>{Object.entries(capacity).map(([label, value]) => <label className="range-field" key={label}><span><strong>{titleCase(label)}</strong><output>{value}%</output></span><input type="range" name={label} min="0" max="100" defaultValue={value} onInput={(event) => { const output = event.currentTarget.parentElement?.querySelector('output'); if (output) output.textContent = `${event.currentTarget.value}%`; }} /></label>)}{error && <p className="form-error">{error}</p>}<div className="drawer-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Use my estimate'}</button></div></form></>}
      {drawer === 'map' && <><p className="eyebrow">Whole-life context</p><h2 id="drawer-title">Your life map</h2><p className="drawer-lede">This is a conversation aid, not a score. Unknown areas stay unknown until you decide they are useful.</p><div className="map-list">{fit.map((item) => <article key={item.label}><span className={`status-mark ${item.tone}`} /><div><h3>{item.label}</h3><strong>{item.status}</strong><p>{item.note}</p></div></article>)}</div><div className="source-card"><Compass /><div><strong>You control the map</strong><p>Only add context that helps you plan. No missing dimension is treated as a failure.</p><Link href="/app/goals">Review your goals <ArrowRight /></Link></div></div></>}
      {drawer === 'accessibility' && <><p className="eyebrow">Display preferences</p><h2 id="drawer-title">Accessibility settings</h2><p className="drawer-lede">These settings stay in this browser.</p><fieldset className="appearance-options"><legend>Appearance</legend>{(['light', 'dark', 'contrast'] as Appearance[]).map((option) => <label className="choice" key={option}><input type="radio" name="appearance" checked={appearance === option} onChange={() => setAppearance(option)} /><span>{option === 'contrast' ? 'High contrast' : titleCase(option)}</span></label>)}</fieldset><div className="drawer-actions"><button className="button primary" onClick={() => setDrawer(null)}>Done</button></div></>}
      {drawer === 'account' && <><p className="eyebrow">Signed in</p><h2 id="drawer-title">{displayName}</h2><p className="drawer-lede">{email}</p><div className="account-actions"><Link className="button secondary" href="/app/privacy"><ShieldCheck /> Privacy & sharing</Link><button className="button primary" disabled={busy} onClick={() => void signOut()}><LogOut /> {busy ? 'Signing out…' : 'Sign out'}</button></div>{error && <p className="form-error">{error}</p>}</>}
      {drawer === 'evidence' && <><p className="eyebrow">Why you’re seeing this</p><h2 id="drawer-title">A lower-load morning may fit better</h2><p className="drawer-lede">This is a planning suggestion, not a diagnosis or a rule. You can ignore it, correct the input, or choose another option.</p><dl className="evidence-list"><div><dt>Relevant context</dt><dd>Your latest capacity check-in and today’s fixed commitments.</dd></div><div><dt>Calculation</dt><dd>Estimated task demand is compared with self-reported available capacity.</dd></div><div><dt>Evidence class</dt><dd>Personal baseline · {today.confidence} confidence. No universal standard says 10:00 is ideal.</dd></div><div><dt>Protected constraints</dt><dd>Care, sleep, travel buffers, and fixed commitments remain visible.</dd></div><div><dt>Known uncertainty</dt><dd>Self-reports and connected data can be incomplete.</dd></div></dl><div className="source-card"><Moon /><div><strong>Population sleep context</strong><p>AASM/SRS 2015 · healthy adults 18–60 · individual need can differ.</p><a href="https://doi.org/10.5664/jcsm.4758" target="_blank" rel="noreferrer">View source <ArrowRight /></a></div></div><div className="drawer-actions"><button className="button primary" onClick={() => setDrawer(null)}>Got it</button><button className="button ghost" onClick={() => setDrawer('capacity')}>Correct my data</button></div></>}
    </section></div>}
  </div>;
}
