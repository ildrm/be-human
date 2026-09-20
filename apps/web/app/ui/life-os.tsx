'use client';

import {
  Accessibility, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleHelp, Clock3,
  Coffee, Compass, Home, Leaf, LogOut, Menu, Moon, MoreHorizontal, ShieldCheck, Sparkles, SunMedium, X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Mode = 'Stability' | 'Growth' | 'Recovery' | 'Survival';
type Task = { time: string; title: string; detail: string; type: string; done?: boolean; optional?: boolean };

const initialTasks: Task[] = [
  { time: '08:30', title: 'Gentle start', detail: 'Breakfast · medication · no rush', type: 'recovery', done: true },
  { time: '09:30', title: 'Project review', detail: 'Focus block · 55 min', type: 'focus' },
  { time: '11:00', title: 'Team check-in', detail: 'Fixed · 30 min', type: 'fixed' },
  { time: '12:30', title: 'Lunch away from the desk', detail: 'Recovery · 45 min', type: 'recovery' },
  { time: '15:00', title: 'School pickup', detail: 'Fixed · includes travel buffer', type: 'care' },
  { time: '17:30', title: 'Quiet buffer', detail: 'Protected · 50 min', type: 'buffer' },
  { time: '19:00', title: 'Dinner together', detail: 'Meaningful time · flexible', type: 'connection' },
];

const nav = [
  { label: 'Today', icon: Home, href: '/app/today', active: true }, { label: 'Plan', icon: CalendarDays, href: '#today-plan' }, { label: 'Life map', icon: Compass, href: '#life-map' },
  { label: 'Goals', icon: Sparkles, href: '/app/goals' }, { label: 'Insights', icon: BookOpen, href: '#fit-heading' },
];

const fit = [
  { label: 'Essential stability', status: 'Supported', note: 'Today’s basics are covered', tone: 'good' },
  { label: 'Sleep & recovery', status: 'Strained', note: '2h 10m estimated debt · low confidence', tone: 'watch' },
  { label: 'Demand & capacity', status: 'Little buffer', note: 'Evening is the tightest period', tone: 'watch' },
  { label: 'Social connection', status: 'Supported', note: 'Family time is protected', tone: 'good' },
  { label: 'Financial resilience', status: 'Unknown', note: 'Add only if useful to your planning', tone: 'neutral' },
];

export function LifeOS({ displayName, email }: { displayName: string; email: string }) {
  const [mode, setMode] = useState<Mode>('Recovery');
  const [tasks, setTasks] = useState(initialTasks);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'contrast'>('light');
  const doneCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  useEffect(() => { document.documentElement.dataset.appearance = appearance; }, [appearance]);
  const toggleTask = (index: number) => setTasks((current) => current.map((task, taskIndex) => taskIndex === index ? { ...task, done: !task.done } : task));

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to today</a>
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-top"><a className="brand" href="#main"><span className="brand-mark">BH</span><span>Be Human</span></a><button className="icon-button mobile-only" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></button></div>
      <nav className="nav-list">{nav.map(({ label, icon: Icon, href, active }) => <Link href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} key={label}><Icon aria-hidden="true"/><span>{label}</span>{active && <span className="nav-pip" />}</Link>)}</nav>
      <div className="sidebar-context"><p className="eyebrow">Your current focus</p><div className="focus-card"><span className="focus-icon"><Leaf /></span><div><strong>Restore capacity</strong><span>Through 22 Sep</span></div></div></div>
      <div className="sidebar-bottom"><Link href="/app/privacy"><ShieldCheck/><span>Privacy & sharing</span></Link><Link href="/onboarding"><CircleHelp/><span>How this works</span></Link><Link href="/login"><LogOut/><span>Switch account</span></Link><div className="profile-chip"><span className="avatar">{displayName.slice(0, 2).toUpperCase()}</span><span><strong>{displayName}</strong><small>{email}</small></span><MoreHorizontal /></div></div>
    </aside>

    <main id="main" className="main-content">
      <header className="topbar"><button className="icon-button mobile-only" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></button><div className="today-label"><SunMedium aria-hidden="true"/><span>Friday, 18 September</span></div><div className="top-actions"><label className="appearance-label"><span className="sr-only">Appearance</span><select value={appearance} onChange={(event) => setAppearance(event.target.value as typeof appearance)}><option value="light">Light</option><option value="dark">Dark</option><option value="contrast">High contrast</option></select></label><button className="icon-button" aria-label="Accessibility settings"><Accessibility /></button><button className="avatar-button" aria-label="Open account menu">AM</button></div></header>

      <div className="content-wrap">
        <section className="welcome-row"><div><p className="eyebrow">Today · your local plan</p><h1>Good morning, {displayName.split(' ')[0]}.</h1><p className="lede">A quieter plan for a lower-capacity day. The essentials fit, and there’s room for life to happen.</p></div><div className="mode-control"><label htmlFor="mode">Operating mode</label><select id="mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)}><option>Stability</option><option>Growth</option><option>Recovery</option><option>Survival</option></select><span className="mode-note">You’re always in control</span></div></section>

        <section className="notice" aria-labelledby="adapt-heading"><span className="notice-icon"><Leaf /></span><div><h2 id="adapt-heading">Your plan adapted for {mode.toLowerCase()} mode</h2><p>{mode === 'Recovery' || mode === 'Survival' ? 'Two optional tasks were moved. Sleep, care, and a 75-minute buffer remain protected.' : 'Optional goals are visible when capacity permits; hard constraints remain protected.'}</p></div><button className="text-button" onClick={() => setEvidenceOpen(true)}>See what changed <ArrowRight /></button></section>

        <div className="dashboard-grid">
          <section className="panel schedule-panel" aria-labelledby="today-plan"><div className="panel-header"><div><p className="eyebrow">Your day</p><h2 id="today-plan">A plan with breathing room</h2></div><span className="completion">{doneCount} of {tasks.length} checked</span></div>
            <ol className="timeline">{tasks.map((task, index) => <li className={task.done ? 'done' : ''} key={`${task.time}-${task.title}`}><time>{task.time}</time><span className={`timeline-dot ${task.type}`} /><button className="task-check" aria-label={`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} aria-pressed={task.done} onClick={() => toggleTask(index)}>{task.done && <Check />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.detail}</span></div><button className="icon-button quiet" aria-label={`More options for ${task.title}`}><MoreHorizontal /></button></li>)}</ol>
            <div className="schedule-footer"><button className="button secondary"><CalendarDays /> Open week plan</button><button className="text-button">Add something <span aria-hidden="true">+</span></button></div>
          </section>

          <div className="side-stack">
            <section className="panel capacity-panel" aria-labelledby="capacity-heading"><div className="panel-header"><div><p className="eyebrow">Capacity estimate</p><h2 id="capacity-heading">Energy is limited today</h2></div><span className="confidence">Medium confidence</span></div><p>Based on sleep, your check-in, and recent patterns—not a clinical measurement.</p>
              <div className="capacity-list" role="list">
                {[['Physical',48],['Cognitive',56],['Emotional',42],['Executive',51]].map(([label, value]) => <div className="capacity-row" role="listitem" key={label}><span>{label}</span><div className="meter" role="meter" aria-label={`${label} capacity estimate`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(value)}><span style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}
              </div><button className="text-button">Correct this estimate <ChevronRight /></button>
            </section>

            <section className="panel buffer-panel" aria-labelledby="buffer-heading"><div className="buffer-visual" aria-hidden="true"><Clock3 /><span>75<small>min</small></span></div><div><p className="eyebrow">Protected buffer</p><h2 id="buffer-heading">Life can run late</h2><p>Your plan keeps 75 minutes unfilled. This is resilience, not wasted time.</p></div></section>

            <section className="panel suggestion-panel" aria-labelledby="suggestion-heading"><span className="suggestion-icon"><Coffee /></span><div><p className="eyebrow">Gentle suggestion</p><h2 id="suggestion-heading">Move the project review?</h2><p>Your recent data suggests late mornings are steadier than early ones.</p><div className="suggestion-actions"><button className="button small primary" onClick={() => setTasks((current) => current.map((task) => task.title === 'Project review' ? { ...task, time: '10:00', detail: 'Focus block · moved by you' } : task))}>Move to 10:00</button><button className="button small ghost">Keep it</button></div><button className="why-link" onClick={() => setEvidenceOpen(true)}>Why am I seeing this?</button></div></section>
          </div>
        </div>

        <section className="fit-section" id="life-map" aria-labelledby="fit-heading"><div className="section-heading"><div><p className="eyebrow">Life fit · not a life score</p><h2 id="fit-heading">What feels supported, strained, or still unknown</h2></div><button className="button secondary">Explore your life map <ArrowRight /></button></div><div className="fit-grid">{fit.map((item) => <article key={item.label} className="fit-card"><div className={`status-mark ${item.tone}`} aria-hidden="true" /><div><h3>{item.label}</h3><strong>{item.status}</strong><p>{item.note}</p></div><ChevronRight aria-hidden="true" /></article>)}</div></section>

        <footer className="app-footer"><span><ShieldCheck /> Private by default</span><span>Planning support, not medical advice</span><a href="#evidence" onClick={(event) => { event.preventDefault(); setEvidenceOpen(true); }}>Evidence & limitations</a></footer>
      </div>
    </main>

    {mobileNav && <button className="backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    {evidenceOpen && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEvidenceOpen(false); }}><section className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title"><button className="icon-button drawer-close" aria-label="Close evidence" autoFocus onClick={() => setEvidenceOpen(false)}><X /></button><p className="eyebrow">Why you’re seeing this</p><h2 id="evidence-title">A lower-load morning may fit better</h2><p className="drawer-lede">This is a planning suggestion, not a diagnosis or a rule. You can ignore it, correct the input, or choose another option.</p><dl className="evidence-list"><div><dt>Relevant context</dt><dd>6h 20m recorded sleep; self-check-in: low energy; three comparable Fridays.</dd></div><div><dt>Calculation</dt><dd>Estimated cognitive demand ÷ available capacity = 0.91. Near 1 means little estimated buffer.</dd></div><div><dt>Evidence class</dt><dd>Personal baseline · medium confidence. No universal standard says 10:00 is ideal.</dd></div><div><dt>Protected constraints</dt><dd>School pickup, recorded sleep minimum, travel buffer, and fixed team meeting.</dd></div><div><dt>Known uncertainty</dt><dd>Wearable sleep data and self-reports can be incomplete. Three comparable days is a small sample.</dd></div></dl><div className="source-card"><Moon /><div><strong>Population sleep context</strong><p>AASM/SRS 2015 · healthy adults 18–60 · seven or more hours regularly. Individual need can differ.</p><a href="https://doi.org/10.5664/jcsm.4758" target="_blank" rel="noreferrer">View source <ArrowRight /></a></div></div><div className="drawer-actions"><button className="button primary" onClick={() => setEvidenceOpen(false)}>Got it</button><button className="button ghost">Correct my data</button></div></section></div>}
  </div>;
}
