-- ============================================================================
-- StudySync : 05_queries.sql  -  simple, join, nested/correlated and advanced queries
-- The same queries run live in the application's "Query Lab" page.
-- ============================================================================
USE studysync;

-- ############################################################################
-- SIMPLE QUERIES
-- ############################################################################

-- S1. Active courses ordered by department
--     Concept: SELECT, WHERE, ORDER BY
SELECT course_code, title, department, credits
  FROM courses
 WHERE is_archived = FALSE
 ORDER BY department, course_code;

-- S2. Students in semester 5
--     Concept: WHERE with AND
SELECT full_name, enrollment_no, email
  FROM students
 WHERE role = 'student' AND current_semester = 5
 ORDER BY full_name;

-- S3. Assignments due in the next 14 days
--     Concept: BETWEEN, date functions
SELECT title, due_date, max_points
  FROM assignments
 WHERE due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 14 DAY)
 ORDER BY due_date;

-- S4. Courses whose title mentions Data or Algorithms
--     Concept: LIKE pattern matching
SELECT course_code, title
  FROM courses
 WHERE title LIKE '%Data%' OR title LIKE '%Algorithm%';

-- S5. Number of users per role
--     Concept: GROUP BY, COUNT
SELECT role, COUNT(*) AS users
  FROM students
 GROUP BY role;

-- S6. Study time and focus by session type
--     Concept: Aggregates, GROUP BY, HAVING
SELECT session_type,
       COUNT(*)                    AS sessions,
       SUM(duration_minutes)       AS total_minutes,
       ROUND(AVG(focus_score), 2)  AS avg_focus
  FROM study_sessions
 GROUP BY session_type
HAVING SUM(duration_minutes) >= 60
 ORDER BY total_minutes DESC;

-- S7. Syllabus modules stored as JSON
--     Concept: JSON functions
SELECT course_code,
       JSON_LENGTH(syllabus_json, '$.modules')                     AS module_count,
       JSON_UNQUOTE(JSON_EXTRACT(syllabus_json, '$.modules[0]'))   AS first_module
  FROM courses;

-- S8. Full-text search in study materials
--     Concept: FULLTEXT index, MATCH ... AGAINST
SELECT title, material_type
  FROM study_materials
 WHERE MATCH(title, plain_text) AGAINST ('normalization tree' IN NATURAL LANGUAGE MODE);

-- ############################################################################
-- JOIN QUERIES
-- ############################################################################

-- J1. Courses with their instructor
--     Concept: INNER JOIN
SELECT c.course_code, c.title, s.full_name AS instructor
  FROM courses c
 INNER JOIN students s ON s.student_id = c.instructor_id
 ORDER BY c.course_code;

-- J2. Who is enrolled in what
--     Concept: Three-table JOIN
SELECT s.full_name, c.course_code, c.title, e.enrollment_status, e.target_grade
  FROM course_enrollments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses  c ON c.course_id  = e.course_id
 ORDER BY s.full_name, c.course_code;

-- J3. Enrollment count per student (including zero)
--     Concept: LEFT OUTER JOIN + GROUP BY
SELECT s.full_name, COUNT(e.course_id) AS courses_enrolled
  FROM students s
  LEFT JOIN course_enrollments e
         ON e.student_id = s.student_id AND e.enrollment_status <> 'dropped'
 WHERE s.role = 'student'
 GROUP BY s.student_id, s.full_name
 ORDER BY courses_enrolled DESC, s.full_name;

-- J4. Tasks with their parent task
--     Concept: SELF JOIN
SELECT child.task_id, child.title AS task, parent.title AS parent_task, child.priority
  FROM study_tasks child
  LEFT JOIN study_tasks parent ON parent.task_id = child.parent_task_id
 ORDER BY child.task_id;

-- J5. Course overview: instructor, enrollment, assignments, average score
--     Concept: Five-table JOIN with aggregates
SELECT c.course_code,
       i.full_name                                          AS instructor,
       COUNT(DISTINCT e.student_id)                         AS active_students,
       COUNT(DISTINCT a.assignment_id)                      AS assignments,
       ROUND(AVG(sb.points_awarded / a.max_points * 100), 1) AS avg_score_pct
  FROM courses c
  JOIN students i                ON i.student_id = c.instructor_id
  LEFT JOIN course_enrollments e ON e.course_id = c.course_id AND e.enrollment_status = 'active'
  LEFT JOIN assignments a        ON a.course_id = c.course_id
  LEFT JOIN submissions sb       ON sb.assignment_id = a.assignment_id
 GROUP BY c.course_id, c.course_code, i.full_name
 ORDER BY c.course_code;

