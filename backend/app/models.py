from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, Enum):
    customer = "customer"
    admin = "admin"


class OrderStatus(str, Enum):
    placed = "placed"
    in_progress = "in_progress"
    confirmed = "confirmed"
    packed = "packed"
    shipped = "shipped"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), default=UserRole.customer.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    otps: Mapped[list["EmailOTP"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    product_reviews: Mapped[list["ProductReview"]] = relationship(back_populates="user")
    help_requests: Mapped[list["HelpRequest"]] = relationship(back_populates="user")


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_category_brand", "category", "brand"),
        Index("ix_products_price", "price"),
        Index("ix_products_search_fulltext", "name", "brand", "category", "description", mysql_prefix="FULLTEXT"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True, nullable=False)
    brand: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(120))
    gender: Mapped[str | None] = mapped_column(String(40), index=True)
    color: Mapped[str | None] = mapped_column(String(60), index=True)
    size: Mapped[str | None] = mapped_column(String(40), index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    mrp: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0, nullable=False)
    inventory: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    warranty_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warranty_terms: Mapped[str] = mapped_column(Text, default="", nullable=False)
    replacement_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warranty_card_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    reviews: Mapped[list["ProductReview"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    hub_stocks: Mapped[list["ProductHubStock"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    summer_sale_offer: Mapped["SummerSaleOffer | None"] = relationship(back_populates="product", cascade="all, delete-orphan")


class GroceryMaster(TimestampMixin, Base):
    __tablename__ = "grocery_master"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_grocery_master_user_product"),
        Index("ix_grocery_master_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="pcs", nullable=False)
    default_qty: Mapped[float] = mapped_column(Numeric(10, 2), default=1, nullable=False)

    product: Mapped[Product] = relationship()


class MonthlyGroceryTemplate(TimestampMixin, Base):
    __tablename__ = "monthly_grocery_template"
    __table_args__ = (
        Index("ix_monthly_grocery_user_month", "user_id", "month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    month: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    grocery_master_id: Mapped[int] = mapped_column(ForeignKey("grocery_master.id", ondelete="CASCADE"), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    qty: Mapped[float] = mapped_column(Numeric(10, 2), default=1, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    grocery_master: Mapped[GroceryMaster] = relationship()


class ProductReview(TimestampMixin, Base):
    __tablename__ = "product_reviews"
    __table_args__ = (
        Index("ix_product_reviews_product_created", "product_id", "created_at"),
        UniqueConstraint("user_id", "order_id", "product_id", name="uq_review_user_order_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    order_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str] = mapped_column(String(255), nullable=False)
    review: Mapped[str] = mapped_column(Text, nullable=False)
    admin_response: Mapped[str | None] = mapped_column(Text)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped[Product] = relationship(back_populates="reviews")
    user: Mapped[User] = relationship(back_populates="product_reviews")
    order: Mapped["Order | None"] = relationship()


class SummerSaleOffer(TimestampMixin, Base):
    __tablename__ = "summer_sale_offers"
    __table_args__ = (
        UniqueConstraint("product_id", name="uq_summer_sale_product"),
        Index("ix_summer_sale_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    offer_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    discount_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_quantity_per_user: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    min_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    bundle_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    rule_description: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped[Product] = relationship(back_populates="summer_sale_offer")


class SeasonalOfferBanner(TimestampMixin, Base):
    __tablename__ = "seasonal_offer_banners"
    __table_args__ = (
        UniqueConstraint("offer_type", name="uq_seasonal_offer_type"),
        Index("ix_seasonal_offer_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    offer_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    subtitle: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    accent_color: Mapped[str] = mapped_column(String(30), default="#f97316", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Coupon(TimestampMixin, Base):
    __tablename__ = "coupons"
    __table_args__ = (
        UniqueConstraint("code", name="uq_coupons_code"),
        Index("ix_coupons_active_expiry", "is_active", "expires_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    min_order: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CartItem(TimestampMixin, Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    selected_option: Mapped[str | None] = mapped_column(String(120), nullable=True)
    selected_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    user: Mapped[User] = relationship(back_populates="cart_items")
    product: Mapped[Product] = relationship(back_populates="cart_items")


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    status: Mapped[OrderStatus] = mapped_column(String(30), default=OrderStatus.placed.value, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    delivery_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    shipping_address: Mapped[str] = mapped_column(Text, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(40), default="upi", nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    delivery_slot_id: Mapped[int | None] = mapped_column(ForeignKey("delivery_slots.id"), nullable=True)
    delivery_boy_id: Mapped[int | None] = mapped_column(ForeignKey("delivery_boys.id"), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    refund_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cancellation_message: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    delivery_boy: Mapped["DeliveryBoy | None"] = relationship()


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="order_items")


class DeliveryBoy(TimestampMixin, Base):
    __tablename__ = "delivery_boys"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    area: Mapped[str] = mapped_column(String(120), nullable=False)
    category_scope: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class DeliveryHub(TimestampMixin, Base):
    __tablename__ = "delivery_hubs"
    __table_args__ = (
        UniqueConstraint("region", name="uq_delivery_hubs_region"),
        Index("ix_delivery_hubs_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str] = mapped_column(String(120), nullable=False)
    region: Mapped[str] = mapped_column(String(20), nullable=False)
    pincode_prefix: Mapped[str] = mapped_column(String(3), default="", nullable=False)
    pincode_prefixes: Mapped[str] = mapped_column(Text, nullable=False)
    base_delivery_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    fallback_extra_days: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    express_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product_stocks: Mapped[list["ProductHubStock"]] = relationship(back_populates="hub", cascade="all, delete-orphan")


class ProductHubStock(TimestampMixin, Base):
    __tablename__ = "product_hub_stock"
    __table_args__ = (
        UniqueConstraint("product_id", "hub_id", name="uq_product_hub_stock"),
        Index("ix_product_hub_stock_product", "product_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    hub_id: Mapped[int] = mapped_column(ForeignKey("delivery_hubs.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped[Product] = relationship(back_populates="hub_stocks")
    hub: Mapped[DeliveryHub] = relationship(back_populates="product_stocks")


class ReturnRequest(TimestampMixin, Base):
    __tablename__ = "return_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    refund_days: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="requested", nullable=False)
    admin_message: Mapped[str | None] = mapped_column(Text)
    pickup_delivery_boy_id: Mapped[int | None] = mapped_column(ForeignKey("delivery_boys.id"), nullable=True)

    order: Mapped[Order] = relationship()
    order_item: Mapped[OrderItem] = relationship()
    user: Mapped[User] = relationship()
    pickup_delivery_boy: Mapped["DeliveryBoy | None"] = relationship()


class HelpRequest(TimestampMixin, Base):
    __tablename__ = "help_requests"
    __table_args__ = (
        Index("ix_help_requests_user_created", "user_id", "created_at"),
        Index("ix_help_requests_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_number: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    issue_type: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="open", nullable=False)
    admin_response: Mapped[str | None] = mapped_column(Text)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="help_requests")
    order: Mapped["Order | None"] = relationship()


class DeliverySlot(TimestampMixin, Base):
    __tablename__ = "delivery_slots"
    __table_args__ = (Index("ix_delivery_slots_active_day", "is_active", "day_label"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    day_label: Mapped[str] = mapped_column(String(40), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class EmailOTP(TimestampMixin, Base):
    __tablename__ = "email_otps"
    __table_args__ = (Index("ix_email_otps_user_code", "user_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="otps")
