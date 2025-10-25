from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class Address(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    phone: str
    address_line: str
    city: str
    state: str
    pincode: str
    is_default: bool = False

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: str
    addresses: List[Address] = []
    is_admin: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    brand: str
    images: List[str]
    stock: int
    rating: float = 0.0
    reviews_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category: str
    brand: str
    images: List[str]
    stock: int

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    product_id: str
    rating: int
    comment: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    items: List[CartItem] = []
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    quantity: int
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    subtotal: float
    shipping: float
    discount: float
    total: float
    status: str = "ordered"  # ordered, processed, shipped, out_for_delivery, delivered, cancelled
    payment_method: str
    payment_status: str = "pending"  # pending, completed, failed
    shipping_address: Address
    tracking_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: Address
    payment_method: str
    discount_code: Optional[str] = None

class ReturnRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    user_id: str
    reason: str
    status: str = "requested"  # requested, approved, picked_up, refunded
    refund_amount: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReturnCreate(BaseModel):
    order_id: str
    reason: str

class Category(BaseModel):
    id: str
    name: str
    slug: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user.id})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.get("/auth/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    current_user.pop("password_hash", None)
    return current_user

@api_router.put("/auth/profile")
async def update_profile(name: str, phone: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"name": name, "phone": phone}}
    )
    return {"message": "Profile updated successfully"}

@api_router.post("/auth/address")
async def add_address(address: Address, current_user: dict = Depends(get_current_user)):
    # If this is the first address or marked as default, set all others to non-default
    if address.is_default:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"addresses.$[].is_default": False}}
        )
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$push": {"addresses": address.model_dump()}}
    )
    return {"message": "Address added successfully", "address": address}

@api_router.delete("/auth/address/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"addresses": {"id": address_id}}}
    )
    return {"message": "Address deleted successfully"}

# ============= PRODUCT ROUTES =============

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    sort_dict = {}
    if sort == "price_low":
        sort_dict["price"] = 1
    elif sort == "price_high":
        sort_dict["price"] = -1
    elif sort == "rating":
        sort_dict["rating"] = -1
    else:
        sort_dict["created_at"] = -1
    
    products = await db.products.find(query, {"_id": 0}).sort(list(sort_dict.items())).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    # Get unique categories from products
    categories = await db.products.distinct("category")
    return [{"id": cat, "name": cat, "slug": cat.lower().replace(" ", "-")} for cat in categories]

@api_router.post("/products/{product_id}/review")
async def add_review(product_id: str, review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    review = Review(
        user_id=current_user["id"],
        user_name=current_user["name"],
        product_id=product_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"message": "Review added successfully", "review": review}

@api_router.get("/products/{product_id}/reviews", response_model=List[Review])
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(1000)
    return reviews

# ============= CART ROUTES =============

@api_router.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart:
        return {"items": []}
    
    # Populate product details
    cart_items = []
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            cart_items.append({
                **item,
                "product": product
            })
    
    return {"items": cart_items}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    
    if not cart:
        cart = {"user_id": current_user["id"], "items": []}
        await db.carts.insert_one(cart)
    
    # Check if product already in cart
    existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
    
    if existing_item:
        await db.carts.update_one(
            {"user_id": current_user["id"], "items.product_id": item.product_id},
            {"$inc": {"items.$.quantity": item.quantity}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.carts.update_one(
            {"user_id": current_user["id"]},
            {"$push": {"items": item.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart(item: CartItem, current_user: dict = Depends(get_current_user)):
    if item.quantity == 0:
        await db.carts.update_one(
            {"user_id": current_user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": current_user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": []}}
    )
    return {"message": "Cart cleared"}

# ============= WISHLIST ROUTES =============

@api_router.get("/wishlist")
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not wishlist:
        return {"products": []}
    
    products = []
    for product_id in wishlist.get("product_ids", []):
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if product:
            products.append(product)
    
    return {"products": products}

@api_router.post("/wishlist/add/{product_id}")
async def add_to_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$addToSet": {"product_ids": product_id}},
        upsert=True
    )
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"product_ids": product_id}}
    )
    return {"message": "Removed from wishlist"}

# ============= ORDER ROUTES =============

@api_router.post("/orders/create")
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Build order items with product details
    order_items = []
    subtotal = 0.0
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if product["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        order_item = OrderItem(
            product_id=product["id"],
            product_name=product["name"],
            product_image=product["images"][0] if product["images"] else "",
            quantity=item.quantity,
            price=product["price"]
        )
        order_items.append(order_item)
        subtotal += product["price"] * item.quantity
    
    # Calculate totals
    shipping = 50.0 if subtotal < 500 else 0.0
    discount = 0.0
    if order_data.discount_code == "SAVE10":
        discount = subtotal * 0.1
    
    total = subtotal + shipping - discount
    
    # Create order
    order = Order(
        user_id=current_user["id"],
        items=order_items,
        subtotal=subtotal,
        shipping=shipping,
        discount=discount,
        total=total,
        payment_method=order_data.payment_method,
        shipping_address=order_data.shipping_address,
        tracking_id=f"TRK{uuid.uuid4().hex[:10].upper()}"
    )
    
    await db.orders.insert_one(order.model_dump())
    
    # Update product stock
    for item in order_items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock": -item.quantity}}
        )
    
    # Clear cart
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": []}}
    )
    
    return order

