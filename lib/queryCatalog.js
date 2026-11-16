// Catalogue of the SQL queries shown in the "Query Lab" page.
// sql/05_queries.sql is generated from this same list (npm run db:queries),
// so the report, the SQL script and the running application always agree.

const KRRISH = '11111111-1111-1111-1111-111111111111';

export const QUERY_CATALOG = [
  // ------------------------------------------------------------ SIMPLE
  { id: 'S1', level: 'simple', title: 'Active courses ordered by department', concept: 'SELECT, WHERE, ORDER BY',
    sql: `SELECT course_code, title, department, credits
  FROM courses
 WHERE is_archived = FALSE
 ORDER BY department, course_code` },
  { id: 'S2', level: 'simple', title: 'Students in semester 5', concept: 'WHERE with AND',
    sql: `SELECT full_name, enrollment_no, email
  FROM students
 WHERE role = 'student' AND current_semester = 5
 ORDER BY full_name` },
  { id: 'S3', level: 'simple', title: 'Assignments due in the next 14 days', concept: 'BETWEEN, date functions',
    sql: `SELECT title, due_date, max_points
  FROM assignments
 WHERE due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 14 DAY)
 ORDER BY due_date` },
  { id: 'S4', level: 'simple', title: 'Courses whose title mentions Data or Algorithms', concept: 'LIKE pattern matching',
    sql: `SELECT course_code, title
  FROM courses
 WHERE title LIKE '%Data%' OR title LIKE '%Algorithm%'` },
  { id: 'S5', level: 'simple', title: 'Number of users per role', concept: 'GROUP BY, COUNT',
    sql: `SELECT role, COUNT(*) AS users
  FROM students
 GROUP BY role` },
  { id: 'S6', level: 'simple', title: 'Study time and focus by session type', concept: 'Aggregates, GROUP BY, HAVING',
    sql: `SELECT session_type,
       COUNT(*)                    AS sessions,
       SUM(duration_minutes)       AS total_minutes,
       ROUND(AVG(focus_score), 2)  AS avg_focus
  FROM study_sessions
 GROUP BY session_type
HAVING SUM(duration_minutes) >= 60
 ORDER BY total_minutes DESC` },
  { id: 'S7', level: 'simple', title: 'Syllabus modules stored as JSON', concept: 'JSON functions',
    sql: `SELECT course_code,
       JSON_LENGTH(syllabus_json, '$.modules')                     AS module_count,
       JSON_UNQUOTE(JSON_EXTRACT(syllabus_json, '$.modules[0]'))   AS first_module
  FROM courses` },
  { id: 'S8', level: 'simple', title: 'Full-text search in study materials', concept: 'FULLTEXT index, MATCH ... AGAINST',
    sql: `SELECT title, material_type
  FROM study_materials
 WHERE MATCH(title, plain_text) AGAINST ('normalization tree' IN NATURAL LANGUAGE MODE)` },

  // ------------------------------------------------------------ JOINS
  { id: 'J1', level: 'join', title: 'Courses with their instructor', concept: 'INNER JOIN',
    sql: `SELECT c.course_code, c.title, s.full_name AS instructor
  FROM courses c
 INNER JOIN students s ON s.student_id = c.instructor_id
 ORDER BY c.course_code` },
  { id: 'J2', level: 'join', title: 'Who is enrolled in what', concept: 'Three-table JOIN',
    sql: `SELECT s.full_name, c.course_code, c.title, e.enrollment_status, e.target_grade
  FROM course_enrollments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses  c ON c.course_id  = e.course_id
 ORDER BY s.full_name, c.course_code` },
  { id: 'J3', level: 'join', title: 'Enrollment count per student (including zero)', concept: 'LEFT OUTER JOIN + GROUP BY',
    sql: `SELECT s.full_name, COUNT(e.course_id) AS courses_enrolled
  FROM students s
  LEFT JOIN course_enrollments e
         ON e.student_id = s.student_id AND e.enrollment_status <> 'dropped'
 WHERE s.role = 'student'
 GROUP BY s.student_id, s.full_name
 ORDER BY courses_enrolled DESC, s.full_name` },
  { id: 'J4', level: 'join', title: 'Tasks with their parent task', concept: 'SELF JOIN',
    sql: `SELECT child.task_id, child.title AS task, parent.title AS parent_task, child.priority
  FROM study_tasks child
  LEFT JOIN study_tasks parent ON parent.task_id = child.parent_task_id
 ORDER BY child.task_id` },
  { id: 'J5', level: 'join', title: 'Course overview: instructor, enrollment, assignments, average score', concept: 'Five-table JOIN with aggregates',
    sql: `SELECT c.course_code,
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
 ORDER BY c.course_code` },
  { id: 'J6', level: 'join', title: 'Everyone who contributes content', concept: 'UNION (set operation)',
    sql: `SELECT s.full_name, 'teaches a course' AS contribution
  FROM students s
 WHERE s.student_id IN (SELECT instructor_id FROM courses)
UNION
SELECT s.full_name, 'uploaded study material'
  FROM students s
  JOIN study_materials m ON m.uploader_id = s.student_id
 ORDER BY full_name` },

  // ------------------------------------------------------------ NESTED / CORRELATED
  { id: 'N1', level: 'nested', title: 'Scores above the average for Milestone 1', concept: 'Scalar subquery',
    sql: `SELECT s.full_name, sb.version_no, sb.points_awarded
  FROM submissions sb
  JOIN students s ON s.student_id = sb.student_id
 WHERE sb.assignment_id = 'a201-er'
   AND sb.points_awarded > (SELECT AVG(points_awarded)
                              FROM submissions
                             WHERE assignment_id = 'a201-er')
 ORDER BY sb.points_awarded DESC` },
  { id: 'N2', level: 'nested', title: 'Students who took a Mathematics course', concept: 'Nested IN (two levels)',
    sql: `SELECT full_name, enrollment_no
  FROM students
 WHERE student_id IN (SELECT student_id
                        FROM course_enrollments
                       WHERE course_id IN (SELECT course_id
                                             FROM courses
                                            WHERE department = 'Mathematics'))` },
  { id: 'N3', level: 'nested', title: 'Students who have never submitted anything', concept: 'Correlated NOT EXISTS',
    sql: `SELECT s.full_name, s.enrollment_no
  FROM students s
 WHERE s.role = 'student'
   AND NOT EXISTS (SELECT 1
                     FROM submissions sb
                    WHERE sb.student_id = s.student_id)` },
  { id: 'N4', level: 'nested', title: 'Submissions that beat their own assignment average', concept: 'Correlated subquery',
    sql: `SELECT a.title, s.full_name, sb.points_awarded
  FROM submissions sb
  JOIN assignments a ON a.assignment_id = sb.assignment_id
  JOIN students s    ON s.student_id = sb.student_id
 WHERE sb.points_awarded > (SELECT AVG(x.points_awarded)
                              FROM submissions x
                             WHERE x.assignment_id = sb.assignment_id)
 ORDER BY a.title, sb.points_awarded DESC` },
  { id: 'N5', level: 'nested', title: 'Latest attempt of every student for every assignment', concept: 'Correlated subquery with MAX',
    sql: `SELECT a.title, s.full_name, sb.version_no, sb.status, sb.points_awarded
  FROM submissions sb
  JOIN assignments a ON a.assignment_id = sb.assignment_id
  JOIN students s    ON s.student_id = sb.student_id
 WHERE sb.version_no = (SELECT MAX(x.version_no)
                          FROM submissions x
                         WHERE x.assignment_id = sb.assignment_id
                           AND x.student_id    = sb.student_id)
 ORDER BY a.title, s.full_name` },
  { id: 'N6', level: 'nested', title: 'Students enrolled in every course taught by Prof. Alan Turing', concept: 'Relational division (double NOT EXISTS)',
    sql: `SELECT s.full_name
  FROM students s
 WHERE s.role = 'student'
   AND NOT EXISTS (SELECT 1
                     FROM courses c
                    WHERE c.instructor_id = '22222222-2222-2222-2222-222222222222'
                      AND NOT EXISTS (SELECT 1
                                        FROM course_enrollments e
                                       WHERE e.course_id  = c.course_id
                                         AND e.student_id = s.student_id))` },
  { id: 'N7', level: 'nested', title: 'Course with the most study time', concept: 'Derived table + >= ALL',
    sql: `SELECT c.course_code, c.title, t.total_minutes
  FROM (SELECT course_id, SUM(duration_minutes) AS total_minutes
          FROM study_sessions
         GROUP BY course_id) t
  JOIN courses c ON c.course_id = t.course_id
 WHERE t.total_minutes >= ALL (SELECT SUM(duration_minutes)
                                 FROM study_sessions
                                GROUP BY course_id)` },

  // ------------------------------------------------------------ ADVANCED
  { id: 'C1', level: 'advanced', title: 'Task hierarchy of a student (tree view)', concept: 'Recursive CTE',
    sql: `WITH RECURSIVE task_tree AS (
    SELECT task_id, title, is_completed, 0 AS depth,
           CAST(LPAD(task_id, 6, '0') AS CHAR(500)) AS path
      FROM study_tasks
     WHERE parent_task_id IS NULL
       AND student_id = '${KRRISH}'
    UNION ALL
    SELECT t.task_id, t.title, t.is_completed, tt.depth + 1,
           CONCAT(tt.path, '/', LPAD(t.task_id, 6, '0'))
      FROM study_tasks t
      JOIN task_tree tt ON t.parent_task_id = tt.task_id
)
SELECT CONCAT(REPEAT('-- ', depth), title) AS task, depth, is_completed
  FROM task_tree
 ORDER BY path` },
  { id: 'C2', level: 'advanced', title: 'Completion percentage of every top-level task', concept: 'Recursive CTE + aggregation',
    sql: `WITH RECURSIVE tree AS (
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
 ORDER BY sub_tasks DESC` },
  { id: 'C3', level: 'advanced', title: 'Course leaderboard with rank and gap from the course average', concept: 'Chained CTEs + window functions (RANK, AVG OVER)',
    sql: `WITH latest AS (
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
 ORDER BY c.course_code, course_rank` },
  { id: 'C4', level: 'advanced', title: 'Study efficiency: marks earned per hour studied', concept: 'Multiple CTEs joined together',
    sql: `WITH hours AS (
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
 ORDER BY score_points_per_hour DESC` },
  { id: 'C5', level: 'advanced', title: 'Running study total and moving focus average', concept: 'Window functions with frames',
    sql: `SELECT s.full_name,
       DATE(ss.started_at)  AS study_day,
       ss.duration_minutes,
       SUM(ss.duration_minutes) OVER (PARTITION BY ss.student_id ORDER BY ss.started_at) AS running_minutes,
       ROUND(AVG(ss.focus_score) OVER (PARTITION BY ss.student_id ORDER BY ss.started_at
                                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)     AS moving_avg_focus
  FROM study_sessions ss
  JOIN students s ON s.student_id = ss.student_id
 ORDER BY s.full_name, ss.started_at` },
  { id: 'A1', level: 'advanced', title: 'Projected grade against target grade', concept: 'Stored functions inside a query',
    sql: `SELECT s.full_name, c.course_code,
       fn_course_score_pct(e.student_id, e.course_id)                   AS score_pct,
       fn_grade_letter(fn_course_score_pct(e.student_id, e.course_id))  AS projected_grade,
       e.target_grade
  FROM course_enrollments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses  c ON c.course_id  = e.course_id
 WHERE e.enrollment_status = 'active'
 ORDER BY c.course_code, score_pct DESC` },
  { id: 'A2', level: 'advanced', title: 'Top three students of each course', concept: 'View built on a view + window function',
    sql: `SELECT course_code, course_rank, student_name, score_pct, study_hours
  FROM v_course_leaderboard
 WHERE course_rank <= 3
 ORDER BY course_code, course_rank` },
  { id: 'A3', level: 'advanced', title: 'Dashboard summary of a student', concept: 'Stored procedure call',
    sql: `CALL sp_student_dashboard('${KRRISH}')` },
  { id: 'A4', level: 'advanced', title: 'Grade change history', concept: 'Rows written by the audit trigger', roles: ['instructor', 'admin'],
    sql: `SELECT g.audit_id, a.title, s.full_name, g.old_points, g.new_points,
       g.old_status, g.new_status, g.changed_by, g.changed_at
  FROM grade_audit_log g
  JOIN assignments a ON a.assignment_id = g.assignment_id
  JOIN students s    ON s.student_id = g.student_id
 ORDER BY g.changed_at DESC
 LIMIT 20` },
];

export const LEVEL_LABELS = {
  simple: 'Simple queries',
  join: 'Join queries',
  nested: 'Nested and correlated queries',
  advanced: 'CTE, window, function, procedure',
};
