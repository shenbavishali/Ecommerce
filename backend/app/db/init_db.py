from datetime import datetime, timezone

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models import (
    ChatbotBranding,
    Coupon,
    DeliveryBoy,
    DeliveryHub,
    DeliverySlot,
    FaqQuestion,
    FaqTopic,
    Product,
    ProductHubStock,
    SeasonalOfferBanner,
    SummerSaleOffer,
)


DEFAULT_FAQS = [
    (
        "Loyalty Rewards",
        [
            ("How do I earn loyalty rewards?", "You earn reward points on eligible orders after they are delivered. Points may vary by product, offer, and order value."),
            ("How can I redeem my reward points?", "Open Loyalty Rewards from your account, check your available balance, and apply eligible points during checkout."),
            ("Do loyalty points expire?", "Reward points can expire based on campaign rules. Check the expiry details in the Loyalty Rewards section before checkout."),
        ],
    ),
    (
        "Shipping FAQs",
        [
            ("When will my order be delivered?", "Delivery time depends on your pincode, product availability, and selected delivery slot. You can see the estimate on the product page and checkout."),
            ("Can I change my delivery address after placing an order?", "Address changes are usually allowed only before the order is packed. Open Orders or Help & Support to request a change."),
            ("Why am I seeing a delivery charge?", "Delivery charges may apply based on order value, delivery slot, location, or offer eligibility. The final fee is shown before payment."),
        ],
    ),
    (
        "Account & Shopping",
        [
            ("How do I create an account?", "Tap Login, choose signup, enter your details, and complete email verification if prompted."),
            ("How do I search for products?", "Use the search bar or ask the assistant for a product name or brand, such as Amul or Paneer. Matching products will appear from the catalog."),
            ("How do I add products to cart?", "Open a product and choose Add to Cart. You can update quantity, remove items, and proceed to checkout from Cart."),
        ],
    ),
    (
        "JioBasket Wallet",
        [
            ("How can I use wallet balance?", "Wallet balance can be applied during checkout when it is available for your account and order type."),
            ("Where will my wallet refund appear?", "Eligible refunds are credited to your wallet or original payment method based on the order payment mode and refund rules."),
        ],
    ),
    (
        "Gift Card",
        [
            ("How do I use a gift card?", "Enter the gift card code during checkout if gift cards are enabled for your order. The eligible amount is deducted from the total."),
            ("How can I check gift card balance?", "Open Gift Card in your account or contact support with the gift card code details."),
        ],
    ),
    (
        "Cancellation FAQs",
        [
            ("How do I cancel an order?", "Open Orders, select the order, choose Cancel Order, pick a reason, and submit. Cancellation is usually available before packing or shipping."),
            ("When will I get a refund for a cancelled order?", "Refund timelines depend on the payment method. The expected refund status is shown on the cancelled order."),
        ],
    ),
    (
        "Returns FAQs",
        [
            ("How do I return an item?", "Open Orders, select a delivered order, choose Return for the eligible item, add the reason, and submit the request."),
            ("Why is my product not eligible for return?", "Some products may be non-returnable, outside the return window, or already used beyond policy limits. Check the product policy on the order."),
            ("How can I track return pickup?", "Return pickup status appears inside Orders. If the pickup is delayed, raise a Help & Support request from the order."),
        ],
    ),
    (
        "Payment FAQs",
        [
            ("What does opting for Cash on Delivery mean?", "Cash on Delivery lets you pay when the order reaches you. Availability depends on your pincode, cart value, and product eligibility."),
            ("What if the amount got debited but I did not receive an Order ID?", "If payment is debited and no order is created, wait a few minutes and check Orders. If it still does not appear, contact support with your payment reference."),
            ("Will I have to pay hidden costs like sales tax or other charges?", "No hidden charges are collected after checkout. Product price, delivery fee, discount, and applicable taxes are shown before you place the order."),
            ("What are the various modes of payment?", "You can pay using credit card, debit card, net banking, UPI, wallets, wallet balance, or Cash on Delivery where available. Payment options may vary by pincode and order value."),
            ("For Cash-on-Delivery orders, can I check the package before payment?", "You can check the package condition at delivery, but opening the product before payment may not be available for all orders."),
            ("Can I pay using international currency?", "Orders are billed in Indian Rupees. International cards may work only if supported by the payment provider."),
            ("What does convenience fee mean?", "A convenience fee is an additional charge applied for selected services, payment modes, or order types. It is shown before payment."),
        ],
    ),
    (
        "GST FAQs",
        [
            ("Can I get a GST invoice?", "GST invoice availability depends on seller and product eligibility. Invoice details are available after order placement."),
            ("Can I add GST details after placing an order?", "GST details should be added before placing the order. Post-order changes may not be supported."),
        ],
    ),
]


