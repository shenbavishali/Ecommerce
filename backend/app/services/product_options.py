from fastapi import HTTPException, status

from app.models import Product
from app.services.warranty import protection_plans


def product_options(product: Product) -> list[tuple[str, float]]:
    name = str(product.name or "").lower()
    subcategory = str(product.subcategory or "").lower()
    category = str(product.category or "").lower()
    price = float(product.price)

    if "power bank" in name:
        return [
            ("Black", price),
            ("Green", price),
            ("Purple", price),
        ]

    if "tv" in name or "television" in subcategory:
        return [
            ("55 inch", price),
            ("65 inch", round(price * 1.28)),
            ("75 inch", round(price * 1.72)),
        ]

    if category == "ac" or "air conditioner" in name or "split ac" in subcategory or "inverter ac" in subcategory:
        return [
            ("1 Ton", round(price * 0.85)),
            ("1.5 Ton", price),
            ("2 Ton", round(price * 1.22)),
        ]

    if "laptop" in category:
        return [
            ("8 GB / 512 GB", price),
            ("16 GB / 512 GB", round(price * 1.12)),
            ("16 GB / 1 TB", round(price * 1.24)),
        ]

    return [
        (product.size or "Standard", price),
        ("Value pack", round(price * 1.08)),
        ("Premium pack", round(price * 1.18)),
    ]


def validated_selected_option(product: Product, label: str | None, price: float | None) -> tuple[str | None, float | None]:
    if not label and price is None:
        return None, None

    if not label or price is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected option and price are required together")

    selected_parts = [part.strip() for part in label.split(" + ") if part.strip()]
    option_label = selected_parts[0] if selected_parts else label
    plan_label = selected_parts[1] if len(selected_parts) > 1 else None

    matching_option = next((option for option in product_options(product) if option[0] == option_label), None)
    if matching_option is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected option is not available for this product")

    expected_price = float(matching_option[1])
    if plan_label:
        matching_plan = next((plan for plan in protection_plans(product, expected_price) if plan[0] == plan_label), None)
        if matching_plan is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected protection plan is not available for this product")
        expected_price += float(matching_plan[1])

    if abs(expected_price - float(price)) > 0.01:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected option price is invalid")

    return label, expected_price
