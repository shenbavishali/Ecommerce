from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.models import CartItem, Product, User
from app.schemas import CartItemRead, CartRead
from app.services.offers import active_offer_for_product, offer_data, offer_unit_price, remaining_offer_quantity


def delivery_fee_for(subtotal: float) -> float:
    return 0 if subtotal == 0 or subtotal > 1000 else 79


def get_cart_items(db: Session, user: User) -> list[CartItem]:
    statement = (
        select(CartItem)
        .join(CartItem.product)
        .where(CartItem.user_id == user.id)
        .options(contains_eager(CartItem.product))
        .order_by(CartItem.created_at.desc())
    )
    return list(db.scalars(statement).all())


def serialize_cart(items: list[CartItem], db: Session | None = None, user: User | None = None) -> CartRead:
    response_items = []
    subtotal = 0.0

    for item in items:
        offer = active_offer_for_product(db, item.product_id) if db is not None else None
        unit_price = float(item.selected_price) if item.selected_price is not None else offer_unit_price(item.product, offer)
        line_total = unit_price * item.quantity
        subtotal += line_total
        response_items.append(
            CartItemRead.model_validate(item).model_copy(
                update={
                    "line_total": line_total,
                    "unit_price": unit_price,
                    "selected_price": float(item.selected_price) if item.selected_price is not None else None,
                    "offer": {
                        **offer_data(offer),
                        "remaining_quantity": remaining_offer_quantity(db, user, offer) if db is not None and user is not None else None,
                    }
                    if offer and item.selected_price is None
                    else None,
                }
            )
        )

    delivery_fee = delivery_fee_for(subtotal)
    return CartRead(items=response_items, subtotal=subtotal, delivery_fee=delivery_fee, total=subtotal + delivery_fee)


def get_or_404_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.inventory <= 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product is out of stock")
    return product
