-- ============================================================================
-- StudySync : 04_roles.sql  -  Role-based access control inside MySQL (DCL)
-- Run as root (needs CREATE ROLE / CREATE USER).
--
--   role_student     read course data, manage own sessions / tasks / submissions
--   role_instructor  everything a student can read + manage courses, assignments, grading
--   role_admin       full control of the studysync schema
--
-- The Next.js backend keeps one connection pool per role and picks the pool
-- from the role stored in the logged-in user's JWT, so the privileges below
-- are enforced by MySQL itself, not only by application code.
-- ============================================================================
USE studysync;

DROP ROLE IF EXISTS 'role_student', 'role_instructor', 'role_admin';
CREATE ROLE 'role_student', 'role_instructor', 'role_admin';

-- ---------------------------------------------------------------- role_student
-- column-level privilege: password_hash is NOT readable by this role
GRANT SELECT (student_id, email, full_name, enrollment_no, current_semester, role, is_active, created_at, last_login_at)
      ON studysync.students TO 'role_student';
GRANT SELECT ON studysync.courses            TO 'role_student';
GRANT SELECT ON studysync.assignments        TO 'role_student';
GRANT SELECT ON studysync.submissions        TO 'role_student';
GRANT SELECT, UPDATE ON studysync.course_enrollments TO 'role_student';
GRANT SELECT, INSERT ON studysync.study_materials    TO 'role_student';
GRANT SELECT, INSERT, UPDATE, DELETE ON studysync.study_sessions TO 'role_student';
GRANT SELECT, INSERT, UPDATE, DELETE ON studysync.study_tasks    TO 'role_student';
GRANT SELECT ON studysync.v_student_course_progress TO 'role_student';
GRANT SELECT ON studysync.v_upcoming_deadlines      TO 'role_student';
GRANT SELECT ON studysync.v_course_leaderboard      TO 'role_student';
GRANT EXECUTE ON PROCEDURE studysync.sp_enroll_student    TO 'role_student';
GRANT EXECUTE ON PROCEDURE studysync.sp_submit_assignment TO 'role_student';
GRANT EXECUTE ON PROCEDURE studysync.sp_student_dashboard TO 'role_student';
GRANT EXECUTE ON FUNCTION  studysync.fn_grade_letter      TO 'role_student';
GRANT EXECUTE ON FUNCTION  studysync.fn_course_score_pct  TO 'role_student';
GRANT EXECUTE ON FUNCTION  studysync.fn_study_minutes     TO 'role_student';

-- ------------------------------------------------------------- role_instructor
GRANT SELECT (student_id, email, full_name, enrollment_no, current_semester, role, is_active, created_at, last_login_at)
      ON studysync.students TO 'role_instructor';
GRANT SELECT, INSERT, UPDATE ON studysync.courses                 TO 'role_instructor';
GRANT SELECT, INSERT, UPDATE, DELETE ON studysync.assignments     TO 'role_instructor';
GRANT SELECT, INSERT, UPDATE, DELETE ON studysync.study_materials TO 'role_instructor';
GRANT SELECT ON studysync.course_enrollments TO 'role_instructor';
GRANT SELECT ON studysync.study_sessions     TO 'role_instructor';
GRANT SELECT ON studysync.study_tasks        TO 'role_instructor';
GRANT SELECT ON studysync.submissions        TO 'role_instructor';
GRANT UPDATE (points_awarded, feedback, status) ON studysync.submissions TO 'role_instructor';
GRANT SELECT ON studysync.grade_audit_log           TO 'role_instructor';
GRANT SELECT ON studysync.v_student_course_progress TO 'role_instructor';
GRANT SELECT ON studysync.v_upcoming_deadlines      TO 'role_instructor';
GRANT SELECT ON studysync.v_course_leaderboard      TO 'role_instructor';
GRANT EXECUTE ON PROCEDURE studysync.sp_grade_submission       TO 'role_instructor';
GRANT EXECUTE ON PROCEDURE studysync.sp_finalize_course_grades TO 'role_instructor';
GRANT EXECUTE ON PROCEDURE studysync.sp_student_dashboard      TO 'role_instructor';
GRANT EXECUTE ON FUNCTION  studysync.fn_grade_letter      TO 'role_instructor';
GRANT EXECUTE ON FUNCTION  studysync.fn_course_score_pct  TO 'role_instructor';
GRANT EXECUTE ON FUNCTION  studysync.fn_study_minutes     TO 'role_instructor';

-- ------------------------------------------------------------------ role_admin
GRANT ALL PRIVILEGES ON studysync.* TO 'role_admin';

-- ---------------------------------------------------------------------- users
-- One MySQL account per role (used by the application's connection pools)
DROP USER IF EXISTS 'ss_student'@'%', 'ss_instructor'@'%', 'ss_admin'@'%', 'ss_auth'@'%';
CREATE USER 'ss_student'@'%'    IDENTIFIED BY 'StudySync@Student1';
CREATE USER 'ss_instructor'@'%' IDENTIFIED BY 'StudySync@Instructor1';
CREATE USER 'ss_admin'@'%'      IDENTIFIED BY 'StudySync@Admin1';
-- ss_auth is used only by the login / register API: it is the only
-- non-admin account that can read password hashes.
CREATE USER 'ss_auth'@'%'       IDENTIFIED BY 'StudySync@Auth1';

GRANT 'role_student'    TO 'ss_student'@'%';
GRANT 'role_instructor' TO 'ss_instructor'@'%';
GRANT 'role_admin'      TO 'ss_admin'@'%';
SET DEFAULT ROLE ALL TO 'ss_student'@'%', 'ss_instructor'@'%', 'ss_admin'@'%';

GRANT SELECT, INSERT ON studysync.students TO 'ss_auth'@'%';
GRANT UPDATE (last_login_at) ON studysync.students TO 'ss_auth'@'%';

FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'role_student';
SHOW GRANTS FOR 'role_instructor';
SHOW GRANTS FOR 'role_admin';
SHOW GRANTS FOR 'ss_student'@'%' USING 'role_student';

-- Demonstration (run while logged in as ss_student):
--   SELECT password_hash FROM students;            -> ERROR 1143 column denied
--   DELETE FROM courses;                           -> ERROR 1142 DELETE denied
--   UPDATE submissions SET points_awarded = 100;   -> ERROR 1142 UPDATE denied
