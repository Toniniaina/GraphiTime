BEGIN;

DROP TABLE IF EXISTS seed_ctx;
CREATE TEMP TABLE seed_ctx (school_id VARCHAR(16) NOT NULL);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

TRUNCATE TABLE
  auth_sessions,
  school_accounts,
  scheduled_sessions,
  professor_unavailability,
  courses,
  rooms,
  subjects,
  classes,
  professors,
  schools
RESTART IDENTITY;

ALTER SEQUENCE professors_seq RESTART WITH 1;
ALTER SEQUENCE classes_seq RESTART WITH 1;
ALTER SEQUENCE subjects_seq RESTART WITH 1;
ALTER SEQUENCE rooms_seq RESTART WITH 1;
ALTER SEQUENCE courses_seq RESTART WITH 1;
ALTER SEQUENCE professor_unavailability_seq RESTART WITH 1;
ALTER SEQUENCE scheduled_sessions_seq RESTART WITH 1;
ALTER SEQUENCE schools_seq RESTART WITH 1;

ALTER SEQUENCE school_accounts_seq RESTART WITH 1;
ALTER SEQUENCE auth_sessions_seq RESTART WITH 1;

-- Seed school
WITH ins AS (
  INSERT INTO schools (name)
  VALUES ('École Démo')
  RETURNING id
)
INSERT INTO seed_ctx (school_id)
SELECT id FROM ins;

INSERT INTO school_accounts (school_id, login, password_hash)
SELECT
  ctx.school_id,
  'admin@gmail.com',
  crypt('admin123', gen_salt('bf'))
FROM seed_ctx ctx;

-- Professors
INSERT INTO professors (school_id, name)
SELECT ctx.school_id, x.name
FROM seed_ctx ctx
JOIN (
  VALUES
    ('M. Andry'),
    ('M. Feno'),
    ('M. Rakoto'),
    ('M. Tiana'),
    ('M. Zo'),
    ('Mme. Lalao'),
    ('Mme. Rabe'),
    ('Mme. Vola')
) AS x(name) ON TRUE;

-- Classes
INSERT INTO classes (school_id, name)
SELECT ctx.school_id, x.name
FROM seed_ctx ctx
JOIN (
  VALUES
    ('6ème A'),
    ('6ème B')
) AS x(name) ON TRUE;

-- Subjects
INSERT INTO subjects (school_id, name)
SELECT ctx.school_id, x.name
FROM seed_ctx ctx
JOIN (
  VALUES
    ('Anglais'),
    ('EPS'),
    ('Français'),
    ('Histoire-Géo'),
    ('Mathématiques'),
    ('Physique-Chimie'),
    ('SVT'),
    ('Technologie'),
    ('Étude')
) AS x(name) ON TRUE;

-- Rooms
INSERT INTO rooms (school_id, name, capacity)
SELECT ctx.school_id, x.name, x.capacity
FROM seed_ctx ctx
JOIN (
  VALUES
    ('Gymnase A', 60),
    ('Salle 01', 32),
    ('Salle 02', 32)
) AS x(name, capacity) ON TRUE;

-- Home room per class
UPDATE classes
SET home_room_id = r.id
FROM rooms r
WHERE classes.school_id = (SELECT school_id FROM seed_ctx)
  AND r.school_id = classes.school_id
  AND classes.name = '6ème A'
  AND r.name = 'Salle 01';

UPDATE classes
SET home_room_id = r.id
FROM rooms r
WHERE classes.school_id = (SELECT school_id FROM seed_ctx)
  AND r.school_id = classes.school_id
  AND classes.name = '6ème B'
  AND r.name = 'Salle 02';

-- Courses 6ème A
INSERT INTO courses (school_id, subject_id, class_id, professor_id, required_hours_per_week)
SELECT ctx.school_id, s.id, c.id, p.id, x.rh
FROM seed_ctx ctx
JOIN (VALUES
  ('Anglais', '6ème A', 'M. Andry', 5.0),   
  ('EPS', '6ème A', 'M. Zo', 2.0),
  ('Français', '6ème A', 'Mme. Rabe', 5.0),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 5.0),
  ('Mathématiques', '6ème A', 'M. Rakoto', 5.0),
  ('Physique-Chimie', '6ème A', 'M. Feno', 5.0),
  ('SVT', '6ème A', 'Mme. Lalao', 5.0),
  ('Technologie', '6ème A', 'Mme. Vola', 5.0)
) AS x(sn, cn, pn, rh)
ON TRUE
JOIN subjects s ON s.school_id = ctx.school_id AND s.name=x.sn
JOIN classes c ON c.school_id = ctx.school_id AND c.name=x.cn
JOIN professors p ON p.school_id = ctx.school_id AND p.name=x.pn;

