from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.api.responses import api_response
from app.core.database import get_db
from app.models import HelpRequest, Order, User
from app.schemas import HelpRequestCreate
from app.services.help_content import help_content_data

router = APIRouter()


def ticket_number() -> str:
    return f"HELP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"


def help_request_data(request: HelpRequest) -> dict:
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
    }


@router.get("/content")
def help_content(db: Session = Depends(get_db)):
    return api_response(help_content_data(db))


@router.get("")
def list_help_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = db.scalars(
        select(HelpRequest)
        .where(HelpRequest.user_id == current_user.id)
        .options(selectinload(HelpRequest.order))
        .order_by(desc(HelpRequest.created_at))
    ).all()
    return api_response([help_request_data(request) for request in requests])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_help_request(
    payload: HelpRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = None
    if payload.order_id is not None:
        order = db.scalar(select(Order).where(Order.id == payload.order_id, Order.user_id == current_user.id))
        if order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    request = HelpRequest(
        ticket_number=ticket_number(),
        user_id=current_user.id,
        order_id=order.id if order else None,
        issue_type=payload.issue_type,
        message=payload.message,
    )
    db.add(request)
    db.commit()
    request = db.scalar(
        select(HelpRequest)
        .where(HelpRequest.id == request.id)
        .options(selectinload(HelpRequest.order))
    )
    return api_response(help_request_data(request), "Help request submitted")
