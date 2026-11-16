-- ============================================================================
-- StudySync : Student Course & Study Management System
-- 01_schema.sql  -  DDL: database, tables, keys, constraints, indexes
-- MySQL 8.0+
-- ============================================================================
CREATE DATABASE IF NOT EXISTS studysync
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studysync;

-- Drop in reverse dependency order so the script can be re-run safely
DROP VIEW  IF EXISTS v_course_leaderboard;
DROP VIEW  IF EXISTS v_upcoming_deadlines;
DROP VIEW  IF EXISTS v_student_course_progress;
DROP TABLE IF EXISTS grade_audit_log;
DROP TABLE IF EXISTS study_tasks;
DROP TABLE IF EXISTS study_materials;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ----------------------------------------------------------------------------
-- 1. students  (all application users; the role column drives access control)
-- ----------------------------------------------------------------------------
CREATE TABLE students (
    student_id        VARCHAR(36)  NOT NULL,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    full_name         VARCHAR(100) NOT NULL,
    enrollment_no     VARCHAR(50)  NOT NULL,
    current_semester  INT          NOT NULL,
    role              ENUM('student','instructor','admin') NOT NULL DEFAULT 'student',
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at     DATETIME     NULL,
    CONSTRAINT pk_students PRIMARY KEY (student_id),
    CONSTRAINT uq_students_email UNIQUE (email),
    CONSTRAINT uq_students_enrollment_no UNIQUE (enrollment_no),
    CONSTRAINT chk_students_email CHECK (REGEXP_LIKE(email, '^[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}$', 'c')),
    CONSTRAINT chk_students_name CHECK (CHAR_LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT chk_students_semester CHECK (current_semester BETWEEN 1 AND 8)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. courses
-- ----------------------------------------------------------------------------
CREATE TABLE courses (
    course_id      VARCHAR(36)  NOT NULL,
    instructor_id  VARCHAR(36)  NOT NULL,
    course_code    VARCHAR(20)  NOT NULL,
    title          VARCHAR(200) NOT NULL DEFAULT 'Untitled course',
    department     VARCHAR(100) NOT NULL,
    credits        INT          NOT NULL DEFAULT 3,
    syllabus_json  JSON         NULL,
    is_archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_courses PRIMARY KEY (course_id),
    CONSTRAINT uq_courses_code UNIQUE (course_code),
    CONSTRAINT chk_courses_code CHECK (REGEXP_LIKE(course_code, '^[A-Z0-9]+$', 'c')),
    CONSTRAINT chk_courses_credits CHECK (credits BETWEEN 1 AND 6),
    CONSTRAINT chk_courses_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id)
        REFERENCES students (student_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. course_enrollments  (associative entity: students M:N courses)
-- ----------------------------------------------------------------------------
CREATE TABLE course_enrollments (
    course_id          VARCHAR(36) NOT NULL,
    student_id         VARCHAR(36) NOT NULL,
    enrollment_status  VARCHAR(15) NOT NULL DEFAULT 'active',
    target_grade       VARCHAR(5)  NULL,
    final_grade        VARCHAR(5)  NULL,
    enrolled_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at   DATETIME    NULL,
    CONSTRAINT pk_enrollments PRIMARY KEY (course_id, student_id),
    CONSTRAINT chk_enroll_status CHECK (enrollment_status IN ('active','completed','dropped','auditing')),
    CONSTRAINT chk_enroll_target CHECK (target_grade IS NULL OR target_grade IN ('A+','A','B','C','D','S')),
    CONSTRAINT chk_enroll_final  CHECK (final_grade  IS NULL OR final_grade  IN ('A+','A','B','C','D','S','F')),
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. study_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE study_sessions (
    session_id        BIGINT      NOT NULL AUTO_INCREMENT,
    student_id        VARCHAR(36) NOT NULL,
    course_id         VARCHAR(36) NOT NULL,
    session_type      VARCHAR(20) NOT NULL DEFAULT 'pomodoro',
    duration_minutes  INT         NOT NULL,
    focus_score       INT         NOT NULL,
    notes             TEXT        NULL,
    started_at        DATETIME    NOT NULL,
    ended_at          DATETIME    NOT NULL,
    created_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sessions PRIMARY KEY (session_id),
    CONSTRAINT chk_sessions_type CHECK (session_type IN ('pomodoro','deep_work','revision','exam_prep')),
    CONSTRAINT chk_sessions_duration CHECK (duration_minutes > 0 AND duration_minutes <= 720),
    CONSTRAINT chk_sessions_focus CHECK (focus_score BETWEEN 1 AND 5),
    CONSTRAINT chk_sessions_time CHECK (ended_at >= started_at),
    CONSTRAINT fk_sessions_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. assignments
-- ----------------------------------------------------------------------------
CREATE TABLE assignments (
    assignment_id      VARCHAR(36)  NOT NULL,
    course_id          VARCHAR(36)  NOT NULL,
    title              VARCHAR(200) NOT NULL DEFAULT 'Untitled assignment',
    description        TEXT         NULL,
    due_date           DATETIME     NOT NULL,
    max_points         DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    weightage_percent  DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    created_by         VARCHAR(36)  NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT chk_assign_points CHECK (max_points > 0),
    CONSTRAINT chk_assign_weight CHECK (weightage_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_assign_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    CONSTRAINT fk_assignments_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_creator FOREIGN KEY (created_by)
        REFERENCES students (student_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. submissions  (associative entity with attempt history)
-- ----------------------------------------------------------------------------
CREATE TABLE submissions (
    submission_id   BIGINT       NOT NULL AUTO_INCREMENT,
    assignment_id   VARCHAR(36)  NOT NULL,
    student_id      VARCHAR(36)  NOT NULL,
    version_no      INT          NOT NULL DEFAULT 1,
    file_url        VARCHAR(500) NOT NULL,
    status          VARCHAR(15)  NOT NULL DEFAULT 'submitted',
    points_awarded  DECIMAL(6,2) NULL,
    feedback        TEXT         NULL,
    submitted_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_submissions PRIMARY KEY (submission_id),
    CONSTRAINT uq_submissions_version UNIQUE (assignment_id, student_id, version_no),
    CONSTRAINT chk_sub_version CHECK (version_no > 0),
    CONSTRAINT chk_sub_status CHECK (status IN ('submitted','graded','late','resubmitted')),
    CONSTRAINT chk_sub_points CHECK (points_awarded IS NULL OR (points_awarded >= 0 AND points_awarded <= 1000)),
    CONSTRAINT fk_submissions_assignment FOREIGN KEY (assignment_id)
        REFERENCES assignments (assignment_id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. study_materials
-- ----------------------------------------------------------------------------
CREATE TABLE study_materials (
    material_id    VARCHAR(36)  NOT NULL,
    course_id      VARCHAR(36)  NOT NULL,
    uploader_id    VARCHAR(36)  NULL,
    title          VARCHAR(200) NOT NULL DEFAULT 'Untitled material',
    material_type  VARCHAR(30)  NOT NULL DEFAULT 'lecture_notes',
    file_url       VARCHAR(500) NOT NULL,
    plain_text     TEXT         NULL,
    is_public      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_materials PRIMARY KEY (material_id),
    CONSTRAINT chk_materials_type CHECK (material_type IN ('lecture_notes','slides','flashcards','summary')),
    CONSTRAINT fk_materials_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id) ON DELETE CASCADE,
    CONSTRAINT fk_materials_uploader FOREIGN KEY (uploader_id)
        REFERENCES students (student_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. study_tasks  (self-referencing hierarchy: task -> sub-tasks)
-- ----------------------------------------------------------------------------
CREATE TABLE study_tasks (
    task_id         BIGINT       NOT NULL AUTO_INCREMENT,
    student_id      VARCHAR(36)  NOT NULL,
    course_id       VARCHAR(36)  NULL,
    assignment_id   VARCHAR(36)  NULL,
    parent_task_id  BIGINT       NULL,
    title           VARCHAR(255) NOT NULL,
    priority        VARCHAR(10)  NOT NULL DEFAULT 'medium',
    due_date        DATE         NULL,
    is_completed    BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at    DATETIME     NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tasks PRIMARY KEY (task_id),
    CONSTRAINT chk_tasks_priority CHECK (priority IN ('low','medium','high','urgent')),
    CONSTRAINT chk_tasks_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    CONSTRAINT fk_tasks_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_course FOREIGN KEY (course_id)
        REFERENCES courses (course_id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignment FOREIGN KEY (assignment_id)
        REFERENCES assignments (assignment_id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
        REFERENCES study_tasks (task_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. grade_audit_log  (written only by triggers; see 03_advanced.sql)
-- ----------------------------------------------------------------------------
CREATE TABLE grade_audit_log (
    audit_id       BIGINT       NOT NULL AUTO_INCREMENT,
    submission_id  BIGINT       NOT NULL,
    assignment_id  VARCHAR(36)  NOT NULL,
    student_id     VARCHAR(36)  NOT NULL,
    old_points     DECIMAL(6,2) NULL,
    new_points     DECIMAL(6,2) NULL,
    old_status     VARCHAR(15)  NULL,
    new_status     VARCHAR(15)  NULL,
    changed_by     VARCHAR(100) NOT NULL,
    changed_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit PRIMARY KEY (audit_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Secondary indexes (support the joins and filters used by the application)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_courses_instructor   ON courses (instructor_id);
CREATE INDEX idx_courses_department   ON courses (department);
CREATE INDEX idx_enroll_student       ON course_enrollments (student_id, enrollment_status);
CREATE INDEX idx_sessions_student     ON study_sessions (student_id, started_at);
CREATE INDEX idx_sessions_course      ON study_sessions (course_id);
CREATE INDEX idx_assign_course_due    ON assignments (course_id, due_date);
CREATE INDEX idx_sub_student          ON submissions (student_id);
CREATE INDEX idx_tasks_student        ON study_tasks (student_id, is_completed);
CREATE INDEX idx_tasks_parent         ON study_tasks (parent_task_id);
CREATE INDEX idx_audit_submission     ON grade_audit_log (submission_id);
CREATE FULLTEXT INDEX ftx_materials   ON study_materials (title, plain_text);

-- ALTER TABLE demonstration: column added after the initial design
ALTER TABLE courses ADD COLUMN max_seats INT NOT NULL DEFAULT 60,
                    ADD CONSTRAINT chk_courses_seats CHECK (max_seats > 0);
