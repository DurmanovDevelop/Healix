from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Numeric,
    Date, DateTime, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    avatar_url = Column(Text)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    patient = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    birth_date = Column(Date, nullable=False)
    gender = Column(String(20))
    blood_type = Column(String(10))
    rh_factor = Column(String(5))
    height_cm = Column(Numeric(5, 2))
    weight_kg = Column(Numeric(5, 2))
    address = Column(Text)
    emergency_contact = Column(String(255))
    chronic_diseases = Column(Text)
    allergies = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    ml_analyses = relationship("MLAnalysis", back_populates="patient", cascade="all, delete-orphan")


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    license_number = Column(String(50), unique=True)
    experience_years = Column(Integer, default=0)
    bio = Column(Text)
    rating = Column(Numeric(3, 2), default=0)
    consultation_fee = Column(Numeric(10, 2))
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="doctor")


class IndicatorType(Base):
    __tablename__ = "indicator_types"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    unit = Column(String(30), nullable=False)
    normal_min = Column(Numeric(10, 3))
    normal_max = Column(Numeric(10, 3))
    category = Column(String(50), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)


class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"))
    record_date = Column(DateTime, default=datetime.utcnow)
    diagnosis = Column(Text)
    complaints = Column(Text)
    notes = Column(Text)
    icd10_code = Column(String(10))

    patient = relationship("Patient", back_populates="medical_records")
    indicators = relationship("HealthIndicator", back_populates="record", cascade="all, delete-orphan")


class HealthIndicator(Base):
    __tablename__ = "health_indicators"
    __table_args__ = (UniqueConstraint("record_id", "indicator_type_id"),)

    id = Column(Integer, primary_key=True)
    record_id = Column(Integer, ForeignKey("medical_records.id", ondelete="CASCADE"), nullable=False)
    indicator_type_id = Column(Integer, ForeignKey("indicator_types.id"), nullable=False)
    value = Column(Numeric(12, 3), nullable=False)
    measured_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("MedicalRecord", back_populates="indicators")
    indicator_type = relationship("IndicatorType")


class MLModel(Base):
    __tablename__ = "ml_models"
    __table_args__ = (UniqueConstraint("name", "version"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    version = Column(String(20), nullable=False)
    algorithm = Column(String(100))
    framework = Column(String(50))
    model_path = Column(Text)
    description = Column(Text)
    accuracy = Column(Numeric(5, 4))
    f1_score = Column(Numeric(5, 4))
    precision_s = Column(Numeric(5, 4))
    recall = Column(Numeric(5, 4))
    trained_at = Column(DateTime)
    is_active = Column(Boolean, default=True)


class MLAnalysis(Base):
    __tablename__ = "ml_analyses"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(Integer, ForeignKey("ml_models.id"), nullable=False)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Numeric(5, 4), nullable=False)
    risk_level = Column(String(20))
    raw_prediction = Column(JSON)
    input_features = Column(JSON)
    confidence = Column(Numeric(5, 4))

    patient = relationship("Patient", back_populates="ml_analyses")
    model = relationship("MLModel")
    recommendations = relationship("Recommendation", back_populates="analysis", cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey("ml_analyses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Integer, default=1)
    category = Column(String(50))
    is_applied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("MLAnalysis", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    entity = Column(String(100))
    entity_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)