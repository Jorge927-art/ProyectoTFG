ALTER TABLE IF EXISTS course_grades
    ALTER COLUMN score TYPE numeric(10,2)
    USING trim(score::text)::numeric(10,2);

ALTER TABLE IF EXISTS course_grades
    ADD COLUMN IF NOT EXISTS feedback TEXT;

-- -----------------------------------------------------------------------------
-- Migración de columnas de ACK para alertas de progreso en enrollment
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS enrollment
    ADD COLUMN IF NOT EXISTS progress_alert_student_ack boolean;

ALTER TABLE IF EXISTS enrollment
    ADD COLUMN IF NOT EXISTS progress_alert_professor_ack boolean;

UPDATE enrollment
SET progress_alert_student_ack = false
WHERE progress_alert_student_ack IS NULL;

UPDATE enrollment
SET progress_alert_professor_ack = false
WHERE progress_alert_professor_ack IS NULL;

ALTER TABLE IF EXISTS enrollment
    ALTER COLUMN progress_alert_student_ack SET DEFAULT false;

ALTER TABLE IF EXISTS enrollment
    ALTER COLUMN progress_alert_professor_ack SET DEFAULT false;

ALTER TABLE IF EXISTS enrollment
    ALTER COLUMN progress_alert_student_ack SET NOT NULL;

ALTER TABLE IF EXISTS enrollment
    ALTER COLUMN progress_alert_professor_ack SET NOT NULL;