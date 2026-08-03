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

-- -----------------------------------------------------------------------------
-- Histórico anual del panel estadístico global de administración
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_global_stats_history (
    id BIGSERIAL PRIMARY KEY,
    snapshot_year INTEGER NOT NULL UNIQUE,
    total_students INTEGER NOT NULL,
    total_professors INTEGER NOT NULL,
    top_course_enrollment INTEGER NOT NULL,
    real_data BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_global_top_course_history (
    id BIGSERIAL PRIMARY KEY,
    history_id BIGINT NOT NULL,
    rank_position INTEGER NOT NULL,
    course_id BIGINT,
    course_title VARCHAR(255) NOT NULL,
    enrolled_students INTEGER NOT NULL,
    CONSTRAINT fk_admin_global_top_course_history_history
        FOREIGN KEY (history_id)
        REFERENCES admin_global_stats_history(id)
        ON DELETE CASCADE
);