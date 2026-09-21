import argon2 from 'argon2';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://be_human:be_human_dev@localhost:5432/be_human' });
try {
  const passwordHash = await argon2.hash('Demo-Only-Change-Me!', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 3, parallelism: 1 });
  const user = await pool.query<{ id: string }>(`INSERT INTO app_user(email,password_hash,display_name,locale,timezone) VALUES ('alex@example.test',$1,'Alex','en','Asia/Tehran') ON CONFLICT ((lower(email))) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`, [passwordHash]);
  await pool.query(`INSERT INTO user_role(user_id,role) VALUES ($1,'user') ON CONFLICT DO NOTHING`, [user.rows[0]!.id]);
  await pool.query(`INSERT INTO profile(user_id,life_stage,worldview,accessibility_needs) VALUES ($1,'adult','prefer_not_to_say','[]') ON CONFLICT (user_id) DO NOTHING`, [user.rows[0]!.id]);
  const plan = await pool.query<{ id: string }>(`INSERT INTO plan(user_id,plan_date,timezone,operating_mode,feasible,model_version,explanation)
    VALUES ($1,(now() AT TIME ZONE 'Asia/Tehran')::date,'Asia/Tehran','recovery',true,'demo-v1',$2)
    ON CONFLICT (user_id,plan_date,model_version) DO UPDATE SET operating_mode=EXCLUDED.operating_mode,explanation=EXCLUDED.explanation,created_at=now()
    RETURNING id`, [user.rows[0]!.id, JSON.stringify({ summary: 'A quieter plan for a lower-capacity day.', bufferMinutes: 75, source: 'fictional-demo' })]);
  await pool.query('DELETE FROM plan_item WHERE plan_id=$1', [plan.rows[0]!.id]);
  const planItems = [
    ['08:30', 35, 'Gentle start', 'Breakfast · medication · no rush', 'recovery', true, true, 'completed'],
    ['09:30', 55, 'Project review', 'Focus block · 55 min', 'work', false, false, 'planned'],
    ['11:00', 30, 'Team check-in', 'Fixed · 30 min', 'work', true, true, 'planned'],
    ['12:30', 45, 'Lunch away from the desk', 'Recovery · 45 min', 'recovery', false, true, 'planned'],
    ['15:00', 60, 'School pickup', 'Fixed · includes travel buffer', 'care', true, true, 'planned'],
    ['17:30', 50, 'Quiet buffer', 'Protected · 50 min', 'buffer', false, true, 'planned'],
    ['19:00', 75, 'Dinner together', 'Meaningful time · flexible', 'connection', false, true, 'planned'],
  ] as const;
  for (const [time, duration, title, detail, category, fixed, essential, status] of planItems) {
    await pool.query(`INSERT INTO plan_item(plan_id,title,starts_at,ends_at,fixed,essential,demand,status)
      SELECT p.id,$2,(p.plan_date+$3::time) AT TIME ZONE p.timezone,((p.plan_date+$3::time) AT TIME ZONE p.timezone)+$4*interval '1 minute',$5,$6,$7,$8
      FROM plan p WHERE p.id=$1`, [plan.rows[0]!.id, title, time, duration, fixed, essential, JSON.stringify({ detail, category, source: 'fictional-demo' }), status]);
  }
  await pool.query(`DELETE FROM capacity_snapshot WHERE user_id=$1`, [user.rows[0]!.id]);
  await pool.query(`INSERT INTO capacity_snapshot(user_id,observed_at,timezone,capacity,confidence,source) VALUES ($1,now(),'Asia/Tehran',$2,$3,'fictional-demo')`, [user.rows[0]!.id, JSON.stringify({ physical: 48, cognitive: 56, emotional: 42, executive: 51 }), JSON.stringify({ level: 'medium', basis: 'fictional-demo' })]);
  const scenarios = [
    ['single-office-worker','Single office worker'], ['married-parent','Married parent'], ['single-parent','Single parent'],
    ['rotating-shift-worker','Rotating-shift worker'], ['remote-employee','Remote employee'], ['long-commute-user','Long-commute user'],
    ['elderly-retired-user','Elderly retired user'], ['student','Student'], ['caregiver','Caregiver'], ['freelancer','Freelancer'],
    ['wheelchair-user','Wheelchair user'], ['secular-user','Secular user'], ['religious-user','Religious user'], ['separated-coparent','Separated co-parent'],
  ];
  for (const [key, title] of scenarios) await pool.query(`INSERT INTO feature_flag(key,enabled,description,conditions,experimental) VALUES ($1,false,$2,$3,false) ON CONFLICT (key) DO NOTHING`, [`seed:${key}`, `Synthetic acceptance scenario: ${title}`, JSON.stringify({ fictional: true })]);
  process.stdout.write('Seeded fictional demo account and scenario catalogue.\n');
} finally { await pool.end(); }
