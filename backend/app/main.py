from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import auth, users, patients, indicators, ml_models, analyses, chat

settings = get_settings()

# Создаём таблицы если их нет (для разработки)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedAnalytica API",
    description="API информационной системы анализа медицинских показателей",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["Indicators"])
app.include_router(ml_models.router, prefix="/api/ml-models", tags=["ML Models"])
app.include_router(analyses.router, prefix="/api/analyses", tags=["ML Analyses"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
def root():
    return {
        "name": "MedAnalytica API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}