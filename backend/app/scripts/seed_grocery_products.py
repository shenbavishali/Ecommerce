from sqlalchemy import select

from app.core.database import SessionLocal
from app.db.init_db import create_mysql_schema
from app.models import DeliveryHub, Product, ProductHubStock
from app.services.products import unique_slug


GROCERY_PRODUCTS = [
    {
        "sku": "GROC-MADHUR-SUGAR-5KG",
        "name": "Madhur Pure Sugar 5 kg",
        "brand": "Madhur",
        "category": "Grocery",
        "subcategory": "Salt and Sugar",
        "size": "5 kg",
        "price": 245,
        "mrp": 285,
        "discount_percent": 14,
        "rating": 4.4,
        "inventory": 140,
        "image_url": "https://image.cdn.shpy.in/22879/madhur-pure-hygienic-sugar-5kg-1722256151965_SKU-2589_0.webp?format=webp",
        "description": "Fine grain pure sugar for tea, coffee, sweets, baking, and everyday kitchen use.",
    },
    {
        "sku": "GROC-TATA-TEA-1KG",
        "name": "Tata Tea Premium 1 kg",
        "brand": "Tata Tea",
        "category": "Grocery",
        "subcategory": "Tea and Coffee",
        "size": "1 kg",
        "price": 475,
        "mrp": 560,
        "discount_percent": 15,
        "rating": 4.6,
        "inventory": 90,
        "image_url": "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80",
        "description": "Strong and aromatic tea blend for refreshing daily chai at home.",
    },
    {
        "sku": "GROC-BRU-COFFEE-200G",
        "name": "Bru Instant Coffee 200 g",
        "brand": "Bru",
        "category": "Grocery",
        "subcategory": "Tea and Coffee",
        "size": "200 g",
        "price": 329,
        "mrp": 399,
        "discount_percent": 18,
        "rating": 4.3,
        "inventory": 75,
        "image_url": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80",
        "description": "Instant coffee with rich aroma and bold taste for hot or cold beverages.",
    },
    {
        "sku": "GROC-MAGGI-NOODLES-560G",
        "name": "Maggi 2-Minute Noodles 560 g",
        "brand": "Maggi",
        "category": "Grocery",
        "subcategory": "Instant Food",
        "size": "560 g",
        "price": 105,
        "mrp": 120,
        "discount_percent": 13,
        "rating": 4.5,
        "inventory": 180,
        "image_url": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
        "description": "Quick masala noodles pack for snacks, tiffin, and easy evening meals.",
    },
    {
        "sku": "GROC-PARLE-G-800G",
        "name": "Parle-G Original Biscuits 800 g",
        "brand": "Parle",
        "category": "Grocery",
        "subcategory": "Biscuits",
        "size": "800 g",
        "price": 92,
        "mrp": 110,
        "discount_percent": 16,
        "rating": 4.4,
        "inventory": 160,
        "image_url": "https://images.unsplash.com/photo-1590080874088-eec64895b423?auto=format&fit=crop&w=900&q=80",
        "description": "Classic glucose biscuits for tea time, snacks, and family pantry stocking.",
    },
    {
        "sku": "GROC-BRITANNIA-BREAD",
        "name": "Britannia Whole Wheat Bread 400 g",
        "brand": "Britannia",
        "category": "Grocery",
        "subcategory": "Bakery",
        "size": "400 g",
        "price": 55,
        "mrp": 60,
        "discount_percent": 8,
        "rating": 4.2,
        "inventory": 70,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
        "description": "Soft whole wheat bread for sandwiches, toast, breakfast, and quick snacks.",
    },
    {
        "sku": "GROC-AMUL-MILK-1L",
        "name": "Amul Taaza Toned Milk 1 L",
        "brand": "Amul",
        "category": "Grocery",
        "subcategory": "Dairy",
        "size": "1 L",
        "price": 68,
        "mrp": 72,
        "discount_percent": 6,
        "rating": 4.7,
        "inventory": 120,
        "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
        "description": "Toned milk for tea, coffee, cereal, cooking, and daily family use.",
    },
    {
        "sku": "GROC-AMUL-PANEER-200G",
        "name": "Amul Fresh Paneer 200 g",
        "brand": "Amul",
        "category": "Grocery",
        "subcategory": "Dairy",
        "size": "200 g",
        "price": 92,
        "mrp": 105,
        "discount_percent": 12,
        "rating": 4.5,
        "inventory": 85,
        "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
        "description": "Fresh paneer cubes for curries, starters, snacks, and protein-rich meals.",
    },
    {
        "sku": "GROC-SAFFOLA-OATS-1KG",
        "name": "Saffola Masala Oats 1 kg",
        "brand": "Saffola",
        "category": "Grocery",
        "subcategory": "Breakfast",
        "size": "1 kg",
        "price": 199,
        "mrp": 249,
        "discount_percent": 20,
        "rating": 4.3,
        "inventory": 95,
        "image_url": "https://www.bbassets.com/media/uploads/p/s/40220361_10-saffola-masala-oats-classic-masala.jpg",
        "description": "Savory oats for a quick breakfast bowl with fiber-rich everyday nutrition.",
    },
    {
        "sku": "GROC-KELLOGGS-CORN-475G",
        "name": "Kellogg's Corn Flakes 475 g",
        "brand": "Kellogg's",
        "category": "Grocery",
        "subcategory": "Breakfast",
        "size": "475 g",
        "price": 185,
        "mrp": 230,
        "discount_percent": 20,
        "rating": 4.4,
        "inventory": 100,
        "image_url": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?auto=format&fit=crop&w=900&q=80",
        "description": "Crispy corn flakes cereal for milk bowls, breakfast, and light snacks.",
    },
    {
        "sku": "GROC-TOOR-DAL-1KG",
        "name": "Tata Sampann Toor Dal 1 kg",
        "brand": "Tata Sampann",
        "category": "Grocery",
        "subcategory": "Pulses",
        "size": "1 kg",
        "price": 168,
        "mrp": 210,
        "discount_percent": 20,
        "rating": 4.5,
        "inventory": 130,
        "image_url": "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80",
        "description": "Protein-rich toor dal for sambar, dal fry, rasam, and daily Indian meals.",
    },
    {
        "sku": "GROC-MOONG-DAL-1KG",
        "name": "Organic Tattva Moong Dal 1 kg",
        "brand": "Organic Tattva",
        "category": "Grocery",
        "subcategory": "Pulses",
        "size": "1 kg",
        "price": 189,
        "mrp": 240,
        "discount_percent": 21,
        "rating": 4.2,
        "inventory": 110,
        "image_url": "https://organic-public.s3.us-west-1.amazonaws.com/product/4472d284-9f99-11ed-8884-0a520340c4c4/670d178b5a9743.25944261.jpg",
        "description": "Clean moong dal for khichdi, soups, sprouts, curries, and light meals.",
    },
    {
        "sku": "GROC-HALDIRAM-BHUJIA-400G",
        "name": "Haldiram's Bhujia Sev 400 g",
        "brand": "Haldiram's",
        "category": "Grocery",
        "subcategory": "Snacks",
        "size": "400 g",
        "price": 116,
        "mrp": 145,
        "discount_percent": 20,
        "rating": 4.4,
        "inventory": 125,
        "image_url": "https://www.bbassets.com/media/uploads/p/s/40128303_4-haldiram-bhujiawala-namkeen-bhujia.jpg",
        "description": "Crispy spicy bhujia sev for tea time, chaat toppings, and snack bowls.",
    },
    {
        "sku": "GROC-THUMS-UP-2L",
        "name": "Thums Up Soft Drink 2 L",
        "brand": "Thums Up",
        "category": "Grocery",
        "subcategory": "Beverages",
        "size": "2 L",
        "price": 95,
        "mrp": 110,
        "discount_percent": 14,
        "rating": 4.1,
        "inventory": 90,
        "image_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
        "description": "Strong fizzy cola drink for parties, meals, and chilled refreshment.",
    },
    {
        "sku": "GROC-SURF-EXCEL-2KG",
        "name": "Surf Excel Easy Wash Detergent 2 kg",
        "brand": "Surf Excel",
        "category": "Grocery",
        "subcategory": "Home Care",
        "size": "2 kg",
        "price": 235,
        "mrp": 299,
        "discount_percent": 21,
        "rating": 4.6,
        "inventory": 105,
        "image_url": "https://www.bbassets.com/media/uploads/p/s/40001002_10-surf-excel-quick-wash-detergent-powder.jpg",
        "description": "Detergent powder for everyday clothes with stain removal and fresh fragrance.",
    },
]