def create_mysql_schema() -> None:
    """Create missing MySQL tables without inserting any data."""
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()
    seed_delivery_slots()
    seed_delivery_boys()
    seed_delivery_hubs()
    seed_seasonal_offer_banners()
    seed_summer_sale_offers()
    seed_coupons()
    seed_chatbot_content()


def ensure_schema_updates() -> None:
    inspector = inspect(engine)
    with engine.begin() as connection:
        if inspector.has_table("users"):
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "is_verified" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOL NOT NULL DEFAULT 0"))
            if "last_login" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME NULL"))

        if inspector.has_table("orders"):
            order_columns = {column["name"] for column in inspector.get_columns("orders")}
            if "delivery_slot_id" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN delivery_slot_id INT NULL"))
            if "coupon_code" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) NULL"))
            if "delivery_boy_id" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN delivery_boy_id INT NULL"))
            if "cancel_reason" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(255) NULL"))
            if "refund_amount" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0"))
            if "refund_days" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN refund_days INT NULL"))
            if "cancellation_message" not in order_columns:
                connection.execute(text("ALTER TABLE orders ADD COLUMN cancellation_message TEXT NULL"))

        if inspector.has_table("delivery_hubs"):
            hub_columns = {column["name"] for column in inspector.get_columns("delivery_hubs")}
            if "region" not in hub_columns:
                connection.execute(text("ALTER TABLE delivery_hubs ADD COLUMN region VARCHAR(20) NULL"))
            if "pincode_prefixes" not in hub_columns:
                connection.execute(text("ALTER TABLE delivery_hubs ADD COLUMN pincode_prefixes TEXT NULL"))
            if "fallback_extra_days" not in hub_columns:
                connection.execute(text("ALTER TABLE delivery_hubs ADD COLUMN fallback_extra_days INT NOT NULL DEFAULT 2"))

        if inspector.has_table("delivery_boys"):
            delivery_boy_columns = {column["name"] for column in inspector.get_columns("delivery_boys")}
            if "category_scope" not in delivery_boy_columns:
                connection.execute(text("ALTER TABLE delivery_boys ADD COLUMN category_scope VARCHAR(255) NOT NULL DEFAULT ''"))

        if inspector.has_table("cart_items"):
            cart_item_columns = {column["name"] for column in inspector.get_columns("cart_items")}
            if "selected_option" not in cart_item_columns:
                connection.execute(text("ALTER TABLE cart_items ADD COLUMN selected_option VARCHAR(120) NULL"))
            if "selected_price" not in cart_item_columns:
                connection.execute(text("ALTER TABLE cart_items ADD COLUMN selected_price NUMERIC(10, 2) NULL"))

        if inspector.has_table("products"):
            product_columns = {column["name"] for column in inspector.get_columns("products")}
            if "warranty_months" not in product_columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN warranty_months INT NOT NULL DEFAULT 0"))
            if "warranty_terms" not in product_columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN warranty_terms TEXT NULL"))
            if "replacement_days" not in product_columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN replacement_days INT NOT NULL DEFAULT 0"))
            if "warranty_card_enabled" not in product_columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN warranty_card_enabled BOOL NOT NULL DEFAULT 0"))
            if "warranty_terms" in product_columns:
                connection.execute(text("UPDATE products SET warranty_terms = '' WHERE warranty_terms IS NULL"))

        if inspector.has_table("monthly_grocery_template"):
            monthly_indexes = {index["name"] for index in inspector.get_indexes("monthly_grocery_template")}
            if "uq_monthly_grocery_user_month_item" in monthly_indexes:
                connection.execute(text("ALTER TABLE monthly_grocery_template DROP INDEX uq_monthly_grocery_user_month_item"))


def seed_delivery_slots() -> None:
    db: Session = SessionLocal()
    try:
        exists = db.scalar(select(DeliverySlot.id).limit(1))
        if exists:
            return

        db.add_all(
            [
                DeliverySlot(day_label="Today", start_time="10:00", end_time="12:00", capacity=50, price=0),
                DeliverySlot(day_label="Today", start_time="12:00", end_time="14:00", capacity=50, price=0),
                DeliverySlot(day_label="Today", start_time="14:00", end_time="16:00", capacity=50, price=0),
                DeliverySlot(day_label="Today", start_time="16:00", end_time="18:00", capacity=50, price=0),
            ]
        )
        db.commit()
    finally:
        db.close()


