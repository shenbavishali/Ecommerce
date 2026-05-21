import re
from datetime import datetime, timedelta
from urllib.parse import quote_plus

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DeliveryBoy, Order, OrderItem, Product
from app.services.delivery import delivery_estimate_data, matching_delivery_hub
from app.services.orders import delivery_boy_matches, normalize_delivery_category
from app.services.warranty import replacement_eligibility, warranty_card_data


TRACKING_PROVIDERS = {
    "expressbees": {
        "prefix": "XB",
        "tracking_url": "https://shipment.xpressbees.com/shipping/tracking/{tracking_id}",
    },
    "professional courier": {
        "prefix": "TPC",
        "tracking_url": "https://www.tpcindia.com/Default.aspx?podno={tracking_id}",
    },
    "st courier": {
        "prefix": "ST",
        "tracking_url": "https://www.stcourier.com/track/shipment?awb={tracking_id}",
    },
    "delhivery": {
        "prefix": "DLV",
        "tracking_url": "https://www.delhivery.com/track/package/{tracking_id}",
    },
}

DEFAULT_PROVIDER = {
    "prefix": "SHP",
    "tracking_url": "https://www.delhivery.com/track/package/{tracking_id}",
}


def provider_config(provider_name: str | None) -> dict[str, str]:
    name = str(provider_name or "").strip().lower()
    for key, config in TRACKING_PROVIDERS.items():
        if key in name:
            return config
    return DEFAULT_PROVIDER


def tracking_id_for_order(order: Order) -> str:
    config = provider_config(order.delivery_boy.name if order.delivery_boy else "")
    created = order.created_at.strftime("%d%m%y") if order.created_at else "000000"
    return f"{config['prefix']}{created}{int(order.id):08d}"


def tracking_id_for_item(order: Order, item: OrderItem, provider: DeliveryBoy | None) -> str:
    config = provider_config(provider.name if provider else order.delivery_boy.name if order.delivery_boy else "")
    created = order.created_at.strftime("%d%m%y") if order.created_at else "000000"
    return f"{config['prefix']}{created}{int(order.id):06d}{int(item.id):04d}"


def tracking_url_for_order(order: Order) -> str:
    tracking_id = tracking_id_for_order(order)
    config = provider_config(order.delivery_boy.name if order.delivery_boy else "")
    return config["tracking_url"].format(tracking_id=quote_plus(tracking_id))


def tracking_url_for_item(order: Order, item: OrderItem, provider: DeliveryBoy | None) -> str:
    tracking_id = tracking_id_for_item(order, item, provider)
    config = provider_config(provider.name if provider else order.delivery_boy.name if order.delivery_boy else "")
    return config["tracking_url"].format(tracking_id=quote_plus(tracking_id))


def estimated_delivery_date(order: Order):
    if not order.created_at:
        return None
    if order.status == "delivered":
        return order.updated_at or order.created_at
    return order.created_at + timedelta(days=7)


def estimated_delivery_label(order: Order) -> str:
    estimate = estimated_delivery_date(order)
    if estimate is None:
        return "Estimated delivery date unavailable"
    prefix = "Delivered on" if order.status == "delivered" else "Estimated delivery"
    return f"{prefix}: {estimate.strftime('%a, %d %b')}"


def pincode_from_order(order: Order) -> str | None:
    match = re.search(r"\b\d{6}\b", str(order.shipping_address or ""))
    return match.group(0) if match else None


