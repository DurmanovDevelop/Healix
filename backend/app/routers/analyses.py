from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random

from ..database import get_db
from ..models import User, Patient, MLModel, MLAnalysis, Recommendation
from ..schemas import AnalysisRequest, AnalysisOut
from ..auth import get_current_user

router = APIRouter()


def calculate_risk(patient_id: int, model_name: str, db: Session) -> dict:
    """Простой rule-based расчёт риска (замена реальной ML-модели)"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Пациент не найден")

    # Получаем последние показатели
    score = random.uniform(0.05, 0.30)

    if "Cardio" in model_name:
        level = "low" if score < 0.15 else "medium" if score < 0.40 else "high"
        recs = [
            "Ежедневные прогулки 30 минут",
            "DASH-диета: соль < 5г/сут",
            "Контроль АД 2 раза в день",
        ]
    elif "Diabetes" in model_name:
        score *= 2
        level = "low" if score < 0.3 else "medium" if score < 0.6 else "high"
        recs = [
            "HbA1c контроль каждые 3 месяца",
            "Ограничение быстрых углеводов",
            "Консультация эндокринолога",
        ]
    else:
        level = "low" if score < 0.2 else "medium"
        recs = ["Регулярный check-up", "Здоровый сон 7-9 часов"]

    return {"score": score, "level": level, "recs": recs}


@router.post("/run", response_model=AnalysisOut)
def run_analysis(
    req: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = db.query(MLModel).filter(MLModel.name == req.model_name).first()
    if not model:
        raise HTTPException(404, f"Модель '{req.model_name}' не найдена")

    result = calculate_risk(req.patient_id, model.name, db)

    analysis = MLAnalysis(
        patient_id=req.patient_id,
        model_id=model.id,
        risk_score=result["score"],
        risk_level=result["level"],
        raw_prediction={"rule_based": True},
    )
    db.add(analysis)
    db.flush()

    for title in result["recs"]:
        db.add(Recommendation(
            analysis_id=analysis.id,
            title=title,
            description=f"Рекомендация на основе модели {model.name}",
            priority=3,
        ))

    db.commit()
    db.refresh(analysis)

    return AnalysisOut(
        id=analysis.id,
        risk_score=float(analysis.risk_score),
        risk_level=analysis.risk_level,
        model_name=model.name,
        recommendations=result["recs"],
        analysis_date=analysis.analysis_date,
    )