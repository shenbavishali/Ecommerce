from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.api.responses import api_response
from app.core.database import get_db
from app.models import Coupon, Order, User, utc_now
from app.schemas import CouponCreate, CouponUpdate

router = APIRouter()


def coupon_data(coupon: Coupon, used_count: int = 0) -> dict:
    return {
        "id": coupon.code,
        "db_id": coupon.id,
        "code": coupon.code,
        "title": coupon.title,
        "description": coupon.description,
        "discount": float(coupon.discount),
        "minOrder": float(coupon.min_order),
        "min_order": float(coupon.min_order),
        "expires_at": coupon.expires_at,
        "is_active": coupon.is_active,
        "is_used": used_count > 0,
        "used_count": used_count,
        "created_at": coupon.created_at,
        "updated_at": coupon.updated_at,
    }


def coupon_used_count(db: Session, coupon: Coupon) -> int:
    return db.scalar(select(func.count(Order.id)).where(Order.coupon_code == coupon.code)) or 0


def active_coupon_query():
    now = utc_now()
    if now.tzinfo is not None:
        now = now.astimezone(timezone.utc).replace(tzinfo=None)
    return (
        select(Coupon)
        .where(Coupon.is_active.is_(True), Coupon.expires_at >= now)
        .order_by(Coupon.expires_at, desc(Coupon.updated_at))
    )


@router.get("")
def list_active_coupons(db: Session = Depends(get_db)):
    coupons = db.scalars(active_coupon_query()).all()
    return api_response([coupon_data(coupon) for coupon in coupons])


@router.get("/admin")
def admin_list_coupons(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    coupons = db.scalars(select(Coupon).order_by(desc(Coupon.updated_at))).all()
    used_counts = dict(
        db.execute(
            select(Order.coupon_code, func.count(Order.id))
            .where(Order.coupon_code.is_not(None))
            .group_by(Order.coupon_code)
        ).all()
    )
    return api_response([coupon_data(coupon, int(used_counts.get(coupon.code, 0))) for coupon in coupons])


@router.post("/admin", status_code=status.HTTP_201_CREATED)
def admin_create_coupon(
    payload: CouponCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["code"] = data["code"].upper()
    coupon = Coupon(**data)
    db.add(coupon)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Coupon code already exists") from exc
    db.refresh(coupon)
    return api_response(coupon_data(coupon), "Coupon created")


@router.patch("/admin/{coupon_id}")
def admin_update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"]:
        updates["code"] = updates["code"].upper()
    for key, value in updates.items():
        setattr(coupon, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Coupon code already exists") from exc
    db.refresh(coupon)
    return api_response(coupon_data(coupon), "Coupon updated")


@router.delete("/admin/{coupon_id}")
def admin_delete_coupon(
    coupon_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    coupon = db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    coupon.is_active = False
    db.commit()
    db.refresh(coupon)
    return api_response(coupon_data(coupon, coupon_used_count(db, coupon)), "Coupon disabled")
