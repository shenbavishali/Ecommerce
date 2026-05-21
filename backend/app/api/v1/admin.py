from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.api.responses import api_response
from app.core.database import get_db
from app.models import DeliveryBoy, DeliveryHub, DeliverySlot, HelpRequest, Order, OrderItem, Product, ProductHubStock, ReturnRequest, User, utc_now
from app.schemas import (
    DeliveryBoyCreate,
    DeliveryBoyUpdate,
    DeliveryHubCreate,
    DeliveryHubUpdate,
    DeliverySlotCreate,
    HelpRequestResponse,
    OrderDeliveryBoyUpdate,
    OrderCancellationUpdate,
    OrderStatusUpdate,
    ProductCreate,
    ProductHubStockUpdate,
    ProductList,
    ProductUpdate,
    ReturnAdminUpdate,
    StockAdjustment,
)
from app.services.products import apply_product_filters, count_products, unique_slug
from app.services.tracking import order_item_data, tracking_data
from app.services.email import send_warranty_card_email
from app.services.warranty import replacement_eligibility, warranty_card_data

router = APIRouter()
HUB_STATE = "Tamilnadu"
PRODUCT_IMAGE_DIR = Path("static/products")
ALLOWED_PRODUCT_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def delivery_boy_data(delivery_boy: DeliveryBoy | None):
    if delivery_boy is None:
        return None
    return {
        "id": delivery_boy.id,
        "name": delivery_boy.name,
        "phone": delivery_boy.phone,
        "area": delivery_boy.area,
        "category_scope": delivery_boy.category_scope,
        "is_active": delivery_boy.is_active,
    }


def admin_order_data(order: Order, db: Session):
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
        "created_at": order.created_at,
        "delivery_boy_id": order.delivery_boy_id,
        "delivery_boy": delivery_boy_data(order.delivery_boy),
        "delivery_partner": tracking["delivery_partner"],
        "tracking_id": tracking["tracking_id"],
        "tracking_url": tracking["tracking_url"],
        "estimated_delivery_date": tracking["estimated_delivery_date"],
        "estimated_delivery_label": tracking["estimated_delivery_label"],
        "user": {
            "id": order.user.id,
            "email": order.user.email,
            "full_name": order.user.full_name,
        },
        "items": [order_item_data(db, order, item) for item in order.items],
    }


def return_request_data(request: ReturnRequest):
    product = request.order_item.product if request.order_item else None
    replacement = replacement_eligibility(product, request.order) if product is not None else None
    return {
        "id": request.id,
        "order_id": request.order_id,
        "order_number": request.order.order_number,
        "order_item_id": request.order_item_id,
        "customer": {
            "id": request.user.id,
            "email": request.user.email,
            "full_name": request.user.full_name,
        },
        "product_name": request.product_name,
        "replacement": replacement,
        "reason": request.reason,
        "description": request.description,
        "refund_amount": request.refund_amount,
        "refund_days": request.refund_days,
        "status": request.status,
        "admin_message": request.admin_message,
        "pickup_delivery_boy_id": request.pickup_delivery_boy_id,
        "pickup_delivery_boy": delivery_boy_data(request.pickup_delivery_boy),
        "created_at": request.created_at,
    }


def delivery_hub_data(hub: DeliveryHub):
    return {
        "id": hub.id,
        "name": hub.name,
        "city": hub.city,
        "state": hub.state,
        "region": hub.region,
        "pincode_prefixes": hub.pincode_prefixes,
        "base_delivery_days": hub.base_delivery_days,
        "fallback_extra_days": hub.fallback_extra_days,
        "express_available": hub.express_available,
        "is_active": hub.is_active,
        "created_at": hub.created_at,
        "updated_at": hub.updated_at,
    }


def help_request_data(request: HelpRequest):
    return {
        "id": request.id,
        "ticket_number": request.ticket_number,
        "order_id": request.order_id,
        "order_number": request.order.order_number if request.order else "",
        "issue_type": request.issue_type,
        "message": request.message,
        "status": request.status,
        "admin_response": request.admin_response,
        "responded_at": request.responded_at,
        "created_at": request.created_at,
        "customer": {
            "id": request.user.id,
            "email": request.user.email,
            "full_name": request.user.full_name,
        },
    }


