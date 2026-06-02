from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List


# ============ AUTH ============
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: str  # Было: EmailStr
    password: str
    full_name: str
    role: str = "patient"
    birth_date: str | None = None  # Было: Optional[date]
    phone: str | None = None


# ============ USER ============
class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============ INDICATOR ============
class IndicatorTypeOut(BaseModel):
    id: int
    code: str
    name: str
    unit: str
    normal_min: Optional[float]
    normal_max: Optional[float]
    category: str

    class Config:
        from_attributes = True


class HealthIndicatorOut(BaseModel):
    id: int
    indicator_type: IndicatorTypeOut
    value: float
    measured_at: datetime

    class Config:
        from_attributes = True


class IndicatorCreate(BaseModel):
    code: str
    value: float


# ============ PATIENT ============
class PatientOut(BaseModel):
    id: int
    full_name: str
    age: int
    gender: Optional[str]
    diagnosis: Optional[str]
    risk_level: Optional[str] = "low"
    last_visit: Optional[datetime]
    health_score: int = 75

    class Config:
        from_attributes = True


class PatientCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = "patient123"
    birth_date: date
    gender: str = "male"
    diagnosis: Optional[str] = None
    phone: Optional[str] = None


# ============ ML ============
class MLModelOut(BaseModel):
    id: int
    name: str
    version: str
    algorithm: Optional[str]
    accuracy: Optional[float]
    is_active: bool

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    model_name: str
    patient_id: int


class AnalysisOut(BaseModel):
    id: int
    risk_score: float
    risk_level: str
    model_name: str
    recommendations: List[str] = []
    analysis_date: datetime

    class Config:
        from_attributes = True


# ============ CHAT ============
class ChatMessage(BaseModel):
    message: str
    history: List[dict] = []


class ChatResponse(BaseModel):
    reply: str
    model: str
    indicators_updated: List[dict] = []
    usage: Optional[dict] = None