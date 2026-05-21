import argparse
from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.db.init_db import create_mysql_schema
from app.models import User, UserRole


def create_admin(email: str, full_name: str, password: str) -> None:
    create_mysql_schema()
    db = SessionLocal()
    try:
        existing_user = db.scalar(select(User).where(User.email == email.lower()))
        if existing_user:
            existing_user.full_name = full_name
            existing_user.hashed_password = hash_password(password)
            existing_user.role = UserRole.admin.value
            existing_user.is_active = True
            existing_user.is_verified = True
        else:
            db.add(
                User(
                    email=email.lower(),
                    full_name=full_name,
                    hashed_password=hash_password(password),
                    role=UserRole.admin.value,
                    is_active=True,
                    is_verified=True,
                )
            )
        db.commit()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin user in MySQL.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass("Admin password: ")

    create_admin(args.email, args.name, password)
    print(f"Admin user ready: {args.email.lower()}")


if __name__ == "__main__":
    main()
