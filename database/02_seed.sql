-- ============================================================
-- Начальные данные
-- ============================================================

-- Роли
INSERT INTO roles (name, description, permissions) VALUES
    ('admin',   'Администратор системы', '{"all": true}'),
    ('doctor',  'Врач-специалист',       '{"read": ["*"], "write": ["patients","records","prescriptions","consultations","analyses"]}'),
    ('patient', 'Пациент',               '{"read": ["own"], "write": ["own"]}');

-- Демо-пользователи (пароль: password123, bcrypt hash)
INSERT INTO users (email, password_hash, role_id, full_name, phone) VALUES
    ('admin@med.ru',   '$2b$12$LJ3m4ys3Lg2V7bXlGPuKwOBD4vD.QxU5VjQ.YkXc.RtCOQ2r6M0e6', 1, 'Иванов Иван Иванович',   '+79991111111'),
    ('doctor@med.ru',  '$2b$12$LJ3m4ys3Lg2V7bXlGPuKwOBD4vD.QxU5VjQ.YkXc.RtCOQ2r6M0e6', 2, 'Петрова Анна Сергеевна', '+79992222222'),
    ('patient@med.ru', '$2b$12$LJ3m4ys3Lg2V7bXlGPuKwOBD4vD.QxU5VjQ.YkXc.RtCOQ2r6M0e6', 3, 'Сидоров Пётр Алексеевич','+79993333333');

-- Врач
INSERT INTO doctors (user_id, specialization, license_number, experience_years, bio, rating) VALUES
    (2, 'Кардиолог', 'MED-2015-0042', 11, 'Кардиолог высшей категории, к.м.н.', 4.87);

-- Пациент
INSERT INTO patients (user_id, birth_date, gender, blood_type, rh_factor, height_cm, weight_kg, address, chronic_diseases) VALUES
    (3, '1992-05-15', 'male', 'II', '+', 178, 82, 'г. Москва, ул. Ленина 10', 'Преддиабет, Гипертония 1 ст.');

-- Типы показателей
INSERT INTO indicator_types (code, name, unit, normal_min, normal_max, category, description) VALUES
    ('SBP',   'Систолическое давление',    'мм рт.ст.', 90,   140,  'cardio',      'Верхнее артериальное давление'),
    ('DBP',   'Диастолическое давление',   'мм рт.ст.', 60,   90,   'cardio',      'Нижнее артериальное давление'),
    ('HR',    'Пульс',                      'уд/мин',    60,   100,  'cardio',      'Частота сердечных сокращений'),
    ('GLU',   'Глюкоза крови натощак',     'ммоль/л',   3.9,  6.1,  'metabolic',   'Уровень глюкозы в плазме'),
    ('HBA1C', 'Гликированный гемоглобин',  '%',         4.0,  6.0,  'metabolic',   'Средний сахар за 3 месяца'),
    ('CHOL',  'Холестерин общий',          'ммоль/л',   3.0,  5.2,  'metabolic',   'Общий холестерин крови'),
    ('LDL',   'ЛПНП',                       'ммоль/л',   1.5,  3.4,  'metabolic',   'Липопротеиды низкой плотности'),
    ('HDL',   'ЛПВП',                       'ммоль/л',   1.0,  99,   'metabolic',   'Липопротеиды высокой плотности'),
    ('BMI',   'Индекс массы тела',         'кг/м²',     18.5, 24.9, 'general',     'Соотношение веса и роста'),
    ('TEMP',  'Температура тела',          '°C',        36.1, 37.2, 'general',     'Температура тела'),
    ('SPO2',  'Сатурация кислорода',       '%',         95,   100,  'respiratory', 'Насыщение крови кислородом'),
    ('CREA',  'Креатинин',                 'мкмоль/л',  62,   115,  'renal',       'Маркер функции почек');

-- ML-модели
INSERT INTO ml_models (name, version, algorithm, framework, description, accuracy, f1_score, trained_at, is_active) VALUES
    ('CardioRiskPredictor', '1.0.0', 'XGBoost',       'sklearn',  '10-летний прогноз ССЗ-рисков', 0.9124, 0.8910, NOW(), TRUE),
    ('DiabetesScreening',   '1.2.1', 'RandomForest',  'sklearn',  'Скрининг диабета 2 типа',       0.8876, 0.8730, NOW(), TRUE),
    ('GeneralHealthScore',  '2.0.0', 'NeuralNet',     'pytorch',  'Общая оценка здоровья',         0.8540, 0.8410, NOW(), TRUE);

-- Медицинские записи
INSERT INTO medical_records (patient_id, doctor_id, record_date, diagnosis, complaints, icd10_code) VALUES
    (1, 1, NOW() - INTERVAL '7 days',  'Преддиабет, АГ 1 ст.',       'Усталость, головные боли', 'R73.0'),
    (1, 1, NOW() - INTERVAL '3 days',  'Контрольный осмотр',         'Без жалоб',                'Z00.0');

-- Показатели (для последней записи)
INSERT INTO health_indicators (record_id, indicator_type_id, value) VALUES
    (2, (SELECT id FROM indicator_types WHERE code='SBP'), 126),
    (2, (SELECT id FROM indicator_types WHERE code='DBP'), 81),
    (2, (SELECT id FROM indicator_types WHERE code='HR'),  71),
    (2, (SELECT id FROM indicator_types WHERE code='GLU'), 5.8),
    (2, (SELECT id FROM indicator_types WHERE code='BMI'), 24.2),
    (2, (SELECT id FROM indicator_types WHERE code='SPO2'), 97);

-- Лекарства
INSERT INTO medicines (name, active_substance, dosage_form, is_prescription) VALUES
    ('Метформин 500мг', 'Метформин', 'Таблетки', TRUE),
    ('Лизиноприл 10мг', 'Лизиноприл', 'Таблетки', TRUE),
    ('Аспирин Кардио',  'Ацетилсалициловая кислота', 'Таблетки', FALSE);