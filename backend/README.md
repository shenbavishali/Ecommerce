# AJIO Inspired Ecommerce Backend

Production-oriented FastAPI backend for the React ecommerce frontend, using MySQL as the only database.

All application data is read from and written to MySQL tables. The service does not use mock data, in-memory storage, SQLite, or PostgreSQL fallbacks.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Create a MySQL database and user:

```sql
CREATE DATABASE ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ecommerce_user'@'%' IDENTIFIED BY 'ecommerce_password';
GRANT ALL PRIVILEGES ON ecommerce.* TO 'ecommerce_user'@'%';
FLUSH PRIVILEGES;
```

Update `.env`:

```env
DATABASE_URL=mysql+pymysql://ecommerce_user:ecommerce_password@127.0.0.1:3306/ecommerce
SECRET_KEY=replace-with-a-long-random-production-secret
```

Run the API:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The app creates missing MySQL tables on startup and inserts no records automatically.

## Create Admin

After the MySQL schema exists, create the first admin user:

```powershell
python -m app.scripts.create_admin --email admin@yourstore.com --name "Store Admin"
```

Products should then be created through the admin product APIs.

## API Docs

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

## API Surface

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/products`
- `GET /api/v1/products/facets`
- `GET /api/v1/products/{product_id}`
- `GET /api/v1/search?q=...`
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{product_id}`
- `DELETE /api/v1/cart/items/{product_id}`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/{order_id}`
- `GET /api/v1/admin/products`
- `POST /api/v1/admin/products`
- `PATCH /api/v1/admin/products/{product_id}`
- `DELETE /api/v1/admin/products/{product_id}`
