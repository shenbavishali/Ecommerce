from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.responses import api_response
from app.core.database import get_db
from app.models import CartItem, User
from app.schemas import CartItemCreate, CartItemUpdate, CartRead
from app.services.cart import get_cart_items, get_or_404_product, serialize_cart
from app.services.offers import active_offer_for_product, remaining_offer_quantity
from app.services.product_options import validated_selected_option

router = APIRouter()


@router.get("")
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return api_response(serialize_cart(get_cart_items(db, current_user), db, current_user))


@router.post("/items", status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_or_404_product(db, payload.product_id)
    selected_option, selected_price = validated_selected_option(
        product,
        payload.selected_option,
        payload.selected_price,
    )
    if payload.quantity > product.inventory:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested quantity exceeds inventory")

    item = db.scalar(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == payload.product_id)
    )
    offer = active_offer_for_product(db, payload.product_id)
    if offer is not None:
        current_quantity = item.quantity if item else 0
        remaining = remaining_offer_quantity(db, current_user, offer)
        if current_quantity + payload.quantity > remaining:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Summer Sale limit reached. You can buy only {offer.max_quantity_per_user} unit(s) under this offer.",
            )
    if item:
        item.quantity = min(item.quantity + payload.quantity, product.inventory)
        item.selected_option = selected_option
        item.selected_price = selected_price
    else:
        db.add(
            CartItem(
                user_id=current_user.id,
                product_id=payload.product_id,
                quantity=payload.quantity,
                selected_option=selected_option,
                selected_price=selected_price,
            )
        )

    db.commit()
    return api_response(serialize_cart(get_cart_items(db, current_user), db, current_user), "Cart updated")


@router.patch("/items/{product_id}")
def update_cart_item(
    product_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_or_404_product(db, product_id)
    if payload.quantity > product.inventory:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested quantity exceeds inventory")

    item = db.scalar(select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == product_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    offer = active_offer_for_product(db, product_id)
    if offer is not None and payload.quantity > remaining_offer_quantity(db, current_user, offer):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Summer Sale limit reached. You can buy only {offer.max_quantity_per_user} unit(s) under this offer.",
        )

    item.quantity = payload.quantity
    db.commit()
    return api_response(serialize_cart(get_cart_items(db, current_user), db, current_user), "Cart updated")


@router.delete("/items/{product_id}")
def remove_cart_item(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == product_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return api_response(serialize_cart(get_cart_items(db, current_user), db, current_user), "Cart updated")