-- J6. Everyone who contributes content
--     Concept: UNION (set operation)
SELECT s.full_name, 'teaches a course' AS contribution
  FROM students s
 WHERE s.student_id IN (SELECT instructor_id FROM courses)
UNION
SELECT s.full_name, 'uploaded study material'
  FROM students s
  JOIN study_materials m ON m.uploader_id = s.student_id
 ORDER BY full_name;

-- ############################################################################
-- NESTED AND CORRELATED QUERIES
-- ############################################################################

-- N1. Scores above the average for Milestone 1
--     Concept: Scalar subquery
SELECT s.full_name, sb.version_no, sb.points_awarded
  FROM submissions sb
  JOIN students s ON s.student_id = sb.student_id
 WHERE sb.assignment_id = 'a201-er'
   AND sb.points_awarded > (SELECT AVG(points_awarded)
                              FROM submissions
                             WHERE assignment_id = 'a201-er')
 ORDER BY sb.points_awarded DESC;

-- N2. Students who took a Mathematics course
--     Concept: Nested IN (two levels)
SELECT full_name, enrollment_no
  FROM students
 WHERE student_id IN (SELECT student_id
                        FROM course_enrollments
                       WHERE course_id IN (SELECT course_id
                                             FROM courses
                                            WHERE department = 'Mathematics'));

-- N3. Students who have never submitted anything
--     Concept: Correlated NOT EXISTS
SELECT s.full_name, s.enrollment_no
  FROM students s
 WHERE s.role = 'student'
   AND NOT EXISTS (SELECT 1
                     FROM submissions sb
                    WHERE sb.student_id = s.student_id);

-- N4. Submissions that beat their own assignment average
--     Concept: Correlated subquery
SELECT a.title, s.full_name, sb.points_awarded
  FROM submissions sb
  JOIN assignments a ON a.assignment_id = sb.assignment_id
  JOIN students s    ON s.student_id = sb.student_id
 WHERE sb.points_awarded > (SELECT AVG(x.points_awarded)
                              FROM submissions x
                             WHERE x.assignment_id = sb.assignment_id)
 ORDER BY a.title, sb.points_awarded DESC;

-- N5. Latest attempt of every student for every assignment
--     Concept: Correlated subquery with MAX
SELECT a.title, s.full_name, sb.version_no, sb.status, sb.points_awarded
  FROM submissions sb
  JOIN assignments a ON a.assignment_id = sb.assignment_id
  JOIN students s    ON s.student_id = sb.student_id
 WHERE sb.version_no = (SELECT MAX(x.version_no)
                          FROM submissions x
                         WHERE x.assignment_id = sb.assignment_id
                           AND x.student_id    = sb.student_id)
 ORDER BY a.title, s.full_name;

-- N6. Students enrolled in every course taught by Prof. Alan Turing
--     Concept: Relational division (double NOT EXISTS)
SELECT s.full_name
  FROM students s
 WHERE s.role = 'student'
   AND NOT EXISTS (SELECT 1
                     FROM courses c
                    WHERE c.instructor_id = '22222222-2222-2222-2222-222222222222'
                      AND NOT EXISTS (SELECT 1
                                        FROM course_enrollments e
                                       WHERE e.course_id  = c.course_id
                                         AND e.student_id = s.student_id));

-- N7. Course with the most study time
--     Concept: Derived table + >= ALL
SELECT c.course_code, c.title, t.total_minutes
  FROM (SELECT course_id, SUM(duration_minutes) AS total_minutes
          FROM study_sessions
         GROUP BY course_id) t
  JOIN courses c ON c.course_id = t.course_id
 WHERE t.total_minutes >= ALL (SELECT SUM(duration_minutes)
                                 FROM study_sessions
                                GROUP BY course_id);

-- ############################################################################
-- CTE, WINDOW, FUNCTION, PROCEDURE
-- ############################################################################

-- C1. Task hierarchy of a student (tree view)
--     Concept: Recursive CTE
WITH RECURSIVE task_tree AS (
    SELECT task_id, title, is_completed, 0 AS depth,
           CAST(LPAD(task_id, 6, '0') AS CHAR(500)) AS path
      FROM study_tasks
     WHERE parent_task_id IS NULL
       AND student_id = '11111111-1111-1111-1111-111111111111'
    UNION ALL
    SELECT t.task_id, t.title, t.is_completed, tt.depth + 1,
           CONCAT(tt.path, '/', LPAD(t.task_id, 6, '0'))
      FROM study_tasks t
      JOIN task_tree tt ON t.parent_task_id = tt.task_id
)
SELECT CONCAT(REPEAT('-- ', depth), title) AS task, depth, is_completed
  FROM task_tree
 ORDER BY path;

