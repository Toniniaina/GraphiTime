CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE professors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE subjects (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE rooms (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0)
);

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    professor_id BIGINT NOT NULL REFERENCES professors(id) ON DELETE RESTRICT,
    required_hours_per_week NUMERIC(5,2) NOT NULL CHECK (required_hours_per_week > 0)
);

CREATE TABLE professor_unavailability (
    id BIGSERIAL PRIMARY KEY,
    professor_id BIGINT NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE TABLE scheduled_sessions (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,

    professor_id BIGINT NOT NULL REFERENCES professors(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,

    subject_id BIGINT REFERENCES subjects(id) ON DELETE RESTRICT,

    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
    end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
    CHECK (start_minute < end_minute),
    CHECK ((end_minute - start_minute) <= 240),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    EXCLUDE USING gist (
        professor_id WITH =,
        day_of_week WITH =,
        int4range(start_minute, end_minute, '[)') WITH &&
    ),
    EXCLUDE USING gist (
        class_id WITH =,
        day_of_week WITH =,
        int4range(start_minute, end_minute, '[)') WITH &&
    ),
    EXCLUDE USING gist (
        room_id WITH =,
        day_of_week WITH =,
        int4range(start_minute, end_minute, '[)') WITH &&
    )
);