@api_router.post("/orders/{order_id}/payment")
async def process_payment(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Mock payment processing
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"payment_status": "completed", "status": "processed"}}
    )
    
    return {"message": "Payment successful", "order_id": order_id}

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ============= RETURN ROUTES =============

@api_router.post("/returns/create")
async def create_return(return_data: ReturnCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": return_data.order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != "delivered":
        raise HTTPException(status_code=400, detail="Only delivered orders can be returned")
    
    # Check if return window is valid (7 days)
    order_date = datetime.fromisoformat(order["created_at"])
    days_since_order = (datetime.now(timezone.utc) - order_date).days
    
    if days_since_order > 7:
        raise HTTPException(status_code=400, detail="Return window has expired")
    
    return_request = ReturnRequest(
        order_id=return_data.order_id,
        user_id=current_user["id"],
        reason=return_data.reason,
        refund_amount=order["total"]
    )
    
    await db.returns.insert_one(return_request.model_dump())
    
    # Update order status
    await db.orders.update_one(
        {"id": return_data.order_id},
        {"$set": {"status": "return_requested"}}
    )
    
    return return_request

@api_router.get("/returns", response_model=List[ReturnRequest])
async def get_returns(current_user: dict = Depends(get_current_user)):
    returns = await db.returns.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return returns

# ============= ADMIN ROUTES =============

@api_router.post("/admin/products")
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product = Product(**product_data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": product_data.model_dump()}
    )
    return {"message": "Product updated successfully"}

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted successfully"}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Order status updated"}

@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/admin/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_orders = await db.orders.count_documents({})
    total_revenue = sum([order["total"] for order in await db.orders.find({"payment_status": "completed"}).to_list(10000)])
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_products": total_products,
        "total_users": total_users
    }

# ============= SEED DATA =============

@api_router.post("/seed")
async def seed_data():
    # Check if data already exists
    existing_products = await db.products.count_documents({})
    if existing_products > 0:
        return {"message": "Database already seeded"}
    
    # Seed products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Wireless Headphones",
            "description": "High-quality noise-cancelling headphones with 30-hour battery life",
            "price": 2999.00,
            "original_price": 4999.00,
            "category": "Electronics",
            "brand": "SoundPro",
            "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"],
            "stock": 50,
            "rating": 4.5,
            "reviews_count": 120,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Smart Fitness Watch",
            "description": "Track your health and fitness with GPS and heart rate monitoring",
            "price": 1499.00,
            "original_price": 2499.00,
            "category": "Electronics",
            "brand": "FitTech",
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"],
            "stock": 100,
            "rating": 4.3,
            "reviews_count": 85,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Leather Laptop Bag",
            "description": "Professional leather bag with multiple compartments",
            "price": 3499.00,
            "category": "Fashion",
            "brand": "UrbanStyle",
            "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"],
            "stock": 30,
            "rating": 4.7,
            "reviews_count": 65,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Running Shoes",
            "description": "Comfortable running shoes with excellent cushioning",
            "price": 2499.00,
            "original_price": 3999.00,
            "category": "Fashion",
            "brand": "RunMax",
            "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"],
            "stock": 75,
            "rating": 4.6,
            "reviews_count": 200,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Coffee Maker Machine",
            "description": "Programmable coffee maker with thermal carafe",
            "price": 4999.00,
            "category": "Home & Kitchen",
            "brand": "BrewMaster",
            "images": ["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500"],
            "stock": 40,
            "rating": 4.4,
            "reviews_count": 95,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Yoga Mat Premium",
            "description": "Non-slip yoga mat with carrying strap",
            "price": 899.00,
            "category": "Sports",
            "brand": "ZenFit",
            "images": ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500"],
            "stock": 150,
            "rating": 4.8,
            "reviews_count": 180,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Wireless Gaming Mouse",
            "description": "Ergonomic gaming mouse with RGB lighting",
            "price": 1299.00,
            "category": "Electronics",
            "brand": "GameTech",
            "images": ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500"],
            "stock": 60,
            "rating": 4.5,
            "reviews_count": 110,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Backpack Travel",
            "description": "Durable travel backpack with USB charging port",
            "price": 1999.00,
            "category": "Fashion",
            "brand": "TravelPro",
            "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"],
            "stock": 80,
            "rating": 4.6,
            "reviews_count": 140,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.products.insert_many(products)
    
    # Create admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@shop.com",
        "password_hash": hash_password("admin123"),
        "name": "Admin User",
        "phone": "1234567890",
        "addresses": [],
        "is_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    
    return {"message": "Database seeded successfully", "products_count": len(products)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()