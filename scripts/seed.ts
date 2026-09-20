import argon2 from 'argon2';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://be_human:be_human_dev@localhost:5432/be_human' });
try {
  const passwordHash = await argon2.hash('Demo-Only-Change-Me!', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 3, parallelism: 1 });
  const user = await pool.query<{ id: string }>(`INSERT INTO app_user(email,password_hash,display_name,locale,timezone) VALUES ('alex@example.test',$1,'Alex','en','Asia/Tehran') ON CONFLICT ((lower(email))) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`, [passwordHash]);
  await pool.query(`INSERT INTO user_role(user_id,role) VALUES ($1,'user') ON CONFLICT DO NOTHING`, [user.rows[0]!.id]);
  await pool.query(`INSERT INTO profile(user_id,life_stage,worldview,accessibility_needs) VALUES ($1,'adult','prefer_not_to_say','[]') ON CONFLICT (user_id) DO NOTHING`, [user.rows[0]!.id]);
  const scenarios = [
    ['single-office-worker','Single office worker'], ['married-parent','Married parent'], ['single-parent','Single parent'],
    ['rotating-shift-worker','Rotating-shift worker'], ['remote-employee','Remote employee'], ['long-commute-user','Long-commute user'],
    ['elderly-retired-user','Elderly retired user'], ['student','Student'], ['caregiver','Caregiver'], ['freelancer','Freelancer'],
    ['wheelchair-user','Wheelchair user'], ['secular-user','Secular user'], ['religious-user','Religious user'], ['separated-coparent','Separated co-parent'],
  ];
  for (const [key, title] of scenarios) await pool.query(`INSERT INTO feature_flag(key,enabled,description,conditions,experimental) VALUES ($1,false,$2,$3,false) ON CONFLICT (key) DO NOTHING`, [`seed:${key}`, `Synthetic acceptance scenario: ${title}`, JSON.stringify({ fictional: true })]);
  process.stdout.write('Seeded fictional demo account and scenario catalogue.\n');
} finally { await pool.end(); }
