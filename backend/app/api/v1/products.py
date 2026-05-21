from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.api.responses import api_response
from app.core.database import get_db
from app.models import Product
from app.schemas import ProductList
from app.services.products import apply_product_filters, get_facets

router = APIRouter()


@router.get("")
def list_products(
    q: str | None = Query(default=None, description="Search name, brand, category, SKU, and description"),
    search: str | None = Query(default=None, description="Alias for q used by toolbar search"),
    category: str | None = None,
    brand: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    color: str | None = None,
    size: str | None = None,
    gender: str | None = None,
    in_stock: bool | None = None,
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc|rating_desc|discount_desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    search_term = q or search
    query = apply_product_filters(
        select(Product, func.count().over().label("total_count")),
        q=search_term,
        category=category,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        color=color,
        size=size,
        gender=gender,
        in_stock=in_stock,
    )
    sort_map = {
        "newest": desc(Product.created_at),
        "price_asc": asc(Product.price),
        "price_desc": desc(Product.price),
        "rating_desc": desc(Product.rating),
        "discount_desc": desc(Product.discount_percent),
    }
    rows = db.execute(query.order_by(sort_map[sort]).offset((page - 1) * page_size).limit(page_size)).all()
    items = [row[0] for row in rows]
    total = rows[0].total_count if rows else 0
    return api_response(ProductList(items=items, total=total, page=page, page_size=page_size))


@router.get("/facets")
def facets(db: Session = Depends(get_db)):
    return api_response(get_facets(db))


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return api_response(product)
