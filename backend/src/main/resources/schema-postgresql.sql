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
-- Seguridad de autenticación: contador de intentos fallidos de login por usuario
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Referencia de curso para notificaciones de recomendaciones idempotentes
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS user_system_notifications
    ADD COLUMN IF NOT EXISTS related_course_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_notification_recommendation_course
    ON user_system_notifications (receiver_user_id, type, related_course_id)
    WHERE type = 'COURSE_RECOMMENDATION' AND related_course_id IS NOT NULL;

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
-- Histórico anual de estadísticas del panel de cursos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_course_stats_history (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    snapshot_year INTEGER NOT NULL,
    active_students_in_course INTEGER NOT NULL,
    course_average_progress_percentage INTEGER NOT NULL,
    approval_index_percentage INTEGER NOT NULL,
    average_course_rating DOUBLE PRECISION,
    average_instructor_rating DOUBLE PRECISION,
    average_grade DOUBLE PRECISION,
    average_work_grade DOUBLE PRECISION,
    average_final_exam_grade DOUBLE PRECISION,
    real_data BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_admin_course_stats_history_course_year UNIQUE (course_id, snapshot_year)
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

-- -----------------------------------------------------------------------------
-- Borrado lógico de bandejas de documentos (sin hard delete)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS document_metadata
    ADD COLUMN IF NOT EXISTS hidden_for_sender BOOLEAN;

ALTER TABLE IF EXISTS document_metadata
    ADD COLUMN IF NOT EXISTS hidden_for_receiver BOOLEAN;

UPDATE document_metadata
SET hidden_for_sender = false
WHERE hidden_for_sender IS NULL;

UPDATE document_metadata
SET hidden_for_receiver = false
WHERE hidden_for_receiver IS NULL;

ALTER TABLE IF EXISTS document_metadata
    ALTER COLUMN hidden_for_sender SET DEFAULT false;

ALTER TABLE IF EXISTS document_metadata
    ALTER COLUMN hidden_for_receiver SET DEFAULT false;

ALTER TABLE IF EXISTS document_metadata
    ALTER COLUMN hidden_for_sender SET NOT NULL;

ALTER TABLE IF EXISTS document_metadata
    ALTER COLUMN hidden_for_receiver SET NOT NULL;

ALTER TABLE IF EXISTS courses
    ALTER COLUMN ever_used SET DEFAULT false;

ALTER TABLE IF EXISTS courses
    ALTER COLUMN ever_used SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_title_key
    ON courses (title_key);

-- -----------------------------------------------------------------------------
-- Configuración de reparto de material por curso (docencia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_material_dispatch_config (
    config_id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL UNIQUE,
    dispatch_parts INTEGER NOT NULL,
    exam_threshold NUMERIC(5,2) NOT NULL DEFAULT 90.00,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dispatch_config_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_dispatch_config_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- Avisos docentes por alumno y checkpoints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professor_course_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    professor_user_id BIGINT NOT NULL,
    student_user_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    enrollment_id BIGINT NOT NULL,
    alert_type VARCHAR(32) NOT NULL,
    checkpoint_index INTEGER NOT NULL,
    checkpoint_percent NUMERIC(5,2) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    bell_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    title VARCHAR(180) NOT NULL,
    message VARCHAR(600) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_prof_alert_professor
        FOREIGN KEY (professor_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_prof_alert_student
        FOREIGN KEY (student_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_prof_alert_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_prof_alert_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollment(enrollmentid)
        ON DELETE CASCADE,
    CONSTRAINT uk_prof_alert_enrollment_type_checkpoint
        UNIQUE (enrollment_id, alert_type, checkpoint_index)
);

CREATE INDEX IF NOT EXISTS idx_prof_alert_professor_created
    ON professor_course_alerts (professor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prof_alert_professor_bell
    ON professor_course_alerts (professor_user_id, bell_dismissed, created_at ASC);