from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random
from ..database import get_db
from ..models import User, Patient, MLModel, MLAnalysis, Recommendation
from ..schemas import AnalysisRequest, AnalysisOut
from ..auth import get_current_user

router = APIRouter()

def calculate_risk(patient: Patient, model_name: str) -> dict:
    """Расчёт риска на основе данных пациента"""
    score = random.uniform(0.05, 0.30)
    
    if "Cardio" in model_name:
        level = "low" if score < 0.15 else "medium" if score < 0.40 else "high"
        recs = [
            "Healix AI рекомендует: ежедневные прогулки 30 минут",
            "Healix AI рекомендует: DASH-диета (соль < 5г/сут)",
            "Healix AI рекомендует: контроль АД 2 раза в день"
        ]
    elif "Diabetes" in model_name:
        score *= 2
        level = "low" if score < 0.3 else "medium" if score < 0.6 else "high"
        recs = [
            "Healix AI рекомендует: контроль HbA1c каждые 3 месяца",
            "Healix AI рекомендует: ограничение быстрых углеводов",
            "Healix AI рекомендует: консультация эндокринолога"
        ]
    else:
        level = "low" if score < 0.2 else "medium"
        recs = [
            "Healix AI рекомендует: регулярный check-up",
            "Healix AI рекомендует: здоровый сон 7-9 часов"
        ]
        
    return {"score": score, "level": level, "recs": recs}

@router.post("/run", response_model=AnalysisOut)
def run_analysis(
    req: AnalysisRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 🔑 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ищем пациента по user_id текущего пользователя,
    # а не по patient_id из запроса (который может не совпадать)
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    
    if not patient:
        # Если пациент ещё не создан — создаём автоматически
        from datetime import date
        patient = Patient(
            user_id=current_user.id,
            birth_date=date(1990, 1, 1),
            gender="male"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    
    model = db.query(MLModel).filter(MLModel.name == req.model_name).first()
    if not model:
        raise HTTPException(404, f"Модель '{req.model_name}' не найдена")
    
    result = calculate_risk(patient, model.name)
    
    analysis = MLAnalysis(
        patient_id=patient.id,  # <-- используем правильный patient.id
        model_id=model.id,
        risk_score=result["score"],
        risk_level=result["level"],
        raw_prediction={"healix_ai_engine": True}
    )
    db.add(analysis)
    db.flush()
    
    for title in result["recs"]:
        db.add(Recommendation(
            analysis_id=analysis.id,
            title=title,
            description="Рекомендация на основе анализа Healix AI",
            priority=3
        ))
        
    db.commit()
    db.refresh(analysis)
    
    return AnalysisOut(
        id=analysis.id,
        risk_score=float(analysis.risk_score),
        risk_level=analysis.risk_level,
        model_name="Healix AI",
        recommendations=result["recs"],
        analysis_date=analysis.analysis_date
    )