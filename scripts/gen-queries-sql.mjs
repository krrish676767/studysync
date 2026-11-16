// Generates sql/05_queries.sql from lib/queryCatalog.js  (npm run db:queries)
import { writeFileSync } from 'node:fs';
import { QUERY_CATALOG, LEVEL_LABELS } from '../lib/queryCatalog.js';

let out = `-- ============================================================================
-- StudySync : 05_queries.sql  -  simple, join, nested/correlated and advanced queries
-- The same queries run live in the application's "Query Lab" page.
-- ============================================================================
USE studysync;
`;
let level = '';
for (const q of QUERY_CATALOG) {
  if (q.level !== level) {
    level = q.level;
    out += `\n-- ############################################################################\n-- ${LEVEL_LABELS[level].toUpperCase()}\n-- ############################################################################\n`;
  }
  out += `\n-- ${q.id}. ${q.title}\n--     Concept: ${q.concept}\n${q.sql};\n`;
}
out += `
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
`;
writeFileSync(new URL('../sql/05_queries.sql', import.meta.url), out);
console.log('sql/05_queries.sql written with', QUERY_CATALOG.length, 'queries');