@router.get("/dashboard")
def admin_dashboard(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    product_count = db.scalar(select(func.count(Product.id))) or 0
    active_product_count = db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0
    low_stock_count = (
        db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True), Product.inventory <= 5)) or 0
    )
    user_count = db.scalar(select(func.count(User.id))) or 0
    active_user_count = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    order_count = db.scalar(select(func.count(Order.id))) or 0
    return_count = (
        db.scalar(
            select(func.count(ReturnRequest.id)).where(
                ReturnRequest.status.notin_(["refund_completed", "amount_received"])
            )
        )
        or 0
    )
    help_count = (
        db.scalar(select(func.count(HelpRequest.id)).where(HelpRequest.status.in_(["open", "in_progress"]))) or 0
    )
    gross_revenue = float(db.scalar(select(func.coalesce(func.sum(Order.total), 0))) or 0)
    refunded_amount = float(
        db.scalar(
            select(func.coalesce(func.sum(ReturnRequest.refund_amount), 0)).where(
                ReturnRequest.status.in_(["refund_completed", "amount_received"])
            )
        )
        or 0
    )
    revenue = gross_revenue - refunded_amount

    return api_response(
        {
            "products": product_count,
            "active_products": active_product_count,
            "low_stock": low_stock_count,
            "users": user_count,
            "active_users": active_user_count,
            "orders": order_count,
            "returns": return_count,
            "help_requests": help_count,
            "revenue": revenue,
            "gross_revenue": gross_revenue,
            "refunded_amount": refunded_amount,
        }
    )


