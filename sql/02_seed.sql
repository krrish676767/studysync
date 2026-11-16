-- ============================================================================
-- StudySync : 02_seed.sql  -  DML: sample data (INSERT)
-- Every demo account has the password:  password123
-- ============================================================================
USE studysync;

SET @pw = '$2b$10$0FecE5R8To5t2tc3XM41VebIXK3qr2DC9cCTpiRgQi54gKjufdRI.';

INSERT INTO students (student_id, email, password_hash, full_name, enrollment_no, current_semester, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@studysync.edu',   @pw, 'System Administrator', 'ADMIN0001',     8, 'admin'),
('22222222-2222-2222-2222-222222222222', 'alan@studysync.edu',    @pw, 'Prof. Alan Turing',    'FAC1936001',    8, 'instructor'),
('66666666-6666-6666-6666-666666666666', 'grace@studysync.edu',   @pw, 'Prof. Grace Hopper',   'FAC1944002',    8, 'instructor'),
('11111111-1111-1111-1111-111111111111', 'krrish@studysync.edu',  @pw, 'Krrish P Raju',        'PES1UG24CS708', 5, 'student'),
('33333333-3333-3333-3333-333333333333', 'rohit@studysync.edu',   @pw, 'Rohit Sharma',         'PES1UG24CS705', 5, 'student'),
('44444444-4444-4444-4444-444444444444', 'ananya@studysync.edu',  @pw, 'Ananya Iyer',          'PES1UG24CS706', 3, 'student'),
('55555555-5555-5555-5555-555555555555', 'dev@studysync.edu',     @pw, 'Dev Patel',            'PES1UG24CS707', 5, 'student'),
('77777777-7777-7777-7777-777777777777', 'meera@studysync.edu',   @pw, 'Meera Nair',           'PES1UG24CS709', 5, 'student'),
('88888888-8888-8888-8888-888888888888', 'arjun@studysync.edu',   @pw, 'Arjun Menon',          'PES1UG24CS710', 3, 'student');

INSERT INTO courses (course_id, instructor_id, course_code, title, department, credits, syllabus_json, max_seats) VALUES
('c101-dbms', '22222222-2222-2222-2222-222222222222', 'CS301', 'Database Management Systems',       'Computer Science & Engineering', 4, '{"modules": ["ER Modelling", "Relational Algebra", "SQL", "Normalization", "Transactions", "NoSQL"]}', 60),
('c102-algo', '22222222-2222-2222-2222-222222222222', 'CS302', 'Design and Analysis of Algorithms', 'Computer Science & Engineering', 4, '{"modules": ["Greedy", "Dynamic Programming", "Graph Algorithms", "NP-Completeness"]}', 60),
('c103-cn',   '66666666-6666-6666-6666-666666666666', 'CS303', 'Computer Networks',                 'Computer Science & Engineering', 4, '{"modules": ["Physical Layer", "TCP/IP", "Routing", "Socket Programming"]}', 60),
('c104-ml',   '66666666-6666-6666-6666-666666666666', 'CS304', 'Machine Learning',                  'Computer Science & Engineering', 4, '{"modules": ["Regression", "Naive Bayes", "SVM", "Neural Networks"]}', 40),
('c105-se',   '66666666-6666-6666-6666-666666666666', 'CS305', 'Software Engineering',              'Computer Science & Engineering', 3, '{"modules": ["SRS", "Design Patterns", "Testing", "Agile"]}', 60),
('c106-la',   '22222222-2222-2222-2222-222222222222', 'MA201', 'Linear Algebra',                    'Mathematics',                    3, '{"modules": ["Vector Spaces", "Eigenvalues", "SVD"]}', 2);

INSERT INTO course_enrollments (course_id, student_id, enrollment_status, target_grade, final_grade, enrolled_at) VALUES
('c101-dbms', '11111111-1111-1111-1111-111111111111', 'active',    'S',  NULL, DATE_SUB(NOW(), INTERVAL 60 DAY)),
('c102-algo', '11111111-1111-1111-1111-111111111111', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 60 DAY)),
('c103-cn',   '11111111-1111-1111-1111-111111111111', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 58 DAY)),
('c106-la',   '11111111-1111-1111-1111-111111111111', 'completed', 'S',  'S',  DATE_SUB(NOW(), INTERVAL 200 DAY)),
('c101-dbms', '33333333-3333-3333-3333-333333333333', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 59 DAY)),
('c102-algo', '33333333-3333-3333-3333-333333333333', 'active',    'B',  NULL, DATE_SUB(NOW(), INTERVAL 59 DAY)),
('c104-ml',   '33333333-3333-3333-3333-333333333333', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 55 DAY)),
('c101-dbms', '44444444-4444-4444-4444-444444444444', 'active',    'B',  NULL, DATE_SUB(NOW(), INTERVAL 57 DAY)),
('c105-se',   '44444444-4444-4444-4444-444444444444', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 57 DAY)),
('c101-dbms', '55555555-5555-5555-5555-555555555555', 'active',    'A',  NULL, DATE_SUB(NOW(), INTERVAL 56 DAY)),
('c103-cn',   '55555555-5555-5555-5555-555555555555', 'active',    'B',  NULL, DATE_SUB(NOW(), INTERVAL 56 DAY)),
('c104-ml',   '55555555-5555-5555-5555-555555555555', 'dropped',   NULL, NULL, DATE_SUB(NOW(), INTERVAL 56 DAY)),
('c101-dbms', '77777777-7777-7777-7777-777777777777', 'active',    'S',  NULL, DATE_SUB(NOW(), INTERVAL 54 DAY)),
('c102-algo', '77777777-7777-7777-7777-777777777777', 'active',    'S',  NULL, DATE_SUB(NOW(), INTERVAL 54 DAY)),
('c105-se',   '77777777-7777-7777-7777-777777777777', 'auditing',  NULL, NULL, DATE_SUB(NOW(), INTERVAL 50 DAY)),
('c106-la',   '77777777-7777-7777-7777-777777777777', 'completed', 'A',  'A',  DATE_SUB(NOW(), INTERVAL 200 DAY));
-- Arjun Menon (8888...) is deliberately not enrolled anywhere: used by the outer-join / NOT EXISTS queries.