def seed_delivery_boys() -> None:
    db: Session = SessionLocal()
    try:
        default_agents = [
            {
                "name": "Expressbees",
                "phone": "+91 90000 10001",
                "area": "Fast grocery and home essentials courier",
                "category_scope": "Grocery, Groceries, Fruits, Vegetables, Dairy, Home Care",
            },
            {
                "name": "Professional Courier",
                "phone": "+91 90000 10002",
                "area": "Fashion and apparel courier",
                "category_scope": "Fashion, Dresses, Dress, Clothing, Apparel, Footwear",
            },
            {
                "name": "ST Courier",
                "phone": "+91 90000 10003",
                "area": "Electronics and appliances courier",
                "category_scope": "Electronics, TV, AC, Laptop, Appliances, Mobiles, Audio, Refrigerator, Washing Machine",
            },
            {
                "name": "Delhivery",
                "phone": "+91 90000 10004",
                "area": "General fallback courier",
                "category_scope": "General, Other, Household",
            },
        ]

        for agent in default_agents:
            delivery_boy = db.scalar(select(DeliveryBoy).where(DeliveryBoy.phone == agent["phone"]))
            if delivery_boy is None:
                db.add(DeliveryBoy(**agent, is_active=True))
            else:
                for key, value in agent.items():
                    setattr(delivery_boy, key, value)
                delivery_boy.is_active = True
        default_phones = {agent["phone"] for agent in default_agents}
        extra_active_agents = db.scalars(
            select(DeliveryBoy).where(DeliveryBoy.is_active.is_(True), DeliveryBoy.phone.notin_(default_phones))
        ).all()
        for delivery_boy in extra_active_agents:
            delivery_boy.is_active = False
        db.commit()
    finally:
        db.close()


def seed_delivery_hubs() -> None:
    db: Session = SessionLocal()
    try:
        existing_hubs = list(db.scalars(select(DeliveryHub)).all())
        target_regions = {"east", "north", "south", "west"}
        active_hubs = [hub for hub in existing_hubs if hub.is_active]
        if (
            len(active_hubs) == 4
            and {hub.region for hub in active_hubs if hub.region} == target_regions
            and all(hub.state == "Tamilnadu" for hub in active_hubs)
        ):
            seed_product_hub_stock(db)
            return

        for hub in existing_hubs:
            hub.is_active = False

        db.add_all(
            [
                DeliveryHub(name="Tamilnadu East Hub", city="Chennai", state="Tamilnadu", region="east", pincode_prefix="600", pincode_prefixes="600,601,602,603,604,605,606,607,608,609", base_delivery_days=2, fallback_extra_days=2, express_available=True),
                DeliveryHub(name="Tamilnadu North Hub", city="Vellore", state="Tamilnadu", region="north", pincode_prefix="631", pincode_prefixes="610,611,612,613,614,631,632,635,636", base_delivery_days=2, fallback_extra_days=2, express_available=True),
                DeliveryHub(name="Tamilnadu South Hub", city="Madurai", state="Tamilnadu", region="south", pincode_prefix="625", pincode_prefixes="623,624,625,626,627,628,629,630", base_delivery_days=3, fallback_extra_days=2, express_available=False),
                DeliveryHub(name="Tamilnadu West Hub", city="Coimbatore", state="Tamilnadu", region="west", pincode_prefix="641", pincode_prefixes="638,639,640,641,642,643", base_delivery_days=2, fallback_extra_days=2, express_available=True),
            ]
        )
        db.commit()
        seed_product_hub_stock(db)
    finally:
        db.close()


def seed_product_hub_stock(db: Session) -> None:
    hubs = list(db.scalars(select(DeliveryHub).where(DeliveryHub.is_active.is_(True))).all())
    products = list(db.scalars(select(Product)).all())
    for product in products:
        for hub in hubs:
            exists = db.scalar(
                select(ProductHubStock.id).where(ProductHubStock.product_id == product.id, ProductHubStock.hub_id == hub.id)
            )
            if exists is None:
                db.add(ProductHubStock(product_id=product.id, hub_id=hub.id, quantity=product.inventory))
    db.commit()


def seed_summer_sale_offers() -> None:
    db: Session = SessionLocal()
    try:
        exists = db.scalar(select(SummerSaleOffer.id).limit(1))
        if exists:
            return
        products = list(db.scalars(select(Product).where(Product.is_active.is_(True)).order_by(Product.id).limit(2)).all())
        for product in products:
            db.add(
                SummerSaleOffer(
                    product_id=product.id,
                    offer_price=round(float(product.price) * 0.85, 2),
                    discount_percent=15,
                    max_quantity_per_user=2,
                    min_quantity=1,
                    rule_description=f"Great Summer Sale: max 2 units per user for {product.name}",
                    is_active=True,
                )
            )
        db.commit()
    finally:
        db.close()


def seed_seasonal_offer_banners() -> None:
    db: Session = SessionLocal()
    try:
        exists = db.scalar(select(SeasonalOfferBanner.id).limit(1))
        if exists:
            return

        db.add_all(
            [
                SeasonalOfferBanner(
                    offer_type="summer",
                    title="Great Summer Sale",
                    subtitle="Cool savings for sunny days",
                    image_url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
                    accent_color="#f97316",
                    is_active=True,
                ),
                SeasonalOfferBanner(
                    offer_type="diwali",
                    title="Diwali Offer",
                    subtitle="Bright festive picks for every home",
                    image_url="https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?auto=format&fit=crop&w=1600&q=80",
                    accent_color="#f59e0b",
                    is_active=False,
                ),
                SeasonalOfferBanner(
                    offer_type="pongal",
                    title="Pongal Offer",
                    subtitle="Harvest season specials",
                    image_url="https://images.unsplash.com/photo-1603569283847-aa295f0d016a?auto=format&fit=crop&w=1600&q=80",
                    accent_color="#16a34a",
                    is_active=False,
                ),
            ]
        )
        db.commit()
    finally:
        db.close()


def seed_coupons() -> None:
    db: Session = SessionLocal()
    try:
        exists = db.scalar(select(Coupon.id).limit(1))
        if exists:
            return

        expires_at = datetime(2027, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        db.add_all(
            [
                Coupon(code="FRESH50", title="Fresh Saver", discount=50, min_order=499, description="Save Rs.50 on fruits, vegetables, and daily essentials.", expires_at=expires_at),
                Coupon(code="BASKET100", title="Basket Bonus", discount=100, min_order=999, description="Save Rs.100 on grocery baskets above Rs.999.", expires_at=expires_at),
                Coupon(code="MONTHLY150", title="Monthly Stock-Up", discount=150, min_order=1499, description="Save Rs.150 on large pantry orders.", expires_at=expires_at),
                Coupon(code="DAIRY40", title="Dairy Deal", discount=40, min_order=399, description="Save Rs.40 on milk, curd, paneer, and breakfast staples.", expires_at=expires_at),
                Coupon(code="SNACKS75", title="Snack Time", discount=75, min_order=699, description="Save Rs.75 on snacks, beverages, and treats.", expires_at=expires_at),
                Coupon(code="HOMECARE120", title="Home Care", discount=120, min_order=1199, description="Save Rs.120 on cleaning and household care.", expires_at=expires_at),
                Coupon(code="FIRSTBUY80", title="Welcome Saver", discount=80, min_order=799, description="Save Rs.80 on your next checkout.", expires_at=expires_at),
                Coupon(code="WEEKEND200", title="Weekend Cart", discount=200, min_order=2499, description="Save Rs.200 on weekend family shopping.", expires_at=expires_at),
            ]
        )
        db.commit()
    finally:
        db.close()


def seed_chatbot_content() -> None:
    db: Session = SessionLocal()
    try:
        branding = db.scalar(select(ChatbotBranding).limit(1))
        if branding is None:
            db.add(ChatbotBranding(company_name="JioBasket", logo_url=""))

        exists = db.scalar(select(FaqTopic.id).limit(1))
        if exists:
            db.commit()
            return

        for topic_index, (title, questions) in enumerate(DEFAULT_FAQS):
            topic = FaqTopic(title=title, sort_order=topic_index, is_active=True)
            db.add(topic)
            db.flush()
            for question_index, (question, answer) in enumerate(questions):
                db.add(
                    FaqQuestion(
                        topic_id=topic.id,
                        question=question,
                        answer=answer,
                        sort_order=question_index,
                        is_active=True,
                    )
                )
        db.commit()
    finally:
        db.close()
