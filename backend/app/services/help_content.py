from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import ChatbotBranding, FaqQuestion, FaqTopic


def branding_data(branding: ChatbotBranding | None) -> dict:
    return {
        "company_name": branding.company_name if branding else "JioBasket",
        "logo_url": branding.logo_url if branding else "",
    }


def faq_question_data(question: FaqQuestion) -> dict:
    return {
        "id": question.id,
        "topic_id": question.topic_id,
        "question": question.question,
        "answer": question.answer,
        "sort_order": question.sort_order,
        "is_active": question.is_active,
        "created_at": question.created_at,
        "updated_at": question.updated_at,
    }


def faq_topic_data(topic: FaqTopic, *, include_inactive_questions: bool = False) -> dict:
    questions = sorted(topic.questions, key=lambda item: (item.sort_order, item.id))
    if not include_inactive_questions:
        questions = [question for question in questions if question.is_active]
    return {
        "id": topic.id,
        "title": topic.title,
        "sort_order": topic.sort_order,
        "is_active": topic.is_active,
        "created_at": topic.created_at,
        "updated_at": topic.updated_at,
        "questions": [faq_question_data(question) for question in questions],
    }


def help_content_data(db: Session, *, include_inactive: bool = False) -> dict:
    branding = db.scalar(select(ChatbotBranding).order_by(ChatbotBranding.id).limit(1))
    query = select(FaqTopic).options(selectinload(FaqTopic.questions)).order_by(FaqTopic.sort_order, FaqTopic.id)
    if not include_inactive:
        query = query.where(FaqTopic.is_active.is_(True))
    topics = db.scalars(query).all()
    return {
        "branding": branding_data(branding),
        "topics": [
            faq_topic_data(topic, include_inactive_questions=include_inactive)
            for topic in topics
            if include_inactive or any(question.is_active for question in topic.questions)
        ],
    }