INSERT INTO assignments (assignment_id, course_id, title, description, due_date, max_points, weightage_percent, created_by) VALUES
('a201-er',      'c101-dbms', 'Milestone 1: ER Diagram and DDL',      'Submit the ER diagram, relational schema and DDL script.',  DATE_SUB(NOW(), INTERVAL 20 DAY), 100.00, 20.00, '22222222-2222-2222-2222-222222222222'),
('a202-queries', 'c101-dbms', 'Lab 2: Joins and Nested Queries',      'Write join, nested and correlated queries on the lab schema.', DATE_SUB(NOW(), INTERVAL 6 DAY),  50.00, 10.00, '22222222-2222-2222-2222-222222222222'),
('a203-nosql',   'c101-dbms', 'Lab 3: MongoDB CRUD and Aggregation',  'Model a document collection and write an aggregation pipeline.', DATE_ADD(NOW(), INTERVAL 7 DAY),  50.00, 10.00, '22222222-2222-2222-2222-222222222222'),
('a204-dp',      'c102-algo', 'Programming Assignment: Dynamic Programming', 'Implement 0/1 Knapsack and Matrix Chain Multiplication.', DATE_ADD(NOW(), INTERVAL 4 DAY), 100.00, 15.00, '22222222-2222-2222-2222-222222222222'),
('a205-graph',   'c102-algo', 'Problem Set: Shortest Paths',          'Dijkstra, Bellman-Ford and Floyd-Warshall problems.',       DATE_SUB(NOW(), INTERVAL 10 DAY), 40.00, 10.00, '22222222-2222-2222-2222-222222222222'),
('a206-socket',  'c103-cn',   'Lab: TCP Chat with Sockets',           'Build a multi-client TCP chat server.',                     DATE_ADD(NOW(), INTERVAL 12 DAY), 100.00, 20.00, '66666666-6666-6666-6666-666666666666'),
('a207-nb',      'c104-ml',   'Lab 7: Naive Bayes Classifier',        'Train and evaluate a Naive Bayes text classifier.',         DATE_SUB(NOW(), INTERVAL 3 DAY),  100.00, 15.00, '66666666-6666-6666-6666-666666666666'),
('a208-srs',     'c105-se',   'SRS Document',                         'Write an IEEE-830 style SRS for the capstone project.',     DATE_ADD(NOW(), INTERVAL 15 DAY), 100.00, 25.00, '66666666-6666-6666-6666-666666666666');

