from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin
from app.api.responses import api_response
from app.core.database import get_db
from app.models import Product, SeasonalOfferBanner, SummerSaleOffer, User
from app.schemas import SeasonalOfferBannerCreate, SeasonalOfferBannerUpdate, SummerSaleOfferCreate, SummerSaleOfferUpdate
from app.services.offers import offer_data

router = APIRouter()
OFFER_IMAGE_DIR = Path("static/offers")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def banner_data(banner: SeasonalOfferBanner) -> dict:
    return {
        "id": banner.id,
        "offer_type": banner.offer_type,
        "title": banner.title,
        "subtitle": banner.subtitle,
        "image_url": banner.image_url,
        "accent_color": banner.accent_color,
        "is_active": banner.is_active,
        "created_at": banner.created_at,
        "updated_at": banner.updated_at,
    }


@router.get("/summer-sale")
def list_active_summer_sale(db: Session = Depends(get_db)):
    offers = db.scalars(
        select(SummerSaleOffer)
        .where(SummerSaleOffer.is_active.is_(True))
        .options(selectinload(SummerSaleOffer.product))
        .order_by(desc(SummerSaleOffer.updated_at))
    ).all()
    return api_response([offer_data(offer) for offer in offers])


@router.get("/seasonal-banner")
def get_active_seasonal_banner(db: Session = Depends(get_db)):
    banner = db.scalar(
        select(SeasonalOfferBanner)
        .where(SeasonalOfferBanner.is_active.is_(True))
        .order_by(desc(SeasonalOfferBanner.updated_at))
    )
    return api_response(banner_data(banner) if banner else None)


@router.get("/admin/seasonal-banners")
def admin_list_seasonal_banners(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    banners = db.scalars(select(SeasonalOfferBanner).order_by(desc(SeasonalOfferBanner.updated_at))).all()
    return api_response([banner_data(banner) for banner in banners])


@router.post("/admin/seasonal-banners", status_code=status.HTTP_201_CREATED)
def admin_create_seasonal_banner(
    payload: SeasonalOfferBannerCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.scalar(select(SeasonalOfferBanner).where(SeasonalOfferBanner.offer_type == payload.offer_type))
    if existing is not None:
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return api_response(banner_data(existing), "Seasonal banner updated")

    banner = SeasonalOfferBanner(**payload.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return api_response(banner_data(banner), "Seasonal banner created")


@router.patch("/admin/seasonal-banners/{banner_id}")
def admin_update_seasonal_banner(
    banner_id: int,
    payload: SeasonalOfferBannerUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    banner = db.get(SeasonalOfferBanner, banner_id)
    if banner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seasonal banner not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(banner, key, value)
    db.commit()
    db.refresh(banner)
    return api_response(banner_data(banner), "Seasonal banner updated")


@router.post("/admin/seasonal-banners/{banner_id}/image")
async def admin_upload_seasonal_banner_image(
    banner_id: int,
    image: UploadFile = File(...),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    banner = db.get(SeasonalOfferBanner, banner_id)
    if banner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seasonal banner not found")

    suffix = Path(image.filename or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JPG, PNG, or WEBP banner image")

    OFFER_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{banner.offer_type}-{uuid4().hex}{suffix}"
    target = OFFER_IMAGE_DIR / filename
    target.write_bytes(await image.read())
    banner.image_url = f"/static/offers/{filename}"
    db.commit()
    db.refresh(banner)
    return api_response(banner_data(banner), "Seasonal banner image uploaded")


@router.get("/admin/summer-sale")
def admin_list_summer_sale(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    offers = db.scalars(
        select(SummerSaleOffer).options(selectinload(SummerSaleOffer.product)).order_by(desc(SummerSaleOffer.updated_at))
    ).all()
    return api_response([offer_data(offer) for offer in offers])


@router.post("/admin/summer-sale", status_code=status.HTTP_201_CREATED)
def admin_create_summer_sale_offer(
    payload: SummerSaleOfferCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    existing = db.scalar(select(SummerSaleOffer).where(SummerSaleOffer.product_id == payload.product_id))
    if existing is not None:
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        existing = db.scalar(
            select(SummerSaleOffer)
            .where(SummerSaleOffer.id == existing.id)
            .options(selectinload(SummerSaleOffer.product))
        )
        return api_response(offer_data(existing), "Summer Sale offer updated")
    offer = SummerSaleOffer(**payload.model_dump())
    db.add(offer)
    db.commit()
    offer = db.scalar(select(SummerSaleOffer).where(SummerSaleOffer.id == offer.id).options(selectinload(SummerSaleOffer.product)))
    return api_response(offer_data(offer), "Summer Sale offer created")


@router.patch("/admin/summer-sale/{offer_id}")
def admin_update_summer_sale_offer(
    offer_id: int,
    payload: SummerSaleOfferUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    offer = db.scalar(select(SummerSaleOffer).where(SummerSaleOffer.id == offer_id).options(selectinload(SummerSaleOffer.product)))
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Summer Sale offer not found")
    updates = payload.model_dump(exclude_unset=True)
    if "product_id" in updates and db.get(Product, updates["product_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    for key, value in updates.items():
        setattr(offer, key, value)
    db.commit()
    offer = db.scalar(select(SummerSaleOffer).where(SummerSaleOffer.id == offer_id).options(selectinload(SummerSaleOffer.product)))
    return api_response(offer_data(offer), "Summer Sale offer updated")
