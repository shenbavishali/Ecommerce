import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


def send_otp_email(to_email: str, otp: str) -> bool:
    settings = get_settings()
    if not settings.smtp_host:
        return False

    message = EmailMessage()
    message["Subject"] = "Your ecommerce verification OTP"
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(f"Your verification OTP is {otp}. It expires in {settings.otp_expire_minutes} minutes.")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(message)

    return True


def send_warranty_card_email(to_email: str, warranty_card: dict) -> bool:
    settings = get_settings()
    if not settings.smtp_host:
        return False

    message = EmailMessage()
    message["Subject"] = f"Warranty card for {warranty_card['product_name']}"
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(
        "\n".join(
            [
                f"Warranty Card: {warranty_card['card_number']}",
                f"Customer: {warranty_card['customer_name']}",
                f"Product: {warranty_card['product_name']}",
                f"Brand: {warranty_card['brand']}",
                f"Order: {warranty_card['order_number']}",
                f"Issued: {warranty_card['issued_at']}",
                f"Expires: {warranty_card['expires_at']}",
                "",
                warranty_card["terms"],
            ]
        )
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(message)

    return True
