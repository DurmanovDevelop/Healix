from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from ..database import get_db
from ..models import User, Patient, Role, MedicalRecord
from ..schemas import PatientOut, PatientCreate
from ..auth import get_current_user, require_role, get_password_hash

router = APIRouter()


def build_patient_out(patient: Patient) -> PatientOut:
    age = (date.today() - patient.birth_date).days // 365
    last_record = (
        patient.medical_records
        and max(patient.medical_records, key=lambda r: r.record_date)
    )
    diagnosis = last_record.diagnosis if last_record else None
    return PatientOut(
        id=patient.id,
        full_name=patient.user.full_name,
        age=age,
        gender=patient.gender,
        diagnosis=diagnosis,
        risk_level="low",
        last_visit=last_record.record_date if last_record else None,
        health_score=75,
    )


@router.get("/", response_model=List[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "admin")),
):
    patients = db.query(Patient).all()
    return [build_patient_out(p) for p in patients]


@router.get("/me", response_model=PatientOut)
def get_my_patient(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(404, "Профиль пациента не найден")
    return build_patient_out(patient)


@router.post("/", response_model=PatientOut)
def create_patient(
    req: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "admin")),
):
    # Создаём пользователя
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email уже зарегистрирован")

    patient_role = db.query(Role).filter(Role.name == "patient").first()
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        role_id=patient_role.id,
        full_name=req.full_name,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    patient = Patient(
        user_id=user.id,
        birth_date=req.birth_date,
        gender=req.gender,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    if req.diagnosis:
        record = MedicalRecord(
            patient_id=patient.id,
            doctor_id=current_user.doctor.id if current_user.doctor else None,
            diagnosis=req.diagnosis,
        )
        db.add(record)
        db.commit()

    return build_patient_out(patient)


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "admin")),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Пациент не найден")
    db.delete(patient)
    db.commit()
    return {"ok": True}