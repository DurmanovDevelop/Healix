# add_demo_users.py - Создание демо-пользователей doctor и admin
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Хеш для пароля "password123"
hash_pwd = pwd_context.hash("password123")

users = [
    ("doctor@med.ru", "doctor", "Петрова Анна Сергеевна", "+79992222222"),
    ("admin@med.ru", "admin", "Иванов Иван Иванович", "+79991111111"),
]

with engine.connect() as conn:
    for email, role, name, phone in users:
        # Удаляем если есть
        conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
        
        # Создаем пользователя
        result = conn.execute(text("""
            INSERT INTO users (email, password_hash, role_id, full_name, phone, is_active)
            VALUES (:email, :hash, (SELECT id FROM roles WHERE name = :role), :name, :phone, true)
            RETURNING id
        """), {"email": email, "hash": hash_pwd, "role": role, "name": name, "phone": phone})
        user_id = result.scalar()
        print(f"✅ Создан пользователь: {email} (ID: {user_id}, роль: {role})")
        
        # Если это доктор - создаем запись в doctors
        if role == "doctor":
            conn.execute(text("""
                INSERT INTO doctors (user_id, specialization, license_number, experience_years, bio, rating)
                VALUES (:uid, 'Кардиолог', 'MED-2015-0042', 11, 'Кардиолог высшей категории', 4.87)
                ON CONFLICT (user_id) DO NOTHING
            """), {"uid": user_id})
            print(f"   📋 Создана запись в doctors")
    
    conn.commit()
    print("\n🎉 Все демо-пользователи созданы!")
    print("   patient@med.ru / password123")
    print("   doctor@med.ru  / password123")
    print("   admin@med.ru   / password123")