-- C2. Completion percentage of every top-level task
--     Concept: Recursive CTE + aggregation
WITH RECURSIVE tree AS (
    SELECT task_id AS root_id, title AS root_title, task_id, is_completed
      FROM study_tasks
     WHERE parent_task_id IS NULL
    UNION ALL
    SELECT tr.root_id, tr.root_title, t.task_id, t.is_completed
      FROM study_tasks t
      JOIN tree tr ON t.parent_task_id = tr.task_id
)
SELECT root_title                                   AS task,
       COUNT(*) - 1                                 AS sub_tasks,
       ROUND(100 * SUM(is_completed) / COUNT(*))    AS pct_complete
  FROM tree
 GROUP BY root_id, root_title
 ORDER BY sub_tasks DESC;

-- C3. Course leaderboard with rank and gap from the course average
--     Concept: Chained CTEs + window functions (RANK, AVG OVER)
WITH latest AS (
    SELECT sb.assignment_id, sb.student_id, sb.points_awarded
      FROM submissions sb
     WHERE sb.points_awarded IS NOT NULL
       AND sb.version_no = (SELECT MAX(x.version_no)
                              FROM submissions x
                             WHERE x.assignment_id = sb.assignment_id
                               AND x.student_id = sb.student_id
                               AND x.points_awarded IS NOT NULL)
),
scores AS (
    SELECT a.course_id, l.student_id,
           SUM(l.points_awarded / a.max_points * a.weightage_percent)
             / SUM(a.weightage_percent) * 100 AS pct
      FROM latest l
      JOIN assignments a ON a.assignment_id = l.assignment_id
     GROUP BY a.course_id, l.student_id
)
SELECT c.course_code,
       s.full_name,
       ROUND(sc.pct, 2)                                                        AS score_pct,
       RANK() OVER (PARTITION BY sc.course_id ORDER BY sc.pct DESC)            AS course_rank,
       ROUND(sc.pct - AVG(sc.pct) OVER (PARTITION BY sc.course_id), 2)         AS gap_from_avg
  FROM scores sc
  JOIN courses c  ON c.course_id  = sc.course_id
  JOIN students s ON s.student_id = sc.student_id
 ORDER BY c.course_code, course_rank;

-- C4. Study efficiency: marks earned per hour studied
--     Concept: Multiple CTEs joined together
WITH hours AS (
    SELECT student_id, SUM(duration_minutes) / 60 AS study_hours
      FROM study_sessions
     GROUP BY student_id
),
marks AS (
    SELECT sb.student_id, AVG(sb.points_awarded / a.max_points * 100) AS avg_pct
      FROM submissions sb
      JOIN assignments a ON a.assignment_id = sb.assignment_id
     WHERE sb.points_awarded IS NOT NULL
     GROUP BY sb.student_id
)
SELECT s.full_name,
       ROUND(h.study_hours, 1)             AS study_hours,
       ROUND(m.avg_pct, 1)                 AS avg_score_pct,
       ROUND(m.avg_pct / h.study_hours, 1) AS score_points_per_hour
  FROM students s
  JOIN hours h ON h.student_id = s.student_id
  JOIN marks m ON m.student_id = s.student_id
 ORDER BY score_points_per_hour DESC;

-- C5. Running study total and moving focus average
--     Concept: Window functions with frames
SELECT s.full_name,
       DATE(ss.started_at)  AS study_day,
       ss.duration_minutes,
       SUM(ss.duration_minutes) OVER (PARTITION BY ss.student_id ORDER BY ss.started_at) AS running_minutes,
       ROUND(AVG(ss.focus_score) OVER (PARTITION BY ss.student_id ORDER BY ss.started_at
                                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)     AS moving_avg_focus
  FROM study_sessions ss
  JOIN students s ON s.student_id = ss.student_id
 ORDER BY s.full_name, ss.started_at;

-- A1. Projected grade against target grade
--     Concept: Stored functions inside a query
SELECT s.full_name, c.course_code,
       fn_course_score_pct(e.student_id, e.course_id)                   AS score_pct,
       fn_grade_letter(fn_course_score_pct(e.student_id, e.course_id))  AS projected_grade,
       e.target_grade
  FROM course_enrollments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses  c ON c.course_id  = e.course_id
 WHERE e.enrollment_status = 'active'
 ORDER BY c.course_code, score_pct DESC;

-- A2. Top three students of each course
--     Concept: View built on a view + window function
SELECT course_code, course_rank, student_name, score_pct, study_hours
  FROM v_course_leaderboard
 WHERE course_rank <= 3
 ORDER BY course_code, course_rank;

-- A3. Dashboard summary of a student
--     Concept: Stored procedure call
CALL sp_student_dashboard('11111111-1111-1111-1111-111111111111');

-- A4. Grade change history
--     Concept: Rows written by the audit trigger
SELECT g.audit_id, a.title, s.full_name, g.old_points, g.new_points,
       g.old_status, g.new_status, g.changed_by, g.changed_at
  FROM grade_audit_log g
  JOIN assignments a ON a.assignment_id = g.assignment_id
  JOIN students s    ON s.student_id = g.student_id
 ORDER BY g.changed_at DESC
 LIMIT 20;

-- ############################################################################
-- DML OPERATIONS (INSERT / UPDATE / DELETE) inside a transaction
-- ############################################################################
START TRANSACTION;

-- INSERT: a new study session
INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes, focus_score, notes, started_at, ended_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'c101-dbms', 'pomodoro', 25, 4, 'DML demo row',
        DATE_SUB(NOW(), INTERVAL 25 MINUTE), NOW());
