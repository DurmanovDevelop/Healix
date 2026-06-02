from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from ..database import get_db
from ..models import (
    User, Patient, MedicalRecord, HealthIndicator,
    IndicatorType
)
from ..schemas import IndicatorTypeOut, HealthIndicatorOut, IndicatorCreate
from ..auth import get_current_user

router = APIRouter()


@router.get("/types", response_model=List[IndicatorTypeOut])
def get_indicator_types(db: Session = Depends(get_db)):
    return db.query(IndicatorType).filter(IndicatorType.is_active == True).all()


@router.get("/patient/latest", response_model=List[HealthIndicatorOut])
def get_latest_indicators(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(404, "Пациент не найден")

    # Берём последнюю запись
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient.id)
        .order_by(MedicalRecord.record_date.desc())
        .first()
    )
    if not record:
        # Создаём пустую запись
        record = MedicalRecord(patient_id=patient.id, record_date=datetime.utcnow())
        db.add(record)
        db.commit()
        db.refresh(record)

    return record.indicators


@router.post("/update", response_model=List[HealthIndicatorOut])
def update_indicators(
    updates: List[IndicatorCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(404, "Пациент не найден")

    # Получаем/создаём актуальную запись
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient.id)
        .order_by(MedicalRecord.record_date.desc())
        .first()
    )
    if not record or record.record_date.date() < date.today():
        record = MedicalRecord(patient_id=patient.id, record_date=datetime.utcnow())
        db.add(record)
        db.commit()
        db.refresh(record)

    # Обновляем показатели
    for u in updates:
        ind_type = db.query(IndicatorType).filter(IndicatorType.code == u.code).first()
        if not ind_type:
            continue

        existing = (
            db.query(HealthIndicator)
            .filter(
                HealthIndicator.record_id == record.id,
                HealthIndicator.indicator_type_id == ind_type.id,
            )
            .first()
        )
        if existing:
            existing.value = u.value
            existing.measured_at = datetime.utcnow()
        else:
            db.add(HealthIndicator(
                record_id=record.id,
                indicator_type_id=ind_type.id,
                value=u.value,
            ))

    db.commit()
    db.refresh(record)
    return record.indicators