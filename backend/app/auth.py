from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
        
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    print(f"🔍 [AUTH] Получен токен: {token[:30]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print(f"🔑 [AUTH] Пытаюсь расшифровать с SECRET_KEY: {settings.SECRET_KEY[:15]}...")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        print(f"✅ [AUTH] Токен успешно расшифрован! user_id = {user_id}")
        
        if user_id is None:
            print("❌ [AUTH] Ошибка: поле 'sub' (user_id) отсутствует в токене")
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ [AUTH] КРИТИЧЕСКАЯ ОШИБКА РАСШИФРОВКИ JWT: {e}")
        raise credentials_exception

    # Ищем пользователя в базе
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        print(f"❌ [AUTH] Ошибка БД: Пользователь с id={user_id} НЕ НАЙДЕН в таблице users!")
        raise credentials_exception
        
    if not user.is_active:
        print(f"❌ [AUTH] Ошибка статуса: Пользователь с id={user_id} НЕАКТИВЕН (is_active=False)!")
        raise credentials_exception

    print(f"🎉 [AUTH] УСПЕХ! Пользователь '{user.full_name}' успешно авторизован.")
    return user

def require_role(*roles: str):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role.name not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Required role: {', '.join(roles)}",
            )
        return current_user
    return checker