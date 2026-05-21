import re

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models import Product


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "product"


def unique_slug(db: Session, name: str, product_id: int | None = None) -> str:
    base_slug = slugify(name)
    slug = base_slug
    counter = 2

    while True:
        query = select(Product).where(Product.slug == slug)
        if product_id is not None:
            query = query.where(Product.id != product_id)
        exists = db.scalar(query)
        if not exists:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def apply_product_filters(
    query: Select,
    *,
    q: str | None = None,
    category: str | None = None,
    brand: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    color: str | None = None,
    size: str | None = None,
    gender: str | None = None,
    in_stock: bool | None = None,
    include_inactive: bool = False,
) -> Select:
    if not include_inactive:
        query = query.where(Product.is_active.is_(True))

    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Product.name.like(pattern),
                Product.brand.like(pattern),
                Product.category.like(pattern),
                Product.subcategory.like(pattern),
                Product.description.like(pattern),
                Product.sku.like(pattern),
            )
        )
    if category:
        query = query.where(Product.category == category)
    if brand:
        query = query.where(Product.brand == brand)
    if color:
        query = query.where(Product.color == color)
    if size:
        query = query.where(Product.size == size)
    if gender:
        query = query.where(Product.gender == gender)
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    if in_stock is True:
        query = query.where(Product.inventory > 0)

    return query


def count_products(db: Session, query: Select) -> int:
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    return db.scalar(count_query) or 0


def get_facets(db: Session) -> dict[str, list[str]]:
    def values(column):
        statement = select(column).where(Product.is_active.is_(True), column.is_not(None)).distinct().order_by(column)
        return [item for item in db.scalars(statement).all() if item]

    return {
        "categories": values(Product.category),
        "brands": values(Product.brand),
        "colors": values(Product.color),
        "sizes": values(Product.size),
    }