def item_estimated_delivery_data(db: Session, order: Order, item: OrderItem) -> dict:
    product = db.get(Product, item.product_id)
    pincode = pincode_from_order(order)
    if product is None or not pincode:
        estimate = estimated_delivery_date(order)
        return {
            "estimated_delivery_date": estimate.date().isoformat() if estimate else None,
            "estimated_delivery_label": estimated_delivery_label(order),
            "delivery_days": None,
            "delivery_message": "Estimated delivery date unavailable" if estimate is None else estimated_delivery_label(order),
            "delivery_pincode": pincode,
        }

    estimate = delivery_estimate_data(db, product, matching_delivery_hub(db, pincode), pincode)
    if not estimate.get("available") or not estimate.get("delivery_date"):
        fallback_estimate = estimated_delivery_date(order)
        return {
            "estimated_delivery_date": fallback_estimate.date().isoformat() if fallback_estimate else None,
            "estimated_delivery_label": estimated_delivery_label(order),
            "delivery_days": None,
            "delivery_message": estimate.get("message", "Estimated delivery date unavailable"),
            "delivery_pincode": pincode,
        }

    delivery_date = datetime.fromisoformat(estimate["delivery_date"])
    prefix = "Delivered on" if order.status == "delivered" else "Estimated delivery"
    return {
        "estimated_delivery_date": estimate["delivery_date"],
        "estimated_delivery_label": f"{prefix}: {delivery_date.strftime('%a, %d %b')}",
        "delivery_days": estimate.get("delivery_days"),
        "delivery_message": estimate.get("message"),
        "delivery_pincode": pincode,
    }


def tracking_data(order: Order) -> dict:
    tracking_id = tracking_id_for_order(order)
    estimate = estimated_delivery_date(order)
    return {
        "delivery_partner": order.delivery_boy.name if order.delivery_boy else None,
        "tracking_id": tracking_id,
        "tracking_url": tracking_url_for_order(order),
        "estimated_delivery_date": estimate.date().isoformat() if estimate else None,
        "estimated_delivery_label": estimated_delivery_label(order),
    }


def delivery_partner_for_item(db: Session, order: Order, item: OrderItem) -> DeliveryBoy | None:
    product = db.get(Product, item.product_id)
    item_category = normalize_delivery_category(product.category if product else item.product_name)
    active_delivery_boys = list(
        db.scalars(select(DeliveryBoy).where(DeliveryBoy.is_active.is_(True)).order_by(DeliveryBoy.id)).all()
    )
    matched_delivery_boy = next(
        (delivery_boy for delivery_boy in active_delivery_boys if delivery_boy_matches(delivery_boy, item_category)),
        None,
    )
    fallback_delivery_boy = next(
        (delivery_boy for delivery_boy in active_delivery_boys if delivery_boy_matches(delivery_boy, "general")),
        None,
    )
    return matched_delivery_boy or fallback_delivery_boy or order.delivery_boy


def tracking_data_for_item(db: Session, order: Order, item: OrderItem) -> dict:
    partner = delivery_partner_for_item(db, order, item)
    tracking_id = tracking_id_for_item(order, item, partner)
    estimate = item_estimated_delivery_data(db, order, item)
    return {
        "delivery_partner": partner.name if partner else None,
        "tracking_id": tracking_id,
        "tracking_url": tracking_url_for_item(order, item, partner),
        "estimated_delivery_date": estimate["estimated_delivery_date"],
        "estimated_delivery_label": estimate["estimated_delivery_label"],
        "delivery_days": estimate["delivery_days"],
        "delivery_message": estimate["delivery_message"],
        "delivery_pincode": estimate["delivery_pincode"],
    }


def order_item_data(db: Session, order: Order, item: OrderItem) -> dict:
    tracking = tracking_data_for_item(db, order, item)
    product = db.get(Product, item.product_id)
    warranty_card = warranty_card_data(product, order, item, order.user.full_name) if product is not None and order.user else None
    replacement = replacement_eligibility(product, order) if product is not None else None
    return {
        "id": item.id,
        "order_id": item.order_id,
        "product_id": item.product_id,
        "product_name": item.product_name,
        "unit_price": item.unit_price,
        "quantity": item.quantity,
        "line_total": item.line_total,
        "delivery_partner": tracking["delivery_partner"],
        "tracking_id": tracking["tracking_id"],
        "tracking_url": tracking["tracking_url"],
        "estimated_delivery_date": tracking["estimated_delivery_date"],
        "estimated_delivery_label": tracking["estimated_delivery_label"],
        "delivery_days": tracking["delivery_days"],
        "delivery_message": tracking["delivery_message"],
        "delivery_pincode": tracking["delivery_pincode"],
        "warranty_card": warranty_card,
        "replacement": replacement,
    }
