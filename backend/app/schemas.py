from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ProductBase(BaseModel):
    sku: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)
    brand: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=120)
    subcategory: str | None = None
    gender: str | None = None
    color: str | None = None
    size: str | None = None
    price: float = Field(gt=0)
    mrp: float = Field(gt=0)
    discount_percent: int = Field(default=0, ge=0, le=95)
    rating: float = Field(default=0, ge=0, le=5)
    inventory: int = Field(default=0, ge=0)
    image_url: str
    description: str = Field(min_length=10)
    is_active: bool = True
    warranty_months: int = Field(default=0, ge=0, le=120)
    warranty_terms: str | None = ""
    replacement_days: int = Field(default=0, ge=0, le=365)
    warranty_card_enabled: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=2, max_length=64)
    name: str | None = Field(default=None, min_length=2, max_length=255)
    brand: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = Field(default=None, min_length=1, max_length=120)
    subcategory: str | None = None
    gender: str | None = None
    color: str | None = None
    size: str | None = None
    price: float | None = Field(default=None, gt=0)
    mrp: float | None = Field(default=None, gt=0)
    discount_percent: int | None = Field(default=None, ge=0, le=95)
    rating: float | None = Field(default=None, ge=0, le=5)
    inventory: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    description: str | None = Field(default=None, min_length=10)
    is_active: bool | None = None
    warranty_months: int | None = Field(default=None, ge=0, le=120)
    warranty_terms: str | None = None
    replacement_days: int | None = Field(default=None, ge=0, le=365)
    warranty_card_enabled: bool | None = None


class StockAdjustment(BaseModel):
    quantity: int = Field(gt=0, le=100000)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def image(self) -> str:
        return self.image_url


class ProductList(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int


class Facets(BaseModel):
    categories: list[str]
    brands: list[str]
    colors: list[str]
    sizes: list[str]


class GroceryMasterCreate(BaseModel):
    product_id: int
    unit: str = Field(default="pcs", max_length=20)
    default_qty: float = Field(default=1, gt=0)


class GroceryMasterUpdate(BaseModel):
    unit: str | None = Field(default=None, max_length=20)
    default_qty: float | None = Field(default=None, gt=0)


class GroceryMasterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    unit: str
    default_qty: float
    product: ProductRead


class MonthlyGroceryTemplateItem(BaseModel):
    grocery_master_id: int
    is_required: bool = True
    qty: float = Field(default=1, gt=0)
    price: float = Field(default=0, ge=0)


class MonthlyGroceryTemplateAddItem(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    grocery_master_id: int
    is_required: bool = True


class MonthlyGroceryTemplateSave(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    items: list[MonthlyGroceryTemplateItem]


class DeliverySlotBase(BaseModel):
    day_label: str = Field(min_length=2, max_length=40)
    start_time: str = Field(min_length=4, max_length=10)
    end_time: str = Field(min_length=4, max_length=10)
    capacity: int = Field(default=0, ge=0)
    price: float = Field(default=0, ge=0)
    is_active: bool = True


class DeliverySlotCreate(DeliverySlotBase):
    pass


class DeliverySlotRead(DeliverySlotBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)
    selected_option: str | None = Field(default=None, max_length=120)
    selected_price: float | None = Field(default=None, gt=0)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    selected_option: str | None = None
    selected_price: float | None = None
    product: ProductRead
    line_total: float = 0
    unit_price: float = 0
    offer: dict | None = None


class CartRead(BaseModel):
    items: list[CartItemRead]
    subtotal: float
    delivery_fee: float
    total: float


class OrderCreate(BaseModel):
    shipping_address: str = Field(min_length=10)
    payment_method: str = "upi"
    delivery_slot_id: int | None = None
    discount_amount: float = Field(default=0, ge=0)
    coupon_code: str | None = Field(default=None, max_length=40)


class OrderCancelRequest(BaseModel):
    reason: str = Field(min_length=2, max_length=255)


class OrderCancellationUpdate(BaseModel):
    refund_days: int | None = Field(default=None, ge=1, le=30)
    cancellation_message: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(delivered|in_progress|shipped|packed|cancelled)$")


class OrderDeliveryBoyUpdate(BaseModel):
    delivery_boy_id: int | None = None


class DeliveryBoyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=30)
    area: str = Field(min_length=2, max_length=120)
    category_scope: str = Field(default="", max_length=255)


class DeliveryBoyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=5, max_length=30)
    area: str | None = Field(default=None, min_length=2, max_length=120)
    category_scope: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class DeliveryHubBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=120)
    state: str = Field(default="Tamilnadu", min_length=2, max_length=120)
    region: str = Field(pattern="^(east|north|south|west)$")
    pincode_prefixes: str = Field(min_length=1, max_length=500)
    base_delivery_days: int = Field(default=3, ge=1, le=14)
    fallback_extra_days: int = Field(default=2, ge=1, le=10)
    express_available: bool = False
    is_active: bool = True


