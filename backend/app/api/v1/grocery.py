from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.api.responses import api_response
from app.core.database import get_db
from app.models import GroceryMaster, MonthlyGroceryTemplate, Product, User
from app.schemas import (
    GroceryMasterCreate,
    GroceryMasterRead,
    GroceryMasterUpdate,
    MonthlyGroceryTemplateAddItem,
    MonthlyGroceryTemplateSave,
)

router = APIRouter()


def master_data(item: GroceryMaster) -> GroceryMasterRead:
    return GroceryMasterRead.model_validate(item)


def unit_from_size(size: str | None) -> str:
    value = (size or "").lower()
    if "kg" in value or " g" in value or value.endswith("g"):
        return "kg"
    if "ltr" in value or " l" in value or value.endswith("l") or "ml" in value:
        return "ltr"
    if "box" in value:
        return "box"
    if "pack" in value or "pouch" in value:
        return "pack"
    return "pcs"


def ensure_user_grocery_master(current_user: User, db: Session) -> None:
    grocery_products = list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True), Product.category == "Grocery")
            .order_by(Product.name)
        ).all()
    )
    if not grocery_products:
        return

    product_ids = {product.id for product in grocery_products}
    existing_product_ids = set(
        db.scalars(
            select(GroceryMaster.product_id).where(
                GroceryMaster.user_id == current_user.id,
                GroceryMaster.product_id.in_(product_ids),
            )
        ).all()
    )
    missing_products = [product for product in grocery_products if product.id not in existing_product_ids]
    if not missing_products:
        return

    for product in missing_products:
        db.add(
            GroceryMaster(
                user_id=current_user.id,
                product_id=product.id,
                unit=unit_from_size(product.size),
                default_qty=1,
            )
        )
    db.commit()


def template_row_data(row: MonthlyGroceryTemplate) -> dict:
    master = row.grocery_master
    product = master.product
    return {
        "id": row.id,
        "month": row.month,
        "grocery_master_id": row.grocery_master_id,
        "is_required": row.is_required,
        "qty": float(row.qty),
        "price": float(row.price),
        "line_total": float(row.qty) * float(row.price),
        "unit": master.unit,
        "default_qty": float(master.default_qty),
        "product": GroceryMasterRead.model_validate(master).product,
        "product_name": product.name,
        "category": product.category,
        "brand": product.brand,
    }


@router.get("/master")
def list_grocery_master(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_user_grocery_master(current_user, db)
    rows = db.scalars(
        select(GroceryMaster)
        .where(GroceryMaster.user_id == current_user.id)
        .options(selectinload(GroceryMaster.product))
        .order_by(GroceryMaster.created_at.desc())
    ).all()
    return api_response([master_data(row) for row in rows])


@router.post("/master", status_code=status.HTTP_201_CREATED)
def add_grocery_master(
    payload: GroceryMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    row = GroceryMaster(
        user_id=current_user.id,
        product_id=product.id,
        unit=payload.unit,
        default_qty=payload.default_qty,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product already exists in grocery master") from exc
    row = db.scalar(
        select(GroceryMaster)
        .where(GroceryMaster.id == row.id)
        .options(selectinload(GroceryMaster.product))
    )
    return api_response(master_data(row), "Grocery product added to master")


@router.patch("/master/{master_id}")
def update_grocery_master(
    master_id: int,
    payload: GroceryMasterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.scalar(
        select(GroceryMaster)
        .where(GroceryMaster.id == master_id, GroceryMaster.user_id == current_user.id)
        .options(selectinload(GroceryMaster.product))
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grocery master item not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return api_response(master_data(row), "Grocery master item updated")


@router.delete("/master/{master_id}")
def delete_grocery_master(master_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(GroceryMaster).where(GroceryMaster.id == master_id, GroceryMaster.user_id == current_user.id))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grocery master item not found")
    db.delete(row)
    db.commit()
    return api_response({}, "Grocery master item removed")


@router.get("/template")
def get_monthly_template(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = list(
        db.scalars(
            select(MonthlyGroceryTemplate)
            .where(MonthlyGroceryTemplate.user_id == current_user.id, MonthlyGroceryTemplate.month == month)
            .options(
                selectinload(MonthlyGroceryTemplate.grocery_master).selectinload(GroceryMaster.product)
            )
            .order_by(MonthlyGroceryTemplate.id)
        ).all()
    )
    return api_response({"month": month, "derived_from": "", "items": [template_row_data(row) for row in rows]})


@router.post("/template/items", status_code=status.HTTP_201_CREATED)
def add_monthly_template_item(
    payload: MonthlyGroceryTemplateAddItem,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    master = db.scalar(
        select(GroceryMaster)
        .where(GroceryMaster.id == payload.grocery_master_id, GroceryMaster.user_id == current_user.id)
        .options(selectinload(GroceryMaster.product))
    )
    if master is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grocery master item not found")

    existing_row = db.scalar(
        select(MonthlyGroceryTemplate.id).where(
            MonthlyGroceryTemplate.user_id == current_user.id,
            MonthlyGroceryTemplate.month == payload.month,
            MonthlyGroceryTemplate.grocery_master_id == master.id,
        )
    )
    if existing_row is not None:
        return get_monthly_template(payload.month, current_user, db)

    row = MonthlyGroceryTemplate(
        user_id=current_user.id,
        month=payload.month,
        grocery_master_id=master.id,
        is_required=payload.is_required,
        qty=master.default_qty,
        price=master.product.price,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item already exists in this monthly template") from exc

    return get_monthly_template(payload.month, current_user, db)


@router.put("/template")
def save_monthly_template(
    payload: MonthlyGroceryTemplateSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template_items = list({item.grocery_master_id: item for item in reversed(payload.items)}.values())
    template_items.reverse()
    master_ids = {item.grocery_master_id for item in template_items}
    existing_master_ids = set(
        db.scalars(
            select(GroceryMaster.id).where(GroceryMaster.user_id == current_user.id, GroceryMaster.id.in_(master_ids))
        ).all()
    )
    missing = master_ids - existing_master_ids
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template contains grocery items outside your master list")

    old_rows = db.scalars(
        select(MonthlyGroceryTemplate).where(
            MonthlyGroceryTemplate.user_id == current_user.id,
            MonthlyGroceryTemplate.month == payload.month,
        )
    ).all()
    for row in old_rows:
        db.delete(row)
    db.flush()

    for item in template_items:
        db.add(
            MonthlyGroceryTemplate(
                user_id=current_user.id,
                month=payload.month,
                grocery_master_id=item.grocery_master_id,
                is_required=item.is_required,
                qty=item.qty,
                price=item.price,
            )
        )

    db.commit()
    return get_monthly_template(payload.month, current_user, db)
