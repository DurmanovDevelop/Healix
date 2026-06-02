from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import re
import json

from ..database import get_db
from ..models import User, Patient, HealthIndicator, MedicalRecord, IndicatorType
from ..schemas import ChatMessage, ChatResponse
from ..auth import get_current_user
from ..config import get_settings

router = APIRouter()
settings = get_settings()

EXPERT_SYSTEM_PROMPT = """Ты — MedAnalytica Expert Model v1.0, медицинский ИИ-ассистент.

## ПРАВИЛА:
1. Отвечай на русском, кратко, используй Markdown.
2. НЕ ставь диагнозы. При опасных симптомах советуй 112.
3. Всегда ссылайся на показатели из контекста.
4. ML-модели: CardioRiskPredictor, DiabetesScreening, GeneralHealthScore.

## ИЗВЛЕЧЕНИЕ ПОКАЗАТЕЛЕЙ:
Если пользователь сообщает показатели, добавь в конце:
[INDICATORS_UPDATE: {"HR": 80, "SBP": 140}]

Коды: SBP, DBP, HR, GLU, BMI, SPO2, TEMP.

Контекст пациента:
{patient_context}"""


def build_patient_context(user: User, db: Session) -> str:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        return f"ФИО: {user.full_name}"

    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == patient.id)
        .order_by(MedicalRecord.record_date.desc())
        .first()
    )

    from datetime import date
    age = (date.today() - patient.birth_date).days // 365

    ctx = f"ФИО: {user.full_name}\nВозраст: {age} лет\nПол: {patient.gender or 'не указан'}\n"
    if patient.chronic_diseases:
        ctx += f"Хронические заболевания: {patient.chronic_diseases}\n"

    if record and record.indicators:
        ctx += "\nАктуальные показатели:\n"
        for ind in record.indicators[:10]:
            status = "норма" if (
                ind.indicator_type.normal_min and ind.indicator_type.normal_max
                and ind.indicator_type.normal_min <= ind.value <= ind.indicator_type.normal_max
            ) else "отклонение"
            ctx += (
                f"- {ind.indicator_type.name}: {ind.value} {ind.indicator_type.unit} "
                f"(норма {ind.indicator_type.normal_min}-{ind.indicator_type.normal_max}) [{status}]\n"
            )
    return ctx


def extract_indicators(reply: str, db: Session) -> list:
    """Извлекает [INDICATORS_UPDATE: {...}] из ответа и сохраняет в БД"""
    match = re.search(r"\[INDICATORS_UPDATE:\s*(\{[^}]+\})\]", reply)
    if not match:
        return []

    try:
        data = json.loads(match.group(1))
    except Exception:
        return []

    updated = []
    for code, value in data.items():
        ind_type = db.query(IndicatorType).filter(IndicatorType.code == code).first()
        if ind_type:
            updated.append({
                "code": code,
                "name": ind_type.name,
                "unit": ind_type.unit,
                "value": value,
            })
    return updated


async def call_groq(messages: list, api_key: str) -> dict:
    if not api_key:
        raise HTTPException(500, "GROQ_API_KEY не настроен")

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1000,
            },
        )
    if r.status_code != 200:
        raise HTTPException(502, f"Groq error: {r.text[:200]}")
    return r.json()


@router.post("/", response_model=ChatResponse)
async def chat(
    req: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient_context = build_patient_context(current_user, db)
    system_prompt = EXPERT_SYSTEM_PROMPT.replace("{patient_context}", patient_context)

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(req.history[-10:])
    messages.append({"role": "user", "content": req.message})

    data = await call_groq(messages, settings.GROQ_API_KEY)
    reply = data["choices"][0]["message"]["content"]

    # Извлекаем и сохраняем показатели
    extracted = extract_indicators(reply, db)
    clean_reply = re.sub(r"\[INDICATORS_UPDATE:\s*\{[^}]+\}\]", "", reply).strip()

    return ChatResponse(
        reply=clean_reply,
        model="MedAnalytica Expert v1.0",
        indicators_updated=extracted,
        usage=data.get("usage"),
    )