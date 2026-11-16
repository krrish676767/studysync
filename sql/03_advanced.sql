-- ============================================================================
-- StudySync : 03_advanced.sql
-- Views, stored functions, stored procedures (incl. cursor + transaction),
-- and triggers.
-- ============================================================================
USE studysync;

DROP TRIGGER   IF EXISTS trg_students_before_insert;
DROP TRIGGER   IF EXISTS trg_enroll_before_insert;
DROP TRIGGER   IF EXISTS trg_sub_before_insert;
DROP TRIGGER   IF EXISTS trg_sub_before_update;
DROP TRIGGER   IF EXISTS trg_sub_after_update;
DROP TRIGGER   IF EXISTS trg_task_before_update;
DROP PROCEDURE IF EXISTS sp_enroll_student;
DROP PROCEDURE IF EXISTS sp_submit_assignment;
DROP PROCEDURE IF EXISTS sp_grade_submission;
DROP PROCEDURE IF EXISTS sp_student_dashboard;
DROP PROCEDURE IF EXISTS sp_finalize_course_grades;
DROP FUNCTION  IF EXISTS fn_grade_letter;
DROP FUNCTION  IF EXISTS fn_course_score_pct;
DROP FUNCTION  IF EXISTS fn_study_minutes;

DELIMITER $$

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- F1. Convert a percentage into a letter grade
CREATE FUNCTION fn_grade_letter(p_pct DECIMAL(6,2))
RETURNS VARCHAR(2)
DETERMINISTIC
BEGIN
    IF p_pct IS NULL THEN RETURN NULL; END IF;
    RETURN CASE
        WHEN p_pct >= 90 THEN 'S'
        WHEN p_pct >= 80 THEN 'A'
        WHEN p_pct >= 70 THEN 'B'
        WHEN p_pct >= 60 THEN 'C'
        WHEN p_pct >= 50 THEN 'D'
        ELSE 'F'
    END;
END$$

-- F2. Weighted score (%) of a student in a course.
--     Only the latest graded version of each assignment counts.
CREATE FUNCTION fn_course_score_pct(p_student VARCHAR(36), p_course VARCHAR(36))
RETURNS DECIMAL(6,2)
READS SQL DATA
BEGIN
    DECLARE v_pct DECIMAL(6,2);
    SELECT ROUND(SUM(s.points_awarded / a.max_points * a.weightage_percent)
                 / SUM(a.weightage_percent) * 100, 2)
      INTO v_pct
      FROM submissions s
      JOIN assignments a ON a.assignment_id = s.assignment_id
     WHERE s.student_id = p_student
       AND a.course_id  = p_course
       AND s.points_awarded IS NOT NULL
       AND s.version_no = (SELECT MAX(s2.version_no)
                             FROM submissions s2
                            WHERE s2.assignment_id = s.assignment_id
                              AND s2.student_id    = s.student_id
                              AND s2.points_awarded IS NOT NULL);
    RETURN v_pct;
END$$