SET @new_session = LAST_INSERT_ID();

-- INSERT ... SELECT: create a planner task for every assignment still pending for a student
INSERT INTO study_tasks (student_id, course_id, assignment_id, title, priority, due_date)
SELECT d.student_id, a.course_id, a.assignment_id, CONCAT('Submit: ', a.title), 'high', DATE(a.due_date)
  FROM v_upcoming_deadlines d
  JOIN assignments a ON a.assignment_id = d.assignment_id
 WHERE d.student_id = '33333333-3333-3333-3333-333333333333' AND d.is_submitted = FALSE;

-- UPDATE: single row
UPDATE study_sessions SET focus_score = 5, notes = 'DML demo row (updated)' WHERE session_id = @new_session;

-- UPDATE with a join: extend the deadline of every assignment of one instructor by two days
UPDATE assignments a
  JOIN courses c ON c.course_id = a.course_id
   SET a.due_date = DATE_ADD(a.due_date, INTERVAL 2 DAY)
 WHERE c.instructor_id = '66666666-6666-6666-6666-666666666666' AND a.due_date > NOW();

-- UPDATE fired through a trigger: marking a task complete sets completed_at automatically
UPDATE study_tasks SET is_completed = TRUE WHERE task_id = 10;
SELECT task_id, title, is_completed, completed_at FROM study_tasks WHERE task_id = 10;

-- DELETE: single row
DELETE FROM study_sessions WHERE session_id = @new_session;

-- DELETE with a subquery: remove completed leaf tasks older than 30 days
DELETE FROM study_tasks
 WHERE is_completed = TRUE
   AND completed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
   AND task_id NOT IN (SELECT parent_task_id FROM (SELECT parent_task_id FROM study_tasks WHERE parent_task_id IS NOT NULL) p);

-- ON DELETE CASCADE: deleting a parent task removes its whole sub-tree
DELETE FROM study_tasks WHERE task_id = 9;
SELECT COUNT(*) AS remaining_children_of_9 FROM study_tasks WHERE parent_task_id = 9;

ROLLBACK;   -- the demo leaves the data unchanged

-- ############################################################################
-- PROCEDURE / FUNCTION / TRIGGER DEMONSTRATION
-- ############################################################################
-- Procedure with validation: this course has only 2 seats, so the call is rejected
-- CALL sp_enroll_student('88888888-8888-8888-8888-888888888888', 'c106-la', 'A');   -- ERROR: Course is full

CALL sp_enroll_student('88888888-8888-8888-8888-888888888888', 'c101-dbms', 'A');
CALL sp_submit_assignment('a203-nosql', '88888888-8888-8888-8888-888888888888',
                          'https://files.studysync.edu/arjun/lab3.js', @sid, @ver);
SELECT @sid AS submission_id, @ver AS version_no;

-- Trigger trg_sub_before_update rejects marks above max_points (50):
-- CALL sp_grade_submission(@sid, 75, 'too high', '22222222-2222-2222-2222-222222222222');  -- ERROR

CALL sp_grade_submission(@sid, 45, 'Well structured pipeline', '22222222-2222-2222-2222-222222222222');
SELECT * FROM grade_audit_log WHERE submission_id = @sid;      -- written by trg_sub_after_update

SELECT fn_course_score_pct('88888888-8888-8888-8888-888888888888', 'c101-dbms') AS score_pct,
       fn_grade_letter(fn_course_score_pct('88888888-8888-8888-8888-888888888888', 'c101-dbms')) AS grade,
       fn_study_minutes('11111111-1111-1111-1111-111111111111', 30) AS krrish_minutes_30d;

-- clean up the demo rows (sp_submit_assignment commits its own transaction)
DELETE FROM grade_audit_log    WHERE submission_id = @sid;
DELETE FROM submissions        WHERE submission_id = @sid;
DELETE FROM course_enrollments WHERE student_id = '88888888-8888-8888-8888-888888888888' AND course_id = 'c101-dbms';