def upsert_grocery_products() -> tuple[int, int]:
    create_mysql_schema()
    db = SessionLocal()
    try:
        hubs = list(db.scalars(select(DeliveryHub).where(DeliveryHub.is_active.is_(True))).all())
        created = 0
        updated = 0

        for item in GROCERY_PRODUCTS:
            product = db.scalar(select(Product).where(Product.sku == item["sku"]))
            payload = {
                **item,
                "gender": None,
                "color": None,
                "is_active": True,
                "warranty_months": 0,
                "warranty_terms": "",
                "replacement_days": 0,
                "warranty_card_enabled": False,
            }
            if product is None:
                product = Product(**payload, slug=unique_slug(db, item["name"]))
                db.add(product)
                db.flush()
                created += 1
            else:
                for key, value in payload.items():
                    setattr(product, key, value)
                product.slug = unique_slug(db, item["name"], product.id)
                updated += 1

            for hub in hubs:
                stock = db.scalar(
                    select(ProductHubStock).where(
                        ProductHubStock.product_id == product.id,
                        ProductHubStock.hub_id == hub.id,
                    )
                )
                if stock is None:
                    db.add(ProductHubStock(product_id=product.id, hub_id=hub.id, quantity=product.inventory))
                else:
                    stock.quantity = product.inventory

        db.commit()
        return created, updated
    finally:
        db.close()


if __name__ == "__main__":
    created_count, updated_count = upsert_grocery_products()
    print(f"Seeded grocery products. Created: {created_count}, updated: {updated_count}, total batch: {len(GROCERY_PRODUCTS)}")
