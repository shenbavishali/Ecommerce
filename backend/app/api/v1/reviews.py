from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_current_user
from app.api.responses import api_response
from app.core.database import get_db
from app.models import Product, ProductReview, User
from app.schemas import ProductReviewCreate, ProductReviewResponse

router = APIRouter()


def review_data(review: ProductReview):
    return {
        "id": review.id,
        "productId": review.product_id,
        "productName": review.product_name,
        "orderId": review.order_id,
        "orderNumber": review.order_number,
        "rating": review.rating,
        "feedback": review.feedback,
        "review": review.review,
        "customerName": review.user.full_name,
        "customerEmail": review.user.email,
        "adminResponse": review.admin_response or "",
        "respondedAt": review.responded_at,
        "createdAt": review.created_at,
        "owner": f"user-{review.user_id}",
    }


@router.get("")
def list_reviews(product_id: int | None = None, db: Session = Depends(get_db)):
    statement = select(ProductReview).options(selectinload(ProductReview.user)).order_by(desc(ProductReview.created_at))
    if product_id is not None:
        statement = statement.where(ProductReview.product_id == product_id)

    return api_response([review_data(review) for review in db.scalars(statement).all()])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ProductReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = None
    if payload.order_id is not None:
        existing = db.scalar(
            select(ProductReview).where(
                ProductReview.user_id == current_user.id,
                ProductReview.order_id == payload.order_id,
                ProductReview.product_id == payload.product_id,
            )
        )

    if existing is not None:
        existing.rating = payload.rating
        existing.feedback = payload.feedback
        existing.review = payload.review
        db.commit()
        db.refresh(existing)
        return api_response(review_data(existing), "Review updated")

    review = ProductReview(
        user_id=current_user.id,
        order_id=payload.order_id,
        order_number=payload.order_number,
        product_id=payload.product_id,
        product_name=payload.product_name,
        rating=payload.rating,
        feedback=payload.feedback,
        review=payload.review,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return api_response(review_data(review), "Review submitted")


@router.patch("/{review_id}/response")
def respond_to_review(
    review_id: int,
    payload: ProductReviewResponse,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    review = db.scalar(select(ProductReview).where(ProductReview.id == review_id).options(selectinload(ProductReview.user)))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    from app.models import utc_now

    review.admin_response = payload.admin_response
    review.responded_at = utc_now()
    db.commit()
    db.refresh(review)
    return api_response(review_data(review), "Response sent")
