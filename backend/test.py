# test_db.py
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Загружаем переменные из .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

print(f"🔗 Пытаемся подключиться к: {DATABASE_URL}\n")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Проверяем роли
        roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
        print("✅ Роли в базе данных:")
        for r in roles:
            print(f"   - ID: {r[0]}, Name: '{r[1]}'")
        
        # Проверяем пользователей
        users = conn.execute(text("SELECT id, email, role_id FROM users")).fetchall()
        print("\n✅ Пользователи в базе данных:")
        for u in users:
            print(f"   - Email: '{u[1]}', Role_ID: {u[2]}")
            
        if not roles:
            print("\n❌ ВНИМАНИЕ: Таблица roles ПУСТАЯ! Скрипт 02_seed.sql не сработал.")
        if not users:
            print("\n❌ ВНИМАНИЕ: Таблица users ПУСТАЯ!")
            
except Exception as e:
    print(f"\n❌ ОШИБКА ПОДКЛЮЧЕНИЯ: {e}")
    print("Проверьте файл backend/.env (особенно пароль 1342 и имя БД)")