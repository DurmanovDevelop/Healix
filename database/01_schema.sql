-- ============================================================
-- MedAnalytica: Схема БД (1NF, 2NF, 3NF)
-- 15 таблиц для дипломного проекта
-- ============================================================

-- Удалить если существует (для перезапуска)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS ml_analyses CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS health_indicators CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS ml_models CASCADE;
DROP TABLE IF EXISTS indicator_types CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- 1. roles — Роли пользователей (RBAC)
-- 1NF: атомарные значения
-- 2NF: нет частичных зависимостей (один PK)
-- 3NF: нет транзитивных зависимостей
-- ============================================================
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. users — Пользователи системы
-- ============================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    avatar_url    TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- ============================================================
-- 3. patients — Пациенты (расширение users)
-- ============================================================
CREATE TABLE patients (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    birth_date        DATE NOT NULL,
    gender            VARCHAR(20) CHECK (gender IN ('male','female','other')),
    blood_type        VARCHAR(10),
    rh_factor         VARCHAR(5) CHECK (rh_factor IN ('+','-')),
    height_cm         NUMERIC(5,2),
    weight_kg         NUMERIC(5,2),
    address           TEXT,
    emergency_contact VARCHAR(255),
    chronic_diseases  TEXT,
    allergies         TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_user ON patients(user_id);
CREATE INDEX idx_patients_birth ON patients(birth_date);

-- ============================================================
-- 4. doctors — Врачи (расширение users)
-- ============================================================
CREATE TABLE doctors (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization   VARCHAR(100) NOT NULL,
    license_number   VARCHAR(50) UNIQUE,
    experience_years INTEGER DEFAULT 0,
    bio              TEXT,
    rating           NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    consultation_fee NUMERIC(10,2),
    is_available     BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_user ON doctors(user_id);
CREATE INDEX idx_doctors_spec ON doctors(specialization);

-- ============================================================
-- 5. indicator_types — Справочник типов медицинских показателей
-- ============================================================
CREATE TABLE indicator_types (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(50) UNIQUE NOT NULL,
    name         VARCHAR(150) NOT NULL,
    unit         VARCHAR(30) NOT NULL,
    normal_min   NUMERIC(10,3),
    normal_max   NUMERIC(10,3),
    category     VARCHAR(50) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_indicator_types_code ON indicator_types(code);
CREATE INDEX idx_indicator_types_cat ON indicator_types(category);

-- ============================================================
-- 6. medical_records — Медицинские записи (приёмы)
-- ============================================================
CREATE TABLE medical_records (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis   TEXT,
    complaints  TEXT,
    notes       TEXT,
    icd10_code  VARCHAR(10)
);

CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_records_date ON medical_records(record_date);

-- ============================================================
-- 7. health_indicators — Значения показателей
-- ============================================================
CREATE TABLE health_indicators (
    id                SERIAL PRIMARY KEY,
    record_id         INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    indicator_type_id INTEGER NOT NULL REFERENCES indicator_types(id),
    value             NUMERIC(12,3) NOT NULL,
    measured_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(record_id, indicator_type_id)
);

CREATE INDEX idx_indicators_record ON health_indicators(record_id);
CREATE INDEX idx_indicators_type ON health_indicators(indicator_type_id);
CREATE INDEX idx_indicators_measured ON health_indicators(measured_at);

-- ============================================================
-- 8. ml_models — ML-модели системы
-- ============================================================
CREATE TABLE ml_models (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    version      VARCHAR(20) NOT NULL,
    algorithm    VARCHAR(100),
    framework    VARCHAR(50),
    model_path   TEXT,
    description  TEXT,
    accuracy     NUMERIC(5,4),
    f1_score     NUMERIC(5,4),
    precision_s  NUMERIC(5,4),
    recall       NUMERIC(5,4),
    trained_at   TIMESTAMP,
    is_active    BOOLEAN DEFAULT TRUE,
    UNIQUE(name, version)
);

CREATE INDEX idx_ml_models_name ON ml_models(name);

-- ============================================================
-- 9. ml_analyses — Результаты ML-анализа
-- ============================================================
CREATE TABLE ml_analyses (
    id            SERIAL PRIMARY KEY,
    patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    model_id      INTEGER NOT NULL REFERENCES ml_models(id),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_score    NUMERIC(5,4) NOT NULL,
    risk_level    VARCHAR(20) CHECK (risk_level IN ('low','medium','high','critical')),
    raw_prediction JSONB,
    input_features JSONB,
    confidence    NUMERIC(5,4)
);

CREATE INDEX idx_analyses_patient ON ml_analyses(patient_id);
CREATE INDEX idx_analyses_model ON ml_analyses(model_id);
CREATE INDEX idx_analyses_date ON ml_analyses(analysis_date);
CREATE INDEX idx_analyses_level ON ml_analyses(risk_level);

-- ============================================================
-- 10. recommendations — Рекомендации на основе анализа
-- ============================================================
CREATE TABLE recommendations (
    id          SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES ml_analyses(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority    INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    category    VARCHAR(50),
    is_applied  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recs_analysis ON recommendations(analysis_id);

-- ============================================================
-- 11. consultations — Консультации
-- ============================================================
CREATE TABLE consultations (
    id           SERIAL PRIMARY KEY,
    patient_id   INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id    INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP NOT NULL,
    status       VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    notes        TEXT,
    duration_min INTEGER DEFAULT 30
);

CREATE INDEX idx_consults_patient ON consultations(patient_id);
CREATE INDEX idx_consults_doctor ON consultations(doctor_id);
CREATE INDEX idx_consults_date ON consultations(scheduled_at);
CREATE INDEX idx_consults_status ON consultations(status);

-- ============================================================
-- 12. messages — Сообщения чата
-- ============================================================
CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read         BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_consult ON messages(consultation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================
-- 13. medicines — Справочник лекарств
-- ============================================================
CREATE TABLE medicines (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    active_substance   VARCHAR(255),
    dosage_form        VARCHAR(50),
    contraindications  TEXT,
    side_effects       TEXT,
    description        TEXT,
    is_prescription    BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_medicines_name ON medicines(name);

-- ============================================================
-- 14. prescriptions — Назначения лекарств
-- ============================================================
CREATE TABLE prescriptions (
    id          SERIAL PRIMARY KEY,
    record_id   INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id),
    dosage      VARCHAR(100) NOT NULL,
    frequency   VARCHAR(100),
    duration_days INTEGER,
    prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prescriptions_record ON prescriptions(record_id);

-- ============================================================
-- 15. audit_logs — Журнал аудита
-- ============================================================
CREATE TABLE audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100),
    entity_id  INTEGER,
    old_value  JSONB,
    new_value  JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(timestamp);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);