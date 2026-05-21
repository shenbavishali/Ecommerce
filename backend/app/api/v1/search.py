from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.responses import api_response
from app.core.database import get_db
from app.models import Product
from app.schemas import ProductList
from app.services.products import apply_product_filters

router = APIRouter()


@router.get("")
def global_search(
    q: str = Query(min_length=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = apply_product_filters(select(Product, func.count().over().label("total_count")), q=q, in_stock=None)
    rows = db.execute(
        query.order_by(desc(Product.rating), desc(Product.created_at)).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items = [row[0] for row in rows]
    total = rows[0].total_count if rows else 0
    return api_response(ProductList(items=items, total=total, page=page, page_size=page_size))
