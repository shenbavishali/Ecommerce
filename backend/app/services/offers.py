from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, Product, SummerSaleOffer, User


def active_offer_for_product(db: Session, product_id: int) -> SummerSaleOffer | None:
    return db.scalar(
        select(SummerSaleOffer).where(SummerSaleOffer.product_id == product_id, SummerSaleOffer.is_active.is_(True))
    )


def offer_unit_price(product: Product, offer: SummerSaleOffer | None) -> float:
    base_price = float(product.price)
    if offer is None:
        return base_price
    if offer.offer_price is not None:
        return min(base_price, float(offer.offer_price))
    if offer.discount_percent:
        return round(base_price * (1 - (offer.discount_percent / 100)), 2)
    if offer.bundle_price and offer.min_quantity:
        return min(base_price, round(float(offer.bundle_price) / offer.min_quantity, 2))
    return base_price


def purchased_offer_quantity(db: Session, user: User, offer: SummerSaleOffer) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(OrderItem.quantity), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.user_id == user.id,
                Order.status != "cancelled",
                Order.created_at >= offer.created_at,
                OrderItem.product_id == offer.product_id,
            )
        )
        or 0
    )


def remaining_offer_quantity(db: Session, user: User, offer: SummerSaleOffer) -> int:
    return max(0, int(offer.max_quantity_per_user) - purchased_offer_quantity(db, user, offer))


def offer_data(offer: SummerSaleOffer) -> dict:
    product = offer.product
    return {
        "id": offer.id,
        "product_id": offer.product_id,
        "product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "price": float(product.price),
            "mrp": float(product.mrp),
            "image_url": product.image_url,
            "category": product.category,
            "brand": product.brand,
        }
        if product
        else None,
        "offer_price": float(offer.offer_price) if offer.offer_price is not None else None,
        "discount_percent": offer.discount_percent,
        "max_quantity_per_user": offer.max_quantity_per_user,
        "min_quantity": offer.min_quantity,
        "bundle_price": float(offer.bundle_price) if offer.bundle_price is not None else None,
        "rule_description": offer.rule_description,
        "is_active": offer.is_active,
        "created_at": offer.created_at,
        "updated_at": offer.updated_at,
    }