-- Courses 6ème B (mêmes profs et matières)
INSERT INTO courses (school_id, subject_id, class_id, professor_id, required_hours_per_week)
SELECT ctx.school_id, s.id, c.id, p.id, x.rh
FROM seed_ctx ctx
JOIN (VALUES
  ('Anglais', '6ème B', 'M. Andry', 5.0),
  ('EPS', '6ème B', 'M. Zo', 2.0),
  ('Français', '6ème B', 'Mme. Rabe', 5.0),
  ('Histoire-Géo', '6ème B', 'M. Tiana', 5.0),
  ('Mathématiques', '6ème B', 'M. Rakoto', 5.0),
  ('Physique-Chimie', '6ème B', 'M. Feno', 5.0),
  ('SVT', '6ème B', 'Mme. Lalao', 5.0),
  ('Technologie', '6ème B', 'Mme. Vola', 5.0)
) AS x(sn, cn, pn, rh)
ON TRUE
JOIN subjects s ON s.school_id = ctx.school_id AND s.name=x.sn
JOIN classes c ON c.school_id = ctx.school_id AND c.name=x.cn
JOIN professors p ON p.school_id = ctx.school_id AND p.name=x.pn;

-- Prof fictif pour Étude
INSERT INTO professors (school_id, name)
SELECT school_id, 'Surveillant'
FROM seed_ctx;

-- Étude 6ème A
INSERT INTO courses (school_id, subject_id, class_id, professor_id, required_hours_per_week)
SELECT ctx.school_id, s.id, c.id, p.id, 3.0
FROM seed_ctx ctx
JOIN subjects s ON s.school_id = ctx.school_id AND s.name='Étude'
JOIN classes c ON c.school_id = ctx.school_id AND c.name='6ème A'
JOIN professors p ON p.school_id = ctx.school_id AND p.name='Surveillant';

-- Étude 6ème B
INSERT INTO courses (school_id, subject_id, class_id, professor_id, required_hours_per_week)
SELECT ctx.school_id, s.id, c.id, p.id, 3.0
FROM seed_ctx ctx
JOIN subjects s ON s.school_id = ctx.school_id AND s.name='Étude'
JOIN classes c ON c.school_id = ctx.school_id AND c.name='6ème B'
JOIN professors p ON p.school_id = ctx.school_id AND p.name='Surveillant';

-- Professor unavailability
INSERT INTO professor_unavailability (school_id, professor_id, day_of_week, start_time, end_time)
SELECT ctx.school_id, p.id, x.dow, x.st, x.et
FROM seed_ctx ctx
JOIN (VALUES
  ('M. Rakoto',3::smallint,'09:00'::time,'10:00'::time),
  ('Mme. Rabe',2::smallint,'08:00'::time,'09:00'::time),
  ('M. Andry',5::smallint,'07:00'::time,'08:00'::time),
  ('M. Tiana',4::smallint,'14:00'::time,'15:00'::time),
  ('Mme. Lalao',1::smallint,'10:00'::time,'11:00'::time)
) AS x(pn,dow,st,et)
ON TRUE
JOIN professors p ON p.school_id = ctx.school_id AND p.name=x.pn;

