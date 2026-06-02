# reset_pwd.py
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Генерируем свежий хеш для пароля "password123"
fresh_hash = pwd_context.hash("password123")
print(f"Сгенерирован новый хеш: {fresh_hash[:20]}...\n")

try:
    with engine.connect() as conn:
        # Обновляем пароль для пациента
        conn.execute(text("""
            UPDATE users 
            SET password_hash = :hash 
            WHERE email = 'patient@med.ru'
        """), {"hash": fresh_hash})
        conn.commit()
        print("✅ УСПЕХ! Пароль для patient@med.ru успешно сброшен на 'password123'")
except Exception as e:
    print(f"❌ Ошибка: {e}")