-- F3. Minutes studied by a student in the last p_days days
CREATE FUNCTION fn_study_minutes(p_student VARCHAR(36), p_days INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_total INT;
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_total
      FROM study_sessions
     WHERE student_id = p_student
       AND started_at >= DATE_SUB(NOW(), INTERVAL p_days DAY);
    RETURN v_total;
END$$

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- P1. Enroll a student in a course with business-rule validation
CREATE PROCEDURE sp_enroll_student(
    IN p_student VARCHAR(36),
    IN p_course  VARCHAR(36),
    IN p_target  VARCHAR(5))
BEGIN
    DECLARE v_active   BOOLEAN;
    DECLARE v_archived BOOLEAN;
    DECLARE v_seats    INT;
    DECLARE v_taken    INT;
    DECLARE v_status   VARCHAR(15);

    SELECT is_active INTO v_active FROM students WHERE student_id = p_student;
    IF v_active IS NULL OR v_active = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student does not exist or is deactivated';
    END IF;

    SELECT is_archived, max_seats INTO v_archived, v_seats FROM courses WHERE course_id = p_course;
    IF v_archived IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not exist';
    ELSEIF v_archived = TRUE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course is archived and closed for enrollment';
    END IF;

    SELECT enrollment_status INTO v_status
      FROM course_enrollments WHERE course_id = p_course AND student_id = p_student;

    IF v_status IS NOT NULL AND v_status <> 'dropped' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is already enrolled in this course';
    END IF;

    SELECT COUNT(*) INTO v_taken
      FROM course_enrollments
     WHERE course_id = p_course AND enrollment_status <> 'dropped';
    IF v_taken >= v_seats THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course is full: no seats available';
    END IF;

    IF v_status = 'dropped' THEN
        UPDATE course_enrollments
           SET enrollment_status = 'active', target_grade = p_target, enrolled_at = NOW()
         WHERE course_id = p_course AND student_id = p_student;
    ELSE
        INSERT INTO course_enrollments (course_id, student_id, enrollment_status, target_grade)
        VALUES (p_course, p_student, 'active', p_target);
    END IF;
END$$

-- P2. Submit an assignment: automatic versioning + late detection, in a transaction
CREATE PROCEDURE sp_submit_assignment(
    IN  p_assignment VARCHAR(36),
    IN  p_student    VARCHAR(36),
    IN  p_file_url   VARCHAR(500),
    OUT p_submission_id BIGINT,
    OUT p_version    INT)
BEGIN
    DECLARE v_course  VARCHAR(36);
    DECLARE v_due     DATETIME;
    DECLARE v_enrolled INT;
    DECLARE v_status  VARCHAR(15);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT course_id, due_date INTO v_course, v_due
      FROM assignments WHERE assignment_id = p_assignment;
    IF v_course IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assignment does not exist';
    END IF;

    SELECT COUNT(*) INTO v_enrolled
      FROM course_enrollments
     WHERE course_id = v_course AND student_id = p_student AND enrollment_status = 'active';
    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only actively enrolled students can submit';
    END IF;

    -- lock the existing attempts so two parallel submits cannot take the same version
    SELECT COALESCE(MAX(version_no), 0) + 1 INTO p_version
      FROM submissions
     WHERE assignment_id = p_assignment AND student_id = p_student
       FOR UPDATE;

    SET v_status = CASE
        WHEN NOW() > v_due  THEN 'late'
        WHEN p_version > 1  THEN 'resubmitted'
        ELSE 'submitted' END;

    INSERT INTO submissions (assignment_id, student_id, version_no, file_url, status)
    VALUES (p_assignment, p_student, p_version, p_file_url, v_status);
    SET p_submission_id = LAST_INSERT_ID();

    -- close any open planner task that was linked to this assignment
    UPDATE study_tasks
       SET is_completed = TRUE
     WHERE student_id = p_student AND assignment_id = p_assignment
       AND parent_task_id IS NULL AND is_completed = FALSE;

    COMMIT;
END$$

-- P3. Grade a submission (only the course instructor or an admin may grade)
CREATE PROCEDURE sp_grade_submission(
    IN p_submission_id BIGINT,
    IN p_points   DECIMAL(6,2),
    IN p_feedback TEXT,
    IN p_grader   VARCHAR(36))
BEGIN
    DECLARE v_role        VARCHAR(20);
    DECLARE v_email       VARCHAR(255);
    DECLARE v_instructor  VARCHAR(36);

    SELECT role, email INTO v_role, v_email FROM students WHERE student_id = p_grader;

    SELECT c.instructor_id INTO v_instructor
      FROM submissions s
      JOIN assignments a ON a.assignment_id = s.assignment_id
      JOIN courses c     ON c.course_id = a.course_id
     WHERE s.submission_id = p_submission_id;

    IF v_instructor IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Submission does not exist';
    END IF;
    IF v_role IS NULL OR NOT (v_role = 'admin' OR (v_role = 'instructor' AND v_instructor = p_grader)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the course instructor or an admin can grade this submission';
    END IF;

    SET @app_user = v_email;          -- picked up by the audit trigger
    UPDATE submissions
       SET points_awarded = p_points, feedback = p_feedback, status = 'graded'
     WHERE submission_id = p_submission_id;
    SET @app_user = NULL;
END$$

-- P4. One-row dashboard summary for a student
CREATE PROCEDURE sp_student_dashboard(IN p_student VARCHAR(36))
BEGIN
    SELECT
        (SELECT COUNT(*) FROM course_enrollments
          WHERE student_id = p_student AND enrollment_status = 'active')        AS active_courses,
        fn_study_minutes(p_student, 7)                                          AS minutes_last_7_days,
        fn_study_minutes(p_student, 30)                                         AS minutes_last_30_days,
        (SELECT ROUND(AVG(focus_score), 2) FROM study_sessions
          WHERE student_id = p_student)                                         AS avg_focus,
        (SELECT COUNT(*) FROM study_tasks
          WHERE student_id = p_student AND is_completed = FALSE)                AS open_tasks,
        (SELECT COUNT(*) FROM assignments a
           JOIN course_enrollments e ON e.course_id = a.course_id
          WHERE e.student_id = p_student AND e.enrollment_status = 'active'
            AND a.due_date > NOW()
            AND NOT EXISTS (SELECT 1 FROM submissions s
                             WHERE s.assignment_id = a.assignment_id
                               AND s.student_id = p_student))                   AS pending_assignments,
        (SELECT COUNT(DISTINCT assignment_id) FROM submissions
          WHERE student_id = p_student)                                         AS assignments_submitted;
END$$

-- P5. Finalize grades for a course using a CURSOR over its active enrollments
CREATE PROCEDURE sp_finalize_course_grades(IN p_course VARCHAR(36), OUT p_updated INT)
BEGIN
    DECLARE v_student VARCHAR(36);
    DECLARE v_pct     DECIMAL(6,2);
    DECLARE v_done    BOOLEAN DEFAULT FALSE;
    DECLARE cur CURSOR FOR
        SELECT student_id FROM course_enrollments
         WHERE course_id = p_course AND enrollment_status = 'active';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    SET p_updated = 0;
    OPEN cur;
    grade_loop: LOOP
        FETCH cur INTO v_student;
        IF v_done THEN LEAVE grade_loop; END IF;

        SET v_pct = fn_course_score_pct(v_student, p_course);
        IF v_pct IS NOT NULL THEN
            UPDATE course_enrollments
               SET final_grade = fn_grade_letter(v_pct), enrollment_status = 'completed'
             WHERE course_id = p_course AND student_id = v_student;
            SET p_updated = p_updated + 1;
        END IF;
    END LOOP;
    CLOSE cur;
END$$

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- T1. Normalise e-mail before insert
CREATE TRIGGER trg_students_before_insert
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(TRIM(NEW.email));
END$$

-- T2. An instructor cannot enroll in a course they teach
CREATE TRIGGER trg_enroll_before_insert
BEFORE INSERT ON course_enrollments
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM courses
                WHERE course_id = NEW.course_id AND instructor_id = NEW.student_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An instructor cannot enroll in their own course';
    END IF;
END$$

-- T3. Points cannot exceed the assignment maximum (cross-table rule: not possible with CHECK)
CREATE TRIGGER trg_sub_before_insert
BEFORE INSERT ON submissions
FOR EACH ROW
BEGIN
    DECLARE v_max DECIMAL(6,2);
    SELECT max_points INTO v_max FROM assignments WHERE assignment_id = NEW.assignment_id;
    IF NEW.points_awarded IS NOT NULL AND NEW.points_awarded > v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'points_awarded cannot exceed the assignment max_points';
    END IF;
END$$

CREATE TRIGGER trg_sub_before_update
BEFORE UPDATE ON submissions
FOR EACH ROW
BEGIN
    DECLARE v_max DECIMAL(6,2);
    SELECT max_points INTO v_max FROM assignments WHERE assignment_id = NEW.assignment_id;
    IF NEW.points_awarded IS NOT NULL AND NEW.points_awarded > v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'points_awarded cannot exceed the assignment max_points';
    END IF;
END$$

-- T4. Audit every change of marks or status
CREATE TRIGGER trg_sub_after_update
AFTER UPDATE ON submissions
FOR EACH ROW
BEGIN
    IF NOT (OLD.points_awarded <=> NEW.points_awarded) OR OLD.status <> NEW.status THEN
        INSERT INTO grade_audit_log
            (submission_id, assignment_id, student_id, old_points, new_points, old_status, new_status, changed_by)
        VALUES
            (NEW.submission_id, NEW.assignment_id, NEW.student_id,
             OLD.points_awarded, NEW.points_awarded, OLD.status, NEW.status,
             COALESCE(@app_user, CURRENT_USER()));
    END IF;
END$$

-- T5. Keep completed_at consistent with is_completed
CREATE TRIGGER trg_task_before_update
BEFORE UPDATE ON study_tasks
FOR EACH ROW
BEGIN
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
        SET NEW.completed_at = NOW();
    ELSEIF NEW.is_completed = FALSE THEN
        SET NEW.completed_at = NULL;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW v_student_course_progress AS
SELECT e.student_id,
       s.full_name                                   AS student_name,
       e.course_id,
       c.course_code,
       c.title                                       AS course_title,
       e.enrollment_status,
       e.target_grade,
       e.final_grade,
       (SELECT COALESCE(ROUND(SUM(ss.duration_minutes) / 60, 1), 0)
          FROM study_sessions ss
         WHERE ss.student_id = e.student_id AND ss.course_id = e.course_id) AS study_hours,
       (SELECT COUNT(*) FROM assignments a WHERE a.course_id = e.course_id) AS total_assignments,
       (SELECT COUNT(DISTINCT sb.assignment_id)
          FROM submissions sb JOIN assignments a ON a.assignment_id = sb.assignment_id
         WHERE sb.student_id = e.student_id AND a.course_id = e.course_id)  AS submitted_assignments,
       fn_course_score_pct(e.student_id, e.course_id)                       AS score_pct,
       fn_grade_letter(fn_course_score_pct(e.student_id, e.course_id))      AS projected_grade
  FROM course_enrollments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses  c ON c.course_id  = e.course_id;

CREATE OR REPLACE VIEW v_upcoming_deadlines AS
SELECT e.student_id,
       a.assignment_id,
       c.course_code,
       a.title,
       a.due_date,
       DATEDIFF(a.due_date, NOW()) AS days_left,
       EXISTS (SELECT 1 FROM submissions s
                WHERE s.assignment_id = a.assignment_id
                  AND s.student_id = e.student_id) AS is_submitted
  FROM course_enrollments e
  JOIN assignments a ON a.course_id = e.course_id
  JOIN courses c     ON c.course_id = e.course_id
 WHERE e.enrollment_status = 'active'
   AND a.due_date >= NOW();

CREATE OR REPLACE VIEW v_course_leaderboard AS
SELECT p.course_id,
       p.course_code,
       p.student_id,
       p.student_name,
       p.score_pct,
       p.study_hours,
       RANK() OVER (PARTITION BY p.course_id ORDER BY p.score_pct DESC) AS course_rank
  FROM v_student_course_progress p
 WHERE p.score_pct IS NOT NULL;
