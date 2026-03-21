BEGIN;

TRUNCATE TABLE
  scheduled_sessions,
  professor_unavailability,
  courses,
  rooms,
  subjects,
  classes,
  professors
RESTART IDENTITY;

ALTER SEQUENCE professors_seq RESTART WITH 1;
ALTER SEQUENCE classes_seq RESTART WITH 1;
ALTER SEQUENCE subjects_seq RESTART WITH 1;
ALTER SEQUENCE rooms_seq RESTART WITH 1;
ALTER SEQUENCE courses_seq RESTART WITH 1;
ALTER SEQUENCE professor_unavailability_seq RESTART WITH 1;
ALTER SEQUENCE scheduled_sessions_seq RESTART WITH 1;

-- Professors
INSERT INTO professors (name) VALUES
  ('M. Andry'),
  ('M. Feno'),
  ('M. Rakoto'),
  ('M. Tiana'),
  ('M. Zo'),
  ('Mme. Lalao'),
  ('Mme. Rabe'),
  ('Mme. Vola');

-- Classes
INSERT INTO classes (name) VALUES
  ('6ème A'),
  ('6ème B');

-- Subjects
INSERT INTO subjects (name) VALUES
  ('Anglais'),
  ('EPS'),
  ('Français'),
  ('Histoire-Géo'),
  ('Mathématiques'),
  ('Physique-Chimie'),
  ('SVT'),
  ('Technologie'),
  ('Étude');

-- Rooms
INSERT INTO rooms (name, capacity) VALUES
  ('Gymnase A', 60),
  ('Salle 01', 32),
  ('Salle 02', 32);

-- Home room per class
UPDATE classes
SET home_room_id = r.id
FROM rooms r
WHERE classes.name = '6ème A' AND r.name = 'Salle 01';

UPDATE classes
SET home_room_id = r.id
FROM rooms r
WHERE classes.name = '6ème B' AND r.name = 'Salle 02';

-- Courses 6ème A
INSERT INTO courses (subject_id, class_id, professor_id, required_hours_per_week)
SELECT s.id, c.id, p.id, x.rh
FROM (VALUES
  ('Anglais', '6ème A', 'M. Andry', 5.0),   
  ('EPS', '6ème A', 'M. Zo', 2.0),
  ('Français', '6ème A', 'Mme. Rabe', 5.0),
  ('Histoire-Géo', '6ème A', 'M. Tiana', 5.0),
  ('Mathématiques', '6ème A', 'M. Rakoto', 5.0),
  ('Physique-Chimie', '6ème A', 'M. Feno', 5.0),
  ('SVT', '6ème A', 'Mme. Lalao', 5.0),
  ('Technologie', '6ème A', 'Mme. Vola', 5.0)
) AS x(sn, cn, pn, rh)
JOIN subjects s ON s.name=x.sn
JOIN classes c ON c.name=x.cn
JOIN professors p ON p.name=x.pn;

-- Courses 6ème B (mêmes profs et matières)
INSERT INTO courses (subject_id, class_id, professor_id, required_hours_per_week)
SELECT s.id, c.id, p.id, x.rh
FROM (VALUES
  ('Anglais', '6ème B', 'M. Andry', 5.0),
  ('EPS', '6ème B', 'M. Zo', 2.0),
  ('Français', '6ème B', 'Mme. Rabe', 5.0),
  ('Histoire-Géo', '6ème B', 'M. Tiana', 5.0),
  ('Mathématiques', '6ème B', 'M. Rakoto', 5.0),
  ('Physique-Chimie', '6ème B', 'M. Feno', 5.0),
  ('SVT', '6ème B', 'Mme. Lalao', 5.0),
  ('Technologie', '6ème B', 'Mme. Vola', 5.0)
) AS x(sn, cn, pn, rh)
JOIN subjects s ON s.name=x.sn
JOIN classes c ON c.name=x.cn
JOIN professors p ON p.name=x.pn;

-- Prof fictif pour Étude
INSERT INTO professors (name) VALUES ('Surveillant');

-- Étude 6ème A
INSERT INTO courses (subject_id,class_id,professor_id,required_hours_per_week)
SELECT s.id,c.id,p.id,3.0
FROM subjects s,classes c,professors p
WHERE s.name='Étude' AND c.name='6ème A' AND p.name='Surveillant';

-- Étude 6ème B
INSERT INTO courses (subject_id,class_id,professor_id,required_hours_per_week)
SELECT s.id,c.id,p.id,3.0
FROM subjects s,classes c,professors p
WHERE s.name='Étude' AND c.name='6ème B' AND p.name='Surveillant';

-- Professor unavailability
INSERT INTO professor_unavailability (professor_id,day_of_week,start_time,end_time)
SELECT p.id,x.dow,x.st,x.et
FROM (VALUES
  ('M. Rakoto',3::smallint,'09:00'::time,'10:00'::time),
  ('Mme. Rabe',2::smallint,'08:00'::time,'09:00'::time),
  ('M. Andry',5::smallint,'07:00'::time,'08:00'::time),
  ('M. Tiana',4::smallint,'14:00'::time,'15:00'::time),
  ('Mme. Lalao',1::smallint,'10:00'::time,'11:00'::time)
) AS x(pn,dow,st,et)
JOIN professors p ON p.name=x.pn;


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
  course_id, room_id, professor_id, class_id, subject_id,
  day_of_week, start_minute, end_minute
)
SELECT crs.id, r.id, p.id, c.id, s.id, x.dow, x.sm, x.em
FROM (VALUES
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
JOIN subjects   s   ON s.name = x.sn
JOIN classes    c   ON c.name = x.cn
JOIN professors p   ON p.name = x.pn
JOIN rooms      r   ON r.name = x.rn
JOIN courses    crs ON crs.subject_id = s.id
                  AND crs.class_id    = c.id;

COMMIT;