INSERT INTO submissions (assignment_id, student_id, version_no, file_url, status, points_awarded, feedback, submitted_at) VALUES
('a201-er',      '11111111-1111-1111-1111-111111111111', 1, 'https://files.studysync.edu/krrish/ms1_v1.pdf', 'graded',      82.00, 'Weak entity not identified. Resubmit.',            DATE_SUB(NOW(), INTERVAL 24 DAY)),
('a201-er',      '11111111-1111-1111-1111-111111111111', 2, 'https://files.studysync.edu/krrish/ms1_v2.pdf', 'graded',      96.50, 'Excellent normalization and complete constraints.', DATE_SUB(NOW(), INTERVAL 21 DAY)),
('a201-er',      '33333333-3333-3333-3333-333333333333', 1, 'https://files.studysync.edu/rohit/ms1.pdf',     'graded',      88.00, 'Good ER model; index the composite keys.',          DATE_SUB(NOW(), INTERVAL 22 DAY)),
('a201-er',      '44444444-4444-4444-4444-444444444444', 1, 'https://files.studysync.edu/ananya/ms1.pdf',    'graded',      74.00, 'Cardinalities missing on two relationships.',       DATE_SUB(NOW(), INTERVAL 21 DAY)),
('a201-er',      '55555555-5555-5555-5555-555555555555', 1, 'https://files.studysync.edu/dev/ms1.pdf',       'late',        65.00, 'Late by two days.',                                 DATE_SUB(NOW(), INTERVAL 18 DAY)),
('a201-er',      '77777777-7777-7777-7777-777777777777', 1, 'https://files.studysync.edu/meera/ms1.pdf',     'graded',      99.00, 'Outstanding work.',                                 DATE_SUB(NOW(), INTERVAL 23 DAY)),
('a202-queries', '11111111-1111-1111-1111-111111111111', 1, 'https://files.studysync.edu/krrish/lab2.sql',   'graded',      46.00, 'All queries correct.',                              DATE_SUB(NOW(), INTERVAL 7 DAY)),
('a202-queries', '33333333-3333-3333-3333-333333333333', 1, 'https://files.studysync.edu/rohit/lab2.sql',    'graded',      39.50, 'Correlated query returns duplicates.',              DATE_SUB(NOW(), INTERVAL 7 DAY)),
('a202-queries', '77777777-7777-7777-7777-777777777777', 1, 'https://files.studysync.edu/meera/lab2.sql',    'graded',      48.00, 'Very clean SQL.',                                   DATE_SUB(NOW(), INTERVAL 8 DAY)),
('a202-queries', '44444444-4444-4444-4444-444444444444', 1, 'https://files.studysync.edu/ananya/lab2.sql',   'submitted',   NULL,  NULL,                                                DATE_SUB(NOW(), INTERVAL 6 DAY)),
('a205-graph',   '11111111-1111-1111-1111-111111111111', 1, 'https://files.studysync.edu/krrish/ps_sp.pdf',  'graded',      31.00, 'Bellman-Ford negative cycle check missing.',        DATE_SUB(NOW(), INTERVAL 11 DAY)),
('a205-graph',   '33333333-3333-3333-3333-333333333333', 1, 'https://files.studysync.edu/rohit/ps_sp.pdf',   'graded',      36.00, 'Good.',                                             DATE_SUB(NOW(), INTERVAL 12 DAY)),
('a205-graph',   '77777777-7777-7777-7777-777777777777', 1, 'https://files.studysync.edu/meera/ps_sp.pdf',   'graded',      40.00, 'Perfect score.',                                    DATE_SUB(NOW(), INTERVAL 12 DAY)),
('a207-nb',      '33333333-3333-3333-3333-333333333333', 1, 'https://files.studysync.edu/rohit/lab7.ipynb',  'submitted',   NULL,  NULL,                                                DATE_SUB(NOW(), INTERVAL 4 DAY)),
('a204-dp',      '77777777-7777-7777-7777-777777777777', 1, 'https://files.studysync.edu/meera/dp.zip',      'submitted',   NULL,  NULL,                                                DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes, focus_score, notes, started_at, ended_at) VALUES
('11111111-1111-1111-1111-111111111111', 'c101-dbms', 'deep_work', 120, 5, 'Designed the ER diagram and verified FK cascades',  DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 25 DAY), INTERVAL 120 MINUTE)),
('11111111-1111-1111-1111-111111111111', 'c101-dbms', 'pomodoro',   50, 4, 'Practised correlated subqueries',                   DATE_SUB(NOW(), INTERVAL 8 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 8 DAY),  INTERVAL 50 MINUTE)),
('11111111-1111-1111-1111-111111111111', 'c101-dbms', 'revision',   75, 4, 'Normalization: 3NF and BCNF problems',              DATE_SUB(NOW(), INTERVAL 2 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY),  INTERVAL 75 MINUTE)),
('11111111-1111-1111-1111-111111111111', 'c102-algo', 'deep_work',  90, 5, 'Bellman-Ford and Floyd-Warshall implementations',   DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 12 DAY), INTERVAL 90 MINUTE)),
('11111111-1111-1111-1111-111111111111', 'c102-algo', 'pomodoro',   25, 3, 'Knapsack recurrence',                               DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY),  INTERVAL 25 MINUTE)),
('11111111-1111-1111-1111-111111111111', 'c103-cn',   'exam_prep',  60, 3, 'Subnetting practice',                               DATE_SUB(NOW(), INTERVAL 5 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY),  INTERVAL 60 MINUTE)),
('33333333-3333-3333-3333-333333333333', 'c101-dbms', 'pomodoro',   50, 3, 'Join practice',                                     DATE_SUB(NOW(), INTERVAL 9 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 9 DAY),  INTERVAL 50 MINUTE)),
('33333333-3333-3333-3333-333333333333', 'c104-ml',   'deep_work', 150, 4, 'Naive Bayes lab notebook',                          DATE_SUB(NOW(), INTERVAL 4 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 DAY),  INTERVAL 150 MINUTE)),
('33333333-3333-3333-3333-333333333333', 'c102-algo', 'revision',   45, 4, 'Graph algorithms revision',                         DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 13 DAY), INTERVAL 45 MINUTE)),
('44444444-4444-4444-4444-444444444444', 'c101-dbms', 'revision',   40, 2, 'Re-read ER modelling slides',                       DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 22 DAY), INTERVAL 40 MINUTE)),
('44444444-4444-4444-4444-444444444444', 'c105-se',   'pomodoro',   50, 4, 'Drafted SRS introduction',                          DATE_SUB(NOW(), INTERVAL 3 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY),  INTERVAL 50 MINUTE)),
('55555555-5555-5555-5555-555555555555', 'c101-dbms', 'pomodoro',   25, 2, 'Started the milestone late',                        DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 19 DAY), INTERVAL 25 MINUTE)),
('55555555-5555-5555-5555-555555555555', 'c103-cn',   'deep_work', 100, 4, 'Socket programming lab',                            DATE_SUB(NOW(), INTERVAL 2 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY),  INTERVAL 100 MINUTE)),
('77777777-7777-7777-7777-777777777777', 'c101-dbms', 'deep_work', 180, 5, 'Full schema, triggers and procedures',              DATE_SUB(NOW(), INTERVAL 24 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 24 DAY), INTERVAL 180 MINUTE)),
('77777777-7777-7777-7777-777777777777', 'c101-dbms', 'revision',   60, 5, 'Transactions and isolation levels',                 DATE_SUB(NOW(), INTERVAL 3 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY),  INTERVAL 60 MINUTE)),
('77777777-7777-7777-7777-777777777777', 'c102-algo', 'deep_work', 140, 5, 'DP assignment',                                     DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY),  INTERVAL 140 MINUTE));

