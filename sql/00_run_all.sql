-- ============================================================================
-- StudySync : 00_run_all.sql  -  builds the whole SQL side in one go.
-- From the project folder run:
--     mysql -u root -p
--     mysql> SOURCE sql/00_run_all.sql
-- (SOURCE only works inside the interactive mysql client. From the shell use:
--     cat sql/01_schema.sql sql/02_seed.sql sql/03_advanced.sql sql/04_roles.sql | mysql -u root -p )
-- ============================================================================
SOURCE sql/01_schema.sql;
SOURCE sql/02_seed.sql;
SOURCE sql/03_advanced.sql;
SOURCE sql/04_roles.sql;
SELECT 'StudySync database is ready' AS status;
