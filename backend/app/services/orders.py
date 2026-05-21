from datetime import datetime, timezone
from random import randint

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CartItem, DeliveryBoy, DeliverySlot, Order, OrderItem, OrderStatus, User
from app.services.cart import delivery_fee_for
from app.services.offers import active_offer_for_product, offer_unit_price, remaining_offer_quantity

TAX_RATE = 0.05
COD_CHARGE = 40.0

CATEGORY_ALIASES = {
    "grocery": {"grocery", "groceries", "fruit", "fruits", "vegetable", "vegetables", "dairy", "home care"},
    "fashion": {"fashion", "dress", "dresses", "clothing", "apparel", "footwear"},
    "electronics": {
        "electronics",
        "tv",
        "television",
        "ac",
        "air conditioner",
        "laptop",
        "appliances",
        "mobiles",
        "mobile",
        "audio",
        "refrigerator",
        "washing machine",
    },
}


def make_order_number() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"AJ-{timestamp}-{randint(100, 999)}"


def normalize_delivery_category(category: str | None) -> str:
    value = str(category or "").strip().lower()
    for canonical, aliases in CATEGORY_ALIASES.items():
        if value in aliases or any(alias in value for alias in aliases):
            return canonical
    return "general"


def delivery_boy_matches(delivery_boy: DeliveryBoy, category: str) -> bool:
    scope = str(delivery_boy.category_scope or "").lower()
    if category == "general":
        return "general" in scope or "other" in scope
    return category in scope or any(alias in scope for alias in CATEGORY_ALIASES.get(category, set()))


def assign_delivery_boy_by_category(db: Session, order: Order, category_scores: dict[str, float]) -> None:
    if not category_scores:
        return

    dominant_category = max(category_scores.items(), key=lambda item: item[1])[0]
    active_delivery_boys = list(
        db.scalars(select(DeliveryBoy).where(DeliveryBoy.is_active.is_(True)).order_by(DeliveryBoy.id)).all()
    )
    matched_delivery_boy = next(
        (delivery_boy for delivery_boy in active_delivery_boys if delivery_boy_matches(delivery_boy, dominant_category)),
        None,
    )
    fallback_delivery_boy = next(
        (delivery_boy for delivery_boy in active_delivery_boys if delivery_boy_matches(delivery_boy, "general")),
        None,
    )

    order.delivery_boy_id = (matched_delivery_boy or fallback_delivery_boy).id if (matched_delivery_boy or fallback_delivery_boy) else None


def create_order_from_cart(
    db: Session,
    user: User,
    cart_items: list[CartItem],
    address: str,
    payment_method: str,
    delivery_slot_id: int | None = None,
    discount_amount: float = 0.0,
    coupon_code: str | None = None,
) -> Order:
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")
    if delivery_slot_id is not None:
        slot = db.get(DeliverySlot, delivery_slot_id)
        if slot is None or not slot.is_active or slot.capacity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delivery slot is unavailable")

    subtotal = 0.0
    category_scores: dict[str, float] = {}
    order = Order(
        order_number=make_order_number(),
        user_id=user.id,
        status=OrderStatus.placed.value,
        subtotal=0,
        delivery_fee=0,
        total=0,
        shipping_address=address,
        payment_method=payment_method,
        coupon_code=coupon_code.upper() if coupon_code else None,
        delivery_slot_id=delivery_slot_id,
    )

    db.add(order)
    db.flush()

    for cart_item in cart_items:
        product = cart_item.product
        offer = active_offer_for_product(db, product.id)
        if offer is not None and cart_item.quantity > remaining_offer_quantity(db, user, offer):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Summer Sale limit reached for {product.name}.",
            )
        if product.inventory < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only {product.inventory} units available for {product.name}",
            )

        unit_price = float(cart_item.selected_price) if cart_item.selected_price is not None else offer_unit_price(product, offer)
        line_total = unit_price * cart_item.quantity
        subtotal += line_total
        delivery_category = normalize_delivery_category(product.category)
        category_scores[delivery_category] = category_scores.get(delivery_category, 0) + line_total
        product.inventory -= cart_item.quantity
        product_name = f"{product.name} - {cart_item.selected_option}" if cart_item.selected_option else product.name
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product_name,
                unit_price=unit_price,
                quantity=cart_item.quantity,
                line_total=line_total,
            )
        )

    delivery_fee = delivery_fee_for(subtotal)
    tax = subtotal * TAX_RATE
    cod_charge = COD_CHARGE if payment_method == "cod" else 0.0
    order_discount = min(float(discount_amount or 0), subtotal + delivery_fee + tax + cod_charge)
    order.subtotal = subtotal
    order.delivery_fee = delivery_fee
    order.total = subtotal + delivery_fee + tax + cod_charge - order_discount
    if delivery_slot_id is not None:
        slot.capacity -= 1

    assign_delivery_boy_by_category(db, order, category_scores)

    for cart_item in cart_items:
        db.delete(cart_item)

    db.commit()
    db.refresh(order)
    return order