INSERT INTO study_materials (material_id, course_id, uploader_id, title, material_type, file_url, plain_text) VALUES
('m301-ra',     'c101-dbms', '22222222-2222-2222-2222-222222222222', 'Unit 1: Relational Algebra and Calculus', 'lecture_notes', 'https://files.studysync.edu/materials/dbms_u1.pdf',   'Select, project, join, division and tuple relational calculus.'),
('m302-index',  'c101-dbms', '22222222-2222-2222-2222-222222222222', 'Indexing and B+ Trees',                   'slides',        'https://files.studysync.edu/materials/indexing.pdf',  'B+ tree node structure, fan-out, leaf chaining and range queries.'),
('m303-norm',   'c101-dbms', '77777777-7777-7777-7777-777777777777', 'Normalization Cheat Sheet',               'summary',       'https://files.studysync.edu/materials/norm.pdf',      'Functional dependencies, 1NF, 2NF, 3NF, BCNF with examples.'),
('m304-dp',     'c102-algo', '11111111-1111-1111-1111-111111111111', 'Dynamic Programming Patterns',            'flashcards',    'https://files.studysync.edu/materials/dp_cards.json', 'Overlapping subproblems, optimal substructure, memoization and tabulation.'),
('m305-tcp',    'c103-cn',   '66666666-6666-6666-6666-666666666666', 'TCP Congestion Control',                  'slides',        'https://files.studysync.edu/materials/tcp_cc.pdf',    'Slow start, congestion avoidance, fast retransmit and fast recovery.'),
('m306-bayes',  'c104-ml',   '66666666-6666-6666-6666-666666666666', 'Naive Bayes Notes',                       'lecture_notes', 'https://files.studysync.edu/materials/nb.pdf',        'Bayes theorem, conditional independence and Laplace smoothing.');

