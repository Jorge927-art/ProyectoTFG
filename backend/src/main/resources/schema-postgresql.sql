ALTER TABLE IF EXISTS course_grades
    ALTER COLUMN score TYPE numeric(10,2)
    USING trim(score::text)::numeric(10,2);

ALTER TABLE IF EXISTS course_grades
    ADD COLUMN IF NOT EXISTS feedback TEXT;