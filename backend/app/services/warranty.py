from datetime import datetime, timedelta, timezone

from app.models import Order, OrderItem, Product


DEFAULT_WARRANTY_TERMS = (
    "Warranty covers manufacturing defects with a genuine invoice. Physical damage, misuse, missing accessories, "
    "consumables, and unauthorized repairs are not covered."
)


def default_warranty_months(product: Product) -> int:
    text = f"{product.category} {product.subcategory or ''} {product.name}".lower()
    if any(value in text for value in ["laptop", "tv", "ac", "mobile"]):
        return 12
    if any(value in text for value in ["power bank", "earbuds", "headphones", "smartwatch", "audio"]):
        return 6
    return 0


def effective_warranty_months(product: Product) -> int:
    return int(product.warranty_months or default_warranty_months(product))


def effective_replacement_days(product: Product) -> int:
    if product.replacement_days:
        return int(product.replacement_days)
    text = f"{product.category} {product.subcategory or ''} {product.name}".lower()
    if any(value in text for value in ["grocery", "dairy", "staples", "rice", "salt", "oil"]):
        return 0
    if any(value in text for value in ["electronics", "laptop", "ac", "mobile", "audio", "shoes", "jeans", "t-shirt", "fashion"]):
        return 10
    return 0


def protection_plans(product: Product, base_price: float) -> list[tuple[str, float]]:
    months = effective_warranty_months(product)
    if months <= 0:
        return []

    text = f"{product.category} {product.subcategory or ''} {product.name}".lower()
    price = float(base_price)
    if any(value in text for value in ["laptop", "tv", "ac"]):
        return [
            ("1 Year Extended Warranty", max(999, round(price * 0.035))),
            ("2 Years Extended Warranty", max(1699, round(price * 0.06))),
            ("3 Years Total Protection", max(2499, round(price * 0.085))),
        ]
    if "mobile" in text:
        return [
            ("1 Year Screen & Device Protection", max(799, round(price * 0.06))),
            ("2 Years Total Protection", max(1299, round(price * 0.095))),
        ]
    return [("1 Year Protection Plan", max(299, round(price * 0.08)))]


def warranty_card_data(product: Product, order: Order, item: OrderItem, customer_name: str) -> dict | None:
    months = effective_warranty_months(product)
    if months <= 0 or not product.warranty_card_enabled:
        return None

    start_at = order.updated_at or order.created_at or datetime.now(timezone.utc)
    expires_at = start_at + timedelta(days=months * 30)
    return {
        "card_number": f"WC-{order.id:06d}-{item.id:06d}",
        "customer_name": customer_name,
        "product_name": item.product_name,
        "brand": product.brand,
        "order_number": order.order_number,
        "issued_at": start_at.date().isoformat(),
        "expires_at": expires_at.date().isoformat(),
        "warranty_months": months,
        "terms": product.warranty_terms or DEFAULT_WARRANTY_TERMS,
    }


def replacement_eligibility(product: Product, order: Order) -> dict:
    days = effective_replacement_days(product)
    delivered_at = order.updated_at or order.created_at
    if days <= 0:
        return {"eligible": False, "replacement_days": 0, "expires_at": None, "message": "Replacement is not enabled for this product."}
    if order.status != "delivered" or delivered_at is None:
        return {"eligible": False, "replacement_days": days, "expires_at": None, "message": "Replacement starts after delivery."}

    if delivered_at.tzinfo is None:
        delivered_at = delivered_at.replace(tzinfo=timezone.utc)
    expires_at = delivered_at + timedelta(days=days)
    eligible = datetime.now(timezone.utc) <= expires_at
    return {
        "eligible": eligible,
        "replacement_days": days,
        "expires_at": expires_at.date().isoformat(),
        "message": f"Replacement available until {expires_at.date().isoformat()}." if eligible else "Replacement period has expired.",
    }
