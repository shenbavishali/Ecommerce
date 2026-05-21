from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.responses import api_response
from app.core.database import get_db
from app.models import DeliverySlot, Product
from app.schemas import DeliveryEstimateRequest
from app.services.delivery import delivery_estimate_data, matching_delivery_hub

router = APIRouter()


@router.get("/slots")
def list_delivery_slots(db: Session = Depends(get_db)):
    statement = (
        select(DeliverySlot)
        .where(DeliverySlot.is_active.is_(True), DeliverySlot.capacity > 0)
        .order_by(DeliverySlot.day_label, DeliverySlot.start_time)
    )
    return api_response(list(db.scalars(statement).all()))


@router.get("")
def list_delivery_slots_alias(db: Session = Depends(get_db)):
    return list_delivery_slots(db)


@router.post("/estimate")
def estimate_delivery(payload: DeliveryEstimateRequest, db: Session = Depends(get_db)):
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    hub = matching_delivery_hub(db, payload.pincode)
    return api_response(delivery_estimate_data(db, product, hub, payload.pincode))