class DeliveryHubCreate(DeliveryHubBase):
    pass


class DeliveryHubUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    state: str | None = Field(default=None, min_length=2, max_length=120)
    region: str | None = Field(default=None, pattern="^(east|north|south|west)$")
    pincode_prefixes: str | None = Field(default=None, min_length=1, max_length=500)
    base_delivery_days: int | None = Field(default=None, ge=1, le=14)
    fallback_extra_days: int | None = Field(default=None, ge=1, le=10)
    express_available: bool | None = None
    is_active: bool | None = None


class ProductHubStockUpdate(BaseModel):
    product_id: int
    hub_id: int
    quantity: int = Field(ge=0, le=1000000)


class SummerSaleOfferCreate(BaseModel):
    product_id: int
    offer_price: float | None = Field(default=None, gt=0)
    discount_percent: int = Field(default=0, ge=0, le=95)
    max_quantity_per_user: int = Field(default=2, ge=1, le=99)
    min_quantity: int = Field(default=1, ge=1, le=99)
    bundle_price: float | None = Field(default=None, gt=0)
    rule_description: str = Field(default="", max_length=255)
    is_active: bool = True


class SummerSaleOfferUpdate(BaseModel):
    product_id: int | None = None
    offer_price: float | None = Field(default=None, gt=0)
    discount_percent: int | None = Field(default=None, ge=0, le=95)
    max_quantity_per_user: int | None = Field(default=None, ge=1, le=99)
    min_quantity: int | None = Field(default=None, ge=1, le=99)
    bundle_price: float | None = Field(default=None, gt=0)
    rule_description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class SeasonalOfferBannerBase(BaseModel):
    offer_type: str = Field(pattern="^(summer|diwali|pongal)$")
    title: str = Field(min_length=2, max_length=120)
    subtitle: str = Field(default="", max_length=255)
    image_url: str = Field(min_length=1)
    accent_color: str = Field(default="#f97316", max_length=30)
    is_active: bool = True


class SeasonalOfferBannerCreate(SeasonalOfferBannerBase):
    pass


class SeasonalOfferBannerUpdate(BaseModel):
    offer_type: str | None = Field(default=None, pattern="^(summer|diwali|pongal)$")
    title: str | None = Field(default=None, min_length=2, max_length=120)
    subtitle: str | None = Field(default=None, max_length=255)
    image_url: str | None = Field(default=None, min_length=1)
    accent_color: str | None = Field(default=None, max_length=30)
    is_active: bool | None = None


class CouponBase(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=4000)
    discount: float = Field(gt=0)
    min_order: float = Field(gt=0)
    expires_at: datetime
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    title: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, min_length=2, max_length=4000)
    discount: float | None = Field(default=None, gt=0)
    min_order: float | None = Field(default=None, gt=0)
    expires_at: datetime | None = None
    is_active: bool | None = None


class DeliveryEstimateRequest(BaseModel):
    product_id: int
    pincode: str = Field(pattern=r"^\d{6}$")


class HelpRequestCreate(BaseModel):
    order_id: int | None = None
    issue_type: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=2, max_length=4000)


class HelpRequestResponse(BaseModel):
    admin_response: str = Field(min_length=2, max_length=4000)
    status: str = Field(default="answered", pattern="^(open|in_progress|answered|closed)$")


class ReturnRequestCreate(BaseModel):
    order_id: int
    order_item_id: int
    reason: str = Field(min_length=2, max_length=255)


class ReturnAdminUpdate(BaseModel):
    admin_message: str | None = None
    refund_days: int | None = Field(default=None, ge=1, le=30)
    pickup_delivery_boy_id: int | None = None
    status: str | None = Field(default=None, pattern="^(requested|message_sent|pickup_assigned|return_completed|refund_completed|amount_received)$")


class ProductReviewCreate(BaseModel):
    order_id: int | None = None
    order_number: str | None = None
    product_id: int
    product_name: str
    rating: int = Field(ge=1, le=5)
    feedback: str = Field(min_length=1, max_length=255)
    review: str = Field(min_length=1, max_length=4000)


class ProductReviewResponse(BaseModel):
    admin_response: str = Field(min_length=1, max_length=4000)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    line_total: float


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    status: str
    subtotal: float
    delivery_fee: float
    total: float
    shipping_address: str
    payment_method: str
    delivery_slot_id: int | None = None
    created_at: datetime
    items: list[OrderItemRead]
