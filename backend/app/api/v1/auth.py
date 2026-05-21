from datetime import timedelta
from random import randint

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.responses import api_response
from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import EmailOTP, User, UserRole, utc_now
from app.schemas import Token, UserCreate, VerifyOTPRequest
from app.core.config import get_settings
from app.services.email import send_otp_email

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    settings = get_settings()
    otp = f"{randint(100000, 999999)}"
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.customer.value,
        is_verified=False,
    )
    db.add(user)

    try:
        db.flush()
        db.add(
            EmailOTP(
                user_id=user.id,
                code=otp,
                expires_at=utc_now() + timedelta(minutes=settings.otp_expire_minutes),
            )
        )
        email_sent = send_otp_email(user.email, otp)
        allow_dev_otp = settings.environment == "development" and not settings.smtp_host
        if not email_sent and not allow_dev_otp:
            raise RuntimeError("SMTP email service is not configured")
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc
    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email OTP service is not configured. Add SMTP settings in backend/.env.",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not send verification email") from exc

    db.refresh(user)
    response_data = {"email": user.email}
    message = "Registration successful. Check your email for the OTP."
    if allow_dev_otp:
        response_data["otp"] = otp
        message = "Registration successful. SMTP is disabled, so the development OTP is returned in this response."

    return api_response(response_data, message)


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form_data.username.lower()))
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verify your email OTP before login")

    user.last_login = utc_now()
    db.commit()
    token = create_access_token(str(user.id), {"role": user.role})
    return api_response(Token(access_token=token), "Login successful")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return api_response(current_user)


@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    otp = db.scalar(
        select(EmailOTP)
        .where(
            EmailOTP.user_id == user.id,
            EmailOTP.code == payload.otp,
            EmailOTP.consumed_at.is_(None),
            EmailOTP.expires_at > utc_now(),
        )
        .order_by(EmailOTP.created_at.desc())
    )
    if otp is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    otp.consumed_at = utc_now()
    user.is_verified = True
    db.commit()
    return api_response({"email": user.email}, "Email verified successfully")
