from app import app, db

with app.app_context():
    # 데이터베이스 생성
    db.create_all()
    print("Database initialized successfully!")
