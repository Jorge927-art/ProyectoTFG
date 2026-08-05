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

-- -----------------------------------------------------------------------------
-- Persistencia de refresh tokens JWT con rotación y revocación
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    jti VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_token_id BIGINT,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auth_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id
    ON auth_refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at
    ON auth_refresh_tokens (expires_at);

-- -----------------------------------------------------------------------------
-- Gestión administrativa de cursos (normalización de título + uso histórico)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS courses
    ADD COLUMN IF NOT EXISTS title_key VARCHAR(512);

ALTER TABLE IF EXISTS courses
    ADD COLUMN IF NOT EXISTS ever_used BOOLEAN;

UPDATE courses
SET title_key = LOWER(REGEXP_REPLACE(COALESCE(title, ''), '\\s+', '', 'g'))
WHERE title_key IS NULL;

UPDATE courses
SET ever_used = false
WHERE ever_used IS NULL;

UPDATE courses c
SET ever_used = true
WHERE c.assigned_user_id IS NOT NULL
   OR EXISTS (
        SELECT 1
        FROM enrollment e
        WHERE e.course_id = c.course_id
   );

ALTER TABLE IF EXISTS courses
    ALTER COLUMN ever_used SET DEFAULT false;

ALTER TABLE IF EXISTS courses
    ALTER COLUMN ever_used SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_title_key
    ON courses (title_key);