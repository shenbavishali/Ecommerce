from datetime import datetime, timezone

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models import Coupon, DeliveryBoy, DeliveryHub, DeliverySlot, Product, ProductHubStock, SeasonalOfferBanner, SummerSaleOffer


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
