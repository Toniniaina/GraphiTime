BEGIN;

-- Professors (7)
INSERT INTO professors (name) VALUES
  ('M. Rakoto'),
  ('Mme. Rabe'),
  ('M. Andry'),
  ('Mme. Soazig'),
  ('M. James'),
  ('Mme. Niry'),
  ('M. Hery');

-- Classes (3)
INSERT INTO classes (name) VALUES
  ('6ème A'),
  ('6ème B'),
  ('5ème A');

-- Rooms (3)
INSERT INTO rooms (name, capacity) VALUES
  ('Salle 01', 32),
  ('Salle 02', 32),
  ('Salle 03', 30);

-- Subjects (optional but useful for courses/sessions)
INSERT INTO subjects (name) VALUES
  ('Mathématiques'),
  ('Français'),
  ('Histoire-Géographie'),
  ('SVT'),
  ('Physique-Chimie'),
  ('Anglais');

-- Courses (optional)
-- required_hours_per_week is in hours (can be decimal)
INSERT INTO courses (subject_id, class_id, professor_id, required_hours_per_week)
SELECT s.id, c.id, p.id, x.required_hours_per_week
FROM (
  VALUES
    ('Mathématiques', '6ème A', 'M. Rakoto', 4.0),
    ('Français', '6ème A', 'Mme. Rabe', 4.0),
    ('Anglais', '6ème A', 'M. Andry', 2.0),
    ('Mathématiques', '6ème B', 'M. James', 4.0),
    ('Français', '6ème B', 'Mme. Soazig', 4.0),
    ('SVT', '5ème A', 'Mme. Niry', 2.0),
    ('Physique-Chimie', '5ème A', 'M. Hery', 2.0)
) AS x(subject_name, class_name, professor_name, required_hours_per_week)
JOIN subjects s ON s.name = x.subject_name
JOIN classes c ON c.name = x.class_name
JOIN professors p ON p.name = x.professor_name;

-- Professor unavailability (optional)
INSERT INTO professor_unavailability (professor_id, day_of_week, start_time, end_time)
SELECT p.id, x.day_of_week, x.start_time, x.end_time
FROM (
  VALUES
    ('M. Rakoto', 3::smallint, '13:00'::time, '15:00'::time),
    ('Mme. Rabe', 2::smallint, '10:00'::time, '12:00'::time),
    ('M. Andry', 5::smallint, '08:00'::time, '10:00'::time),
    ('Mme. Soazig', 4::smallint, '14:00'::time, '16:00'::time),
    ('Mme. Niry', 1::smallint, '09:00'::time, '11:00'::time)
) AS x(professor_name, day_of_week, start_time, end_time)
JOIN professors p ON p.name = x.professor_name;

-- Scheduled sessions (optional)
-- day_of_week: 1=Mon ... 7=Sun
-- start_minute/end_minute: minutes since 00:00
-- Keep sessions non-overlapping per (professor, class, room) for a given day.
INSERT INTO scheduled_sessions (
  course_id,
  room_id,
  professor_id,
  class_id,
  subject_id,
  day_of_week,
  start_minute,
  end_minute
)
SELECT crs.id, r.id, p.id, c.id, s.id, x.day_of_week, x.start_minute, x.end_minute
FROM (
  VALUES
    -- 6ème A
    ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 1::smallint, 480, 540),
    ('Français', '6ème A', 'Mme. Rabe', 'Salle 01', 1::smallint, 560, 620),
    ('Anglais', '6ème A', 'M. Andry', 'Salle 02', 2::smallint, 480, 540),
    ('Mathématiques', '6ème A', 'M. Rakoto', 'Salle 01', 4::smallint, 480, 540),

    -- 6ème B
    ('Mathématiques', '6ème B', 'M. James', 'Salle 02', 1::smallint, 480, 540),
    ('Français', '6ème B', 'Mme. Soazig', 'Salle 02', 1::smallint, 560, 620),
    ('Mathématiques', '6ème B', 'M. James', 'Salle 02', 3::smallint, 480, 540),

    -- 5ème A
    ('SVT', '5ème A', 'Mme. Niry', 'Salle 03', 2::smallint, 560, 620),
    ('Physique-Chimie', '5ème A', 'M. Hery', 'Salle 03', 3::smallint, 560, 620),
    ('SVT', '5ème A', 'Mme. Niry', 'Salle 03', 5::smallint, 480, 540)
) AS x(subject_name, class_name, professor_name, room_name, day_of_week, start_minute, end_minute)
JOIN subjects s ON s.name = x.subject_name
JOIN classes c ON c.name = x.class_name
JOIN professors p ON p.name = x.professor_name
JOIN rooms r ON r.name = x.room_name
JOIN courses crs ON crs.subject_id = s.id AND crs.class_id = c.id AND crs.professor_id = p.id;

COMMIT;
