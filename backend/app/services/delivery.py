from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DeliveryHub, Product, ProductHubStock


def matching_delivery_hub(db: Session, pincode: str) -> DeliveryHub | None:
    hubs = db.scalars(select(DeliveryHub).where(DeliveryHub.is_active.is_(True))).all()
    for hub in hubs:
        prefixes = [prefix.strip() for prefix in str(hub.pincode_prefixes or "").split(",") if prefix.strip()]
        if any(pincode.startswith(prefix) for prefix in prefixes):
            return hub
    return None


def hub_stock(db: Session, product_id: int, hub_id: int) -> int:
    stock = db.scalar(
        select(ProductHubStock.quantity).where(ProductHubStock.product_id == product_id, ProductHubStock.hub_id == hub_id)
    )
    return int(stock or 0)


def fallback_stock_hub(db: Session, product_id: int, serving_hub_id: int | None) -> DeliveryHub | None:
    statement = (
        select(DeliveryHub)
        .join(ProductHubStock, ProductHubStock.hub_id == DeliveryHub.id)
        .where(DeliveryHub.is_active.is_(True), ProductHubStock.product_id == product_id, ProductHubStock.quantity > 0)
        .order_by(DeliveryHub.base_delivery_days)
    )
    if serving_hub_id is not None:
        statement = statement.where(DeliveryHub.id != serving_hub_id)
    return db.scalar(statement.limit(1))


def category_delivery_adjustment(product: Product) -> int:
    category = str(product.category or "").lower()
    if any(value in category for value in ["grocery", "fruit", "vegetable", "dairy", "bakery"]):
        return -1
    if any(value in category for value in ["electronics", "furniture", "appliance"]):
        return 1
    return 0


def delivery_estimate_data(db: Session, product: Product, hub: DeliveryHub | None, pincode: str) -> dict:
    total_hub_stock = db.scalar(
        select(func.coalesce(func.sum(ProductHubStock.quantity), 0))
        .join(DeliveryHub, DeliveryHub.id == ProductHubStock.hub_id)
        .where(ProductHubStock.product_id == product.id, DeliveryHub.is_active.is_(True))
    )
    if product.inventory <= 0 and not total_hub_stock:
        return {
            "available": False,
            "pincode": pincode,
            "message": "Currently unavailable for delivery",
            "hub": None,
        }

    if hub is None:
        return {
            "available": False,
            "pincode": pincode,
            "message": "Delivery is not available for this pincode yet",
            "hub": None,
        }

    fallback_used = False
    serving_hub = hub
    if hub is not None and hub_stock(db, product.id, hub.id) <= 0:
        serving_hub = fallback_stock_hub(db, product.id, hub.id)
        fallback_used = serving_hub is not None

    if serving_hub is None:
        serving_hub = fallback_stock_hub(db, product.id, None)
        fallback_used = serving_hub is not None

    if serving_hub is None:
        return {
            "available": False,
            "pincode": pincode,
            "message": "This product is out of stock across all hubs",
            "hub": None,
        }

    delivery_days = max(1, min(14, serving_hub.base_delivery_days + category_delivery_adjustment(product)))
    if fallback_used and hub is not None:
        delivery_days += serving_hub.fallback_extra_days
    delivery_date = datetime.now().date() + timedelta(days=delivery_days)
    message = "Delivery by tomorrow" if delivery_days == 1 else f"Delivery in {delivery_days} days"
    if fallback_used and hub is not None:
        message = f"Nearest hub is out of stock. Shipping from {serving_hub.name}; delivery extended to {delivery_days} days"
    return {
        "available": True,
        "pincode": pincode,
        "delivery_days": delivery_days,
        "delivery_date": delivery_date.isoformat(),
        "message": message,
        "fallback_used": fallback_used,
        "nearest_hub": {
            "id": hub.id,
            "name": hub.name,
            "region": hub.region,
        }
        if hub
        else None,
        "hub": {
            "id": serving_hub.id,
            "name": serving_hub.name,
            "city": serving_hub.city,
            "state": serving_hub.state,
            "region": serving_hub.region,
            "base_delivery_days": serving_hub.base_delivery_days,
            "express_available": serving_hub.express_available,
            "stock": hub_stock(db, product.id, serving_hub.id),
        },
    }
