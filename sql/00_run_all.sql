-- ============================================================================
-- StudySync : 00_run_all.sql  -  builds the whole SQL side in one go.
-- From the project folder run:
--     mysql -u root -p < sql/00_run_all.sql
-- ============================================================================
SOURCE sql/01_schema.sql;
SOURCE sql/02_seed.sql;
SOURCE sql/03_advanced.sql;
SOURCE sql/04_roles.sql;
SELECT 'StudySync database is ready' AS status;