@router.get("/delivery-hubs")
def admin_list_delivery_hubs(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    hubs = db.scalars(select(DeliveryHub).order_by(DeliveryHub.name)).all()
    return api_response([delivery_hub_data(hub) for hub in hubs])


@router.post("/delivery-hubs", status_code=status.HTTP_201_CREATED)
def admin_create_delivery_hub(
    payload: DeliveryHubCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    active_hub_count = db.scalar(select(func.count(DeliveryHub.id)).where(DeliveryHub.is_active.is_(True))) or 0
    if payload.is_active and active_hub_count >= 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only 4 active delivery hubs are allowed")
    if payload.state != HUB_STATE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"All hubs must belong to {HUB_STATE}")
    hub = DeliveryHub(**payload.model_dump(), pincode_prefix=payload.pincode_prefixes.split(",")[0][:3])
    db.add(hub)
    db.commit()
    db.refresh(hub)
    return api_response(delivery_hub_data(hub), "Delivery hub created")


@router.patch("/delivery-hubs/{hub_id}")
def admin_update_delivery_hub(
    hub_id: int,
    payload: DeliveryHubUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    hub = db.get(DeliveryHub, hub_id)
    if hub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery hub not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(hub, key, value)
    if hub.state != HUB_STATE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"All hubs must belong to {HUB_STATE}")
    if hub.is_active:
        active_hub_count = (
            db.scalar(select(func.count(DeliveryHub.id)).where(DeliveryHub.is_active.is_(True), DeliveryHub.id != hub.id))
            or 0
        )
        if active_hub_count >= 4:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only 4 active delivery hubs are allowed")
    hub.pincode_prefix = str(hub.pincode_prefixes).split(",")[0][:3]
    db.commit()
    db.refresh(hub)
    return api_response(delivery_hub_data(hub), "Delivery hub updated")


@router.delete("/delivery-hubs/{hub_id}")
def admin_delete_delivery_hub(
    hub_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    hub = db.get(DeliveryHub, hub_id)
    if hub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery hub not found")
    hub.is_active = False
    db.commit()
    db.refresh(hub)
    return api_response(delivery_hub_data(hub), "Delivery hub disabled")


@router.get("/product-hub-stock")
def admin_list_product_hub_stock(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    hubs = list(db.scalars(select(DeliveryHub).where(DeliveryHub.is_active.is_(True)).order_by(DeliveryHub.region)).all())
    products = list(db.scalars(select(Product).where(Product.is_active.is_(True)).order_by(Product.name)).all())
    rows = db.scalars(select(ProductHubStock)).all()
    stock_map = {(row.product_id, row.hub_id): row.quantity for row in rows}
    return api_response(
        {
            "hubs": [delivery_hub_data(hub) for hub in hubs],
            "products": [
                {
                    "id": product.id,
                    "name": product.name,
                    "sku": product.sku,
                    "inventory": product.inventory,
                    "hub_stock": [
                        {
                            "hub_id": hub.id,
                            "quantity": int(stock_map.get((product.id, hub.id), 0)),
                        }
                        for hub in hubs
                    ],
                }
                for product in products
            ],
        }
    )


@router.patch("/product-hub-stock")
def admin_update_product_hub_stock(
    payload: ProductHubStockUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, payload.product_id)
    hub = db.get(DeliveryHub, payload.hub_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if hub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery hub not found")
    stock = db.scalar(
        select(ProductHubStock).where(ProductHubStock.product_id == product.id, ProductHubStock.hub_id == hub.id)
    )
    if stock is None:
        stock = ProductHubStock(product_id=product.id, hub_id=hub.id, quantity=payload.quantity)
        db.add(stock)
    else:
        stock.quantity = payload.quantity
    product.inventory = (
        db.scalar(select(func.coalesce(func.sum(ProductHubStock.quantity), 0)).where(ProductHubStock.product_id == product.id))
        or payload.quantity
    )
    db.commit()
    db.refresh(stock)
    return api_response(
        {
            "product_id": stock.product_id,
            "hub_id": stock.hub_id,
            "quantity": stock.quantity,
        },
        "Hub stock updated",
    )


@router.get("/help-requests")
def admin_list_help_requests(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    requests = db.scalars(
        select(HelpRequest)
        .options(selectinload(HelpRequest.user), selectinload(HelpRequest.order))
        .order_by(desc(HelpRequest.created_at))
    ).all()
    return api_response([help_request_data(request) for request in requests])


@router.patch("/help-requests/{request_id}")
def admin_respond_help_request(
    request_id: int,
    payload: HelpRequestResponse,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(HelpRequest)
        .where(HelpRequest.id == request_id)
        .options(selectinload(HelpRequest.user), selectinload(HelpRequest.order))
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Help request not found")
    request.admin_response = payload.admin_response
    request.status = payload.status
    request.responded_at = utc_now()
    db.commit()
    db.refresh(request)
    return api_response(help_request_data(request), "Help response sent")


@router.get("/products")
def admin_list_products(
    q: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = apply_product_filters(select(Product), q=q, include_inactive=True)
    total = count_products(db, query)
    items = db.scalars(query.order_by(desc(Product.created_at)).offset((page - 1) * page_size).limit(page_size)).all()
    return api_response(ProductList(items=list(items), total=total, page=page, page_size=page_size))


@router.get("/users")
def admin_list_users(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.execute(
        select(
            User,
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total), 0).label("total_spent"),
        )
        .outerjoin(Order, Order.user_id == User.id)
        .group_by(User.id)
        .order_by(desc(User.last_login), desc(User.created_at))
    ).all()

    return api_response(
        [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "last_login": user.last_login,
                "created_at": user.created_at,
                "order_count": int(order_count or 0),
                "total_spent": float(total_spent or 0),
            }
            for user, order_count, total_spent in rows
        ]
    )


@router.get("/orders")
def admin_list_orders(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
        .order_by(desc(Order.created_at))
    ).all()
    return api_response([admin_order_data(order, db) for order in orders])


@router.get("/delivery-boys")
def admin_list_delivery_boys(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    delivery_boys = db.scalars(select(DeliveryBoy).order_by(DeliveryBoy.name)).all()
    return api_response([delivery_boy_data(delivery_boy) for delivery_boy in delivery_boys])


@router.post("/delivery-boys", status_code=status.HTTP_201_CREATED)
def admin_create_delivery_boy(
    payload: DeliveryBoyCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    active_delivery_boy_count = db.scalar(select(func.count(DeliveryBoy.id)).where(DeliveryBoy.is_active.is_(True))) or 0
    if active_delivery_boy_count >= 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only 4 active courier providers are allowed")

    delivery_boy = DeliveryBoy(**payload.model_dump(), is_active=True)
    db.add(delivery_boy)
    db.commit()
    db.refresh(delivery_boy)
    return api_response(delivery_boy_data(delivery_boy), "Courier provider created")


@router.patch("/delivery-boys/{delivery_boy_id}")
def admin_update_delivery_boy(
    delivery_boy_id: int,
    payload: DeliveryBoyUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    delivery_boy = db.get(DeliveryBoy, delivery_boy_id)
    if delivery_boy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Courier provider not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(delivery_boy, key, value)
    if delivery_boy.is_active:
        active_delivery_boy_count = (
            db.scalar(
                select(func.count(DeliveryBoy.id)).where(
                    DeliveryBoy.is_active.is_(True),
                    DeliveryBoy.id != delivery_boy.id,
                )
            )
            or 0
        )
        if active_delivery_boy_count >= 4:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only 4 active courier providers are allowed")

    db.commit()
    db.refresh(delivery_boy)
    return api_response(delivery_boy_data(delivery_boy), "Courier provider updated")


@router.delete("/delivery-boys/{delivery_boy_id}")
def admin_delete_delivery_boy(
    delivery_boy_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    delivery_boy = db.get(DeliveryBoy, delivery_boy_id)
    if delivery_boy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Courier provider not found")

    delivery_boy.is_active = False
    db.commit()
    db.refresh(delivery_boy)
    return api_response(delivery_boy_data(delivery_boy), "Courier provider deleted")


@router.patch("/orders/{order_id}/delivery-boy")
def assign_order_delivery_boy(
    order_id: int,
    payload: OrderDeliveryBoyUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if payload.delivery_boy_id is not None and db.get(DeliveryBoy, payload.delivery_boy_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Courier provider not found")

    order.delivery_boy_id = payload.delivery_boy_id
    db.commit()
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
    )
    return api_response(admin_order_data(order, db), "Courier provider assigned")


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if payload.status in {"shipped", "delivered"} and order.delivery_boy_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assign a courier provider before shipping")

    order.status = payload.status
    db.commit()
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
    )
    if payload.status == "delivered":
        for item in order.items:
            product = db.get(Product, item.product_id)
            card = warranty_card_data(product, order, item, order.user.full_name) if product is not None else None
            if card:
                send_warranty_card_email(order.user.email, card)
    return api_response(admin_order_data(order, db), "Order status updated")


@router.patch("/orders/{order_id}/cancellation")
def update_order_cancellation(
    order_id: int,
    payload: OrderCancellationUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.user), selectinload(Order.delivery_boy))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only cancelled orders can be updated")

    if payload.refund_days is not None:
        order.refund_days = payload.refund_days
    if payload.cancellation_message is not None:
        order.cancellation_message = payload.cancellation_message

    db.commit()
    db.refresh(order)
    return api_response(admin_order_data(order, db), "Cancellation refund details updated")


@router.get("/returns")
def admin_list_returns(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    requests = db.scalars(
        select(ReturnRequest)
        .options(
            selectinload(ReturnRequest.order),
            selectinload(ReturnRequest.order_item).selectinload(OrderItem.product),
            selectinload(ReturnRequest.user),
            selectinload(ReturnRequest.pickup_delivery_boy),
        )
        .order_by(desc(ReturnRequest.created_at))
    ).all()
    return api_response([return_request_data(request) for request in requests])


@router.patch("/returns/{request_id}")
def admin_update_return(
    request_id: int,
    payload: ReturnAdminUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(ReturnRequest)
        .where(ReturnRequest.id == request_id)
        .options(
            selectinload(ReturnRequest.order),
            selectinload(ReturnRequest.order_item).selectinload(OrderItem.product),
            selectinload(ReturnRequest.user),
            selectinload(ReturnRequest.pickup_delivery_boy),
        )
    )
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if payload.pickup_delivery_boy_id is not None and db.get(DeliveryBoy, payload.pickup_delivery_boy_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Courier provider not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(request, key, value)

    if payload.admin_message and request.status == "requested":
        request.status = "message_sent"
    if payload.pickup_delivery_boy_id and request.status in {"requested", "message_sent"}:
        request.status = "pickup_assigned"

    db.commit()
    request = db.scalar(
        select(ReturnRequest)
        .where(ReturnRequest.id == request_id)
        .options(
            selectinload(ReturnRequest.order),
            selectinload(ReturnRequest.order_item).selectinload(OrderItem.product),
            selectinload(ReturnRequest.user),
            selectinload(ReturnRequest.pickup_delivery_boy),
        )
    )
    return api_response(return_request_data(request), "Return request updated")


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = Product(**payload.model_dump(), slug=unique_slug(db, payload.name))
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU or slug already exists") from exc

    db.refresh(product)
    hubs = db.scalars(select(DeliveryHub).where(DeliveryHub.is_active.is_(True))).all()
    for hub in hubs:
        db.add(ProductHubStock(product_id=product.id, hub_id=hub.id, quantity=0))
    db.commit()
    db.refresh(product)
    return api_response(product, "Product created")


@router.patch("/products/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        product.slug = unique_slug(db, updates["name"], product_id=product.id)

    for key, value in updates.items():
        setattr(product, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU or slug already exists") from exc

    db.refresh(product)
    return api_response(product, "Product updated")


@router.post("/products/{product_id}/image")
async def upload_product_image(
    product_id: int,
    image: UploadFile = File(...),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in ALLOWED_PRODUCT_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JPG, PNG, or WEBP product image")

    PRODUCT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"product-{product.id}-{uuid4().hex}{suffix}"
    target = PRODUCT_IMAGE_DIR / filename
    target.write_bytes(await image.read())
    product.image_url = f"/static/products/{filename}"
    db.commit()
    db.refresh(product)
    return api_response(product, "Product image uploaded")


@router.post("/products/{product_id}/stock")
def add_product_stock(
    product_id: int,
    payload: StockAdjustment,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.inventory += payload.quantity
    db.commit()
    db.refresh(product)
    return api_response(product, "Stock updated")


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.commit()
    return api_response({}, "Product deleted")


@router.post("/delivery-slots", status_code=status.HTTP_201_CREATED)
def create_delivery_slot(
    payload: DeliverySlotCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    slot = DeliverySlot(**payload.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return api_response(slot, "Delivery slot created")
