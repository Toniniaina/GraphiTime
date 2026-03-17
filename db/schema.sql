CREATE DATABASE graphitime;
\c graphitime;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SEQUENCE IF NOT EXISTS professors_seq;
CREATE SEQUENCE IF NOT EXISTS classes_seq;
CREATE SEQUENCE IF NOT EXISTS subjects_seq;
CREATE SEQUENCE IF NOT EXISTS rooms_seq;
CREATE SEQUENCE IF NOT EXISTS courses_seq;
CREATE SEQUENCE IF NOT EXISTS professor_unavailability_seq;
CREATE SEQUENCE IF NOT EXISTS scheduled_sessions_seq;

CREATE SEQUENCE IF NOT EXISTS schools_seq;
CREATE SEQUENCE IF NOT EXISTS school_accounts_seq;
CREATE SEQUENCE IF NOT EXISTS auth_sessions_seq;

CREATE TABLE schools (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('SCH' || lpad(nextval('schools_seq')::text, 5, '0')),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE school_accounts (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('ACC' || lpad(nextval('school_accounts_seq')::text, 5, '0')),
    school_id VARCHAR(16) NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE auth_sessions (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('SSN' || lpad(nextval('auth_sessions_seq')::text, 5, '0')),
    account_id VARCHAR(16) NOT NULL REFERENCES school_accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip TEXT,
    user_agent TEXT
);

CREATE TABLE professors (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('PRF' || lpad(nextval('professors_seq')::text, 5, '0')),
    name TEXT NOT NULL
);

CREATE TABLE classes (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('CLS' || lpad(nextval('classes_seq')::text, 5, '0')),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE subjects (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('SUB' || lpad(nextval('subjects_seq')::text, 5, '0')),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE rooms (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('ROM' || lpad(nextval('rooms_seq')::text, 5, '0')),
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0)
);

ALTER TABLE classes
    ADD COLUMN home_room_id VARCHAR(16) REFERENCES rooms(id) ON DELETE RESTRICT;

CREATE TABLE courses (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('CRS' || lpad(nextval('courses_seq')::text, 5, '0')),
    subject_id VARCHAR(16) NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    class_id VARCHAR(16) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    professor_id VARCHAR(16) NOT NULL REFERENCES professors(id) ON DELETE RESTRICT,
    required_hours_per_week NUMERIC(5,2) NOT NULL CHECK (required_hours_per_week > 0)
);

CREATE TABLE professor_unavailability (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('UNV' || lpad(nextval('professor_unavailability_seq')::text, 5, '0')),
    professor_id VARCHAR(16) NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE TABLE scheduled_sessions (
    id VARCHAR(16) PRIMARY KEY DEFAULT ('SES' || lpad(nextval('scheduled_sessions_seq')::text, 5, '0')),
    course_id VARCHAR(16) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    room_id VARCHAR(16) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,

    professor_id VARCHAR(16) NOT NULL REFERENCES professors(id) ON DELETE RESTRICT,
    class_id VARCHAR(16) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,

    subject_id VARCHAR(16) REFERENCES subjects(id) ON DELETE RESTRICT,

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