-- Scheduled sessions
-- Structure :
--   Matin 07h-12h : blocs contigus de 2h ou 3h (sauf Étude = 1h auto-étude)
--   Après 14h-17h : bloc contigu de 3h (ou 2h EPS + 1h Étude vendredi)
-- Remplacements actifs (prof indispo → autre matière disponible) :
--   Lun 9h00 : Mme. Lalao indispo (SVT) → Mathématiques (M. Rakoto)
--   Mar 7h00 : Mme. Rabe indispo (Français) → Mathématiques (M. Rakoto)
--   Mer 9h00 : M. Rakoto indispo (Mathématiques) → Histoire-Géo (M. Tiana)
--   Jeu 14h00 : M. Tiana indispo (Histoire-Géo) → Technologie (Mme. Vola)
--   Ven 7h00 : M. Andry indispo (Anglais) → Technologie (Mme. Vola)
INSERT INTO scheduled_sessions (
  school_id, course_id, room_id, professor_id, class_id, subject_id,
  day_of_week, start_minute, end_minute
)
SELECT ctx.school_id, crs.id, r.id, p.id, c.id, s.id, x.dow, x.sm, x.em
FROM seed_ctx ctx
JOIN (VALUES
  ('SVT', '6ème A', 'Mme. Lalao', 'Salle 01', 1::smallint, 420, 480),
  ('SVT', '6ème A', 'Mme. Lalao', 'Salle 01', 1::smallint, 480, 540),
  ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 1::smallint, 540, 600),
  ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 1::smallint, 600, 660),
  ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 1::smallint, 660, 720),
  ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 1::smallint, 840, 900),
  ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 1::smallint, 900, 960),
  ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 1::smallint, 960, 1020),
  ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 2::smallint, 420, 480),
  ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 2::smallint, 480, 540),
  ('Anglais', '6ème A', 'M. Andry', 'Salle 01', 2::smallint, 540, 600),
  ('Anglais', '6ème A', 'M. Andry', 'Salle 01', 2::smallint, 600, 660),
  ('Anglais', '6ème A', 'M. Andry', 'Salle 01', 2::smallint, 660, 720),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 'Salle 01', 2::smallint, 840, 900),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 'Salle 01', 2::smallint, 900, 960),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 'Salle 01', 2::smallint, 960, 1020),
  ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 3::smallint, 420, 480),
  ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 3::smallint, 480, 540),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 'Salle 01', 3::smallint, 540, 600),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 'Salle 01', 3::smallint, 600, 660),
  ('Étude', '6ème A', 'Surveillant', 'Salle 01', 3::smallint, 660, 720),
  ('Physique-Chimie', '6ème A', 'M. Feno', 'Salle 01', 3::smallint, 840, 900),
  ('Physique-Chimie', '6ème A', 'M. Feno', 'Salle 01', 3::smallint, 900, 960),
  ('Physique-Chimie', '6ème A', 'M. Feno', 'Salle 01', 3::smallint, 960, 1020),
  ('SVT', '6ème A', 'Mme. Lalao', 'Salle 01', 4::smallint, 420, 480),
  ('SVT', '6ème A', 'Mme. Lalao', 'Salle 01', 4::smallint, 480, 540),
  ('SVT', '6ème A', 'Mme. Lalao', 'Salle 01', 4::smallint, 540, 600),
  ('Physique-Chimie', '6ème A', 'M. Feno', 'Salle 01', 4::smallint, 600, 660),
  ('Physique-Chimie', '6ème A', 'M. Feno', 'Salle 01', 4::smallint, 660, 720),
  ('Technologie', '6ème A', 'Mme. Vola', 'Salle 01', 4::smallint, 840, 900),
  ('Technologie', '6ème A', 'Mme. Vola', 'Salle 01', 4::smallint, 900, 960),
  ('Technologie', '6ème A', 'Mme. Vola', 'Salle 01', 4::smallint, 960, 1020),
  ('Technologie', '6ème A', 'Mme. Vola', 'Salle 01', 5::smallint, 420, 480),
  ('Technologie', '6ème A', 'Mme. Vola', 'Salle 01', 5::smallint, 480, 540),
  ('Anglais', '6ème A', 'M. Andry', 'Salle 01', 5::smallint, 540, 600),
  ('Anglais', '6ème A', 'M. Andry', 'Salle 01', 5::smallint, 600, 660),
  ('Étude', '6ème A', 'Surveillant', 'Salle 01', 5::smallint, 660, 720),
  ('EPS', '6ème A', 'M. Zo', 'Gymnase A', 5::smallint, 840, 900),
  ('EPS', '6ème A', 'M. Zo', 'Gymnase A', 5::smallint, 900, 960),
  ('Étude', '6ème A', 'Surveillant', 'Salle 01', 5::smallint, 960, 1020)
) AS x(sn, cn, pn, rn, dow, sm, em)
ON TRUE
JOIN subjects   s   ON s.school_id = ctx.school_id AND s.name = x.sn
JOIN classes    c   ON c.school_id = ctx.school_id AND c.name = x.cn
JOIN professors p   ON p.school_id = ctx.school_id AND p.name = x.pn
JOIN rooms      r   ON r.school_id = ctx.school_id AND r.name = x.rn
JOIN courses    crs ON crs.school_id  = ctx.school_id
                  AND crs.subject_id = s.id
                  AND crs.class_id   = c.id;

COMMIT;