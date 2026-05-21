from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.api.responses import api_response
from app.core.database import get_db
from app.models import Order, OrderItem, Product, ReturnRequest, User
from app.schemas import OrderCancelRequest, OrderCreate, ReturnRequestCreate
from app.services.cart import get_cart_items
from app.services.orders import create_order_from_cart
from app.services.tracking import order_item_data, tracking_data
from app.services.warranty import replacement_eligibility

router = APIRouter()


def customer_return_data(request: ReturnRequest):
    return {
        "id": request.id,
        "order_id": request.order_id,
        "order_item_id": request.order_item_id,
        "product_name": request.product_name,
        "reason": request.reason,
        "description": request.description,
        "refund_amount": request.refund_amount,
        "refund_days": request.refund_days,
        "status": request.status,
        "admin_message": None if request.status in {"refund_completed", "amount_received"} else request.admin_message,
        "pickup_delivery_boy": {
            "id": request.pickup_delivery_boy.id,
            "name": request.pickup_delivery_boy.name,
            "phone": request.pickup_delivery_boy.phone,
            "area": request.pickup_delivery_boy.area,
        }
        if request.pickup_delivery_boy
        else None,
    }


def customer_order_data(order: Order, returns_by_order: dict[int, list[ReturnRequest]], db: Session):
    tracking = tracking_data(order)
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "total": order.total,
        "shipping_address": order.shipping_address,
        "payment_method": order.payment_method,
        "cancel_reason": order.cancel_reason,
        "refund_amount": order.refund_amount,
        "refund_days": order.refund_days,
        "cancellation_message": order.cancellation_message,
        "delivery_slot_id": order.delivery_slot_id,
        "delivery_partner": tracking["delivery_partner"],
        "tracking_id": tracking["tracking_id"],
        "tracking_url": tracking["tracking_url"],
        "estimated_delivery_date": tracking["estimated_delivery_date"],
        "estimated_delivery_label": tracking["estimated_delivery_label"],
        "created_at": order.created_at,
        "items": [order_item_data(db, order, item) for item in order.items],
        "return_requests": [customer_return_data(request) for request in returns_by_order.get(order.id, [])],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart_items = get_cart_items(db, current_user)
    order = create_order_from_cart(
        db,
        current_user,
        cart_items,
        payload.shipping_address,
        payload.payment_method,
        payload.delivery_slot_id,
        payload.discount_amount,
        payload.coupon_code,
    )
    created = db.scalar(select(Order).where(Order.id == order.id).options(selectinload(Order.items)))
    return api_response(created, "Order placed")


@router.get("")
def list_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = (
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items), selectinload(Order.delivery_boy))
        .order_by(desc(Order.created_at))
    )
    orders = list(db.scalars(statement).all())
    returns = db.scalars(
        select(ReturnRequest)
        .where(ReturnRequest.user_id == current_user.id)
        .options(selectinload(ReturnRequest.pickup_delivery_boy))
    ).all()
    returns_by_order: dict[int, list[ReturnRequest]] = {}
    for request in returns:
        returns_by_order.setdefault(request.order_id, []).append(request)

    return api_response([customer_order_data(order, returns_by_order, db) for order in orders])


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    payload: OrderCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items), selectinload(Order.delivery_boy))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != "placed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orders can be cancelled only while they are placed",
        )

    order.status = "cancelled"
    order.cancel_reason = payload.reason
    order.refund_amount = 0 if order.payment_method == "cod" else order.total
    order.refund_days = None if order.payment_method == "cod" else 5
    order.cancellation_message = (
        "No refund is required for Cash on Delivery orders."
        if order.payment_method == "cod"
        else "Refund request submitted. Admin will confirm processing days."
    )
    db.commit()
    db.refresh(order)
    return api_response(customer_order_data(order, {}, db), "Order cancelled")


@router.get("/{order_id}")
def get_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    statement = select(Order).where(Order.id == order_id, Order.user_id == current_user.id).options(
        selectinload(Order.items),
        selectinload(Order.delivery_boy),
    )
    order = db.scalar(statement)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    returns = db.scalars(
        select(ReturnRequest)
        .where(ReturnRequest.order_id == order.id, ReturnRequest.user_id == current_user.id)
        .options(selectinload(ReturnRequest.pickup_delivery_boy))
    ).all()
    return api_response(customer_order_data(order, {order.id: list(returns)}, db))


@router.post("/returns", status_code=status.HTTP_201_CREATED)
def create_return_request(
    payload: ReturnRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == payload.order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != "delivered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Returns are available after delivery")

    item = db.scalar(
        select(OrderItem).where(OrderItem.id == payload.order_item_id, OrderItem.order_id == order.id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found")
    product = db.get(Product, item.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    eligibility = replacement_eligibility(product, order)
    if not eligibility["eligible"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=eligibility["message"])

    existing = db.scalar(
        select(ReturnRequest).where(
            ReturnRequest.user_id == current_user.id,
            ReturnRequest.order_item_id == item.id,
            ReturnRequest.status != "amount_received",
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Return request already exists for this item")

    request = ReturnRequest(
        order_id=order.id,
        order_item_id=item.id,
        user_id=current_user.id,
        product_name=item.product_name,
        reason=payload.reason,
        description=payload.reason,
        refund_amount=item.line_total,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return api_response(customer_return_data(request), "Return request submitted")


@router.patch("/returns/{request_id}/amount-received")
def confirm_refund_received(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(ReturnRequest)
        .where(ReturnRequest.id == request_id, ReturnRequest.user_id == current_user.id)
        .options(selectinload(ReturnRequest.pickup_delivery_boy))
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if request.status != "refund_completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund is not completed yet")

    request.status = "amount_received"
    request.admin_message = None
    db.commit()
    db.refresh(request)
    return api_response(customer_return_data(request), "Amount received confirmed")