-- Hierarchical tasks: task -> sub-task -> sub-sub-task (used by the recursive CTE)
INSERT INTO study_tasks (task_id, student_id, course_id, assignment_id, parent_task_id, title, priority, due_date, is_completed, completed_at) VALUES
(1,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', NULL,          NULL, 'Finish the DBMS mini project',          'urgent', DATE_ADD(CURDATE(), INTERVAL 5 DAY), FALSE, NULL),
(2,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', 'a201-er',     1,    'Database design',                       'high',   DATE_SUB(CURDATE(), INTERVAL 20 DAY), TRUE,  DATE_SUB(NOW(), INTERVAL 21 DAY)),
(3,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', 'a201-er',     2,    'Draw the Chen ER diagram',              'high',   DATE_SUB(CURDATE(), INTERVAL 22 DAY), TRUE,  DATE_SUB(NOW(), INTERVAL 23 DAY)),
(4,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', 'a201-er',     2,    'Write DDL with constraints',            'high',   DATE_SUB(CURDATE(), INTERVAL 21 DAY), TRUE,  DATE_SUB(NOW(), INTERVAL 21 DAY)),
(5,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', NULL,          1,    'Build the application',                 'high',   DATE_ADD(CURDATE(), INTERVAL 3 DAY),  FALSE, NULL),
(6,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', NULL,          5,    'Next.js pages and API routes',          'medium', DATE_ADD(CURDATE(), INTERVAL 2 DAY),  FALSE, NULL),
(7,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', 'a203-nosql',  5,    'MongoDB notes module',                  'medium', DATE_ADD(CURDATE(), INTERVAL 2 DAY),  FALSE, NULL),
(8,  '11111111-1111-1111-1111-111111111111', 'c101-dbms', NULL,          6,    'Login page with role-based access',     'medium', DATE_ADD(CURDATE(), INTERVAL 1 DAY),  TRUE,  NOW()),
(9,  '11111111-1111-1111-1111-111111111111', 'c102-algo', 'a204-dp',     NULL, 'Dynamic programming assignment',        'high',   DATE_ADD(CURDATE(), INTERVAL 4 DAY),  FALSE, NULL),
(10, '11111111-1111-1111-1111-111111111111', 'c102-algo', 'a204-dp',     9,    'Knapsack: code and test corner cases',  'medium', DATE_ADD(CURDATE(), INTERVAL 3 DAY),  FALSE, NULL),
(11, '33333333-3333-3333-3333-333333333333', 'c104-ml',   'a207-nb',     NULL, 'Finish the Naive Bayes lab report',     'high',   DATE_ADD(CURDATE(), INTERVAL 1 DAY),  FALSE, NULL),
(12, '77777777-7777-7777-7777-777777777777', 'c101-dbms', NULL,          NULL, 'Revise transactions before the ISA',    'low',    DATE_ADD(CURDATE(), INTERVAL 9 DAY),  FALSE, NULL);
