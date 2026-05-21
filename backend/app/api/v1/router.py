from fastapi import APIRouter

from app.api.v1 import admin, auth, cart, coupons, delivery, grocery, help, offers, orders, products, reviews, search

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(coupons.router, prefix="/coupons", tags=["coupons"])
api_router.include_router(cart.router, prefix="/cart", tags=["cart"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(help.router, prefix="/help", tags=["help"])
api_router.include_router(offers.router, prefix="/offers", tags=["offers"])
api_router.include_router(delivery.router, prefix="/delivery", tags=["delivery"])
api_router.include_router(delivery.router, prefix="/slots", tags=["delivery"])
api_router.include_router(grocery.router, prefix="/grocery", tags=["grocery"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
