from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import User, Role, Patient
from ..schemas import LoginRequest, RegisterRequest, Token, UserOut
from ..auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()


@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")

    user.last_login = datetime.utcnow()
    db.commit()

    # ИСПРАВЛЕНИЕ: str(user.id) вместо user.id, так как JWT требует строку для 'sub'
    token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.name,
            "email": user.email,
        }
    )
    return Token(
        access_token=token,
        user_id=user.id,
        role=user.role.name,
        full_name=user.full_name,
    )


@router.post("/register", response_model=UserOut)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Проверка существования
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    # Получаем роль
    role = db.query(Role).filter(Role.name == req.role).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Роль '{req.role}' не найдена")

    # Создаём пользователя
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        role_id=role.id,
        full_name=req.full_name,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Если пациент — создаём запись в таблице patients
    if role.name == "patient" and req.birth_date:
        patient = Patient(
            user_id=user.id,
            birth_date=req.birth_date,
            gender="male",
        )
        db.add(patient)
        db.commit()

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=role.name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )