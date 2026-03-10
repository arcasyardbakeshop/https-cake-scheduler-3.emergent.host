from fastapi import FastAPI, APIRouter, HTTPException, status, Request, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import qrcode
import io
import base64
import requests
import json
import hmac
import hashlib
import bcrypt
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# PayMongo Configuration
PAYMONGO_SECRET_KEY = os.environ.get('PAYMONGO_SECRET_KEY', '')
PAYMONGO_PUBLIC_KEY = os.environ.get('PAYMONGO_PUBLIC_KEY', '')
BAKESHOP_EMAIL = os.environ.get('BAKESHOP_EMAIL', '')
PAYMONGO_API_URL = "https://api.paymongo.com/v1"

# Admin Credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'arcasyardbakeshop')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Aybakeshop888')

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
STORE_EMAIL = 'arcasyardbakeshop@gmail.com'
resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    image_url: str
    category: str
    available: bool = True
    stock: int = 0  # 0 means unlimited/not tracked
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    image_url: str
    category: str
    available: bool = True
    stock: int = 0  # 0 means unlimited/not tracked

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    order_type: str  # "delivery" or "pickup"
    delivery_address: str
    delivery_distance: float
    delivery_fee: float
    delivery_date: str
    delivery_time: str
    items: List[OrderItem]
    total_amount: float
    subtotal: float
    notes: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    order_type: str  # "delivery" or "pickup"
    delivery_address: str
    delivery_distance: float
    delivery_fee: float
    delivery_date: str
    delivery_time: str
    items: List[OrderItem]
    total_amount: float
    subtotal: float
    notes: Optional[str] = None
    payment_status: str = "pending"
    order_status: str = "pending"
    qr_code_data: Optional[str] = None
    payment_link_url: Optional[str] = None
    paymongo_link_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class TimeSlot(BaseModel):
    slot: str
    enabled: bool = True

class StoreSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: "store_settings")
    closed_dates: List[str] = []
    recurring_closed_days: List[int] = []
    payment_qr_code_url: Optional[str] = None
    available_time_slots: List[TimeSlot] = [
        TimeSlot(slot="9:00 AM - 12:00 PM", enabled=True),
        TimeSlot(slot="12:00 PM - 3:00 PM", enabled=True),
        TimeSlot(slot="3:00 PM - 6:00 PM", enabled=True),
        TimeSlot(slot="6:00 PM - 9:00 PM", enabled=True)
    ]

class StoreSettingsUpdate(BaseModel):
    closed_dates: Optional[List[str]] = None
    recurring_closed_days: Optional[List[int]] = None
    payment_qr_code_url: Optional[str] = None
    paymaya_qr_code_url: Optional[str] = None
    available_time_slots: Optional[List[TimeSlot]] = None

# Storefront Settings Models
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    display_order: int = 0

class StorefrontSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: "storefront_settings")
    tagline: str = "Your local bakery, delivering happiness since 2023"
    categories: List[Category] = [
        Category(id="cat-cakes", name="Cakes", display_order=0),
        Category(id="cat-pastries", name="Pastries", display_order=1),
        Category(id="cat-breads", name="Breads", display_order=2),
        Category(id="cat-desserts", name="Desserts", display_order=3)
    ]

class StorefrontSettingsUpdate(BaseModel):
    tagline: Optional[str] = None
    categories: Optional[List[Category]] = None

class CategoryCreate(BaseModel):
    name: str

# Utility Functions
def generate_order_number() -> str:
    return f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

def generate_qr_code(order_data: dict) -> str:
    qr_content = f"Order #{order_data['order_number']}\nTotal: ₱{order_data['total_amount']:.2f}\nCustomer: {order_data['customer_name']}\nPhone: {order_data['customer_phone']}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(qr_content)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()
    
    base64_encoded = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/png;base64,{base64_encoded}"

def create_paymongo_payment_link(order_data: dict) -> dict:
    """Create a PayMongo payment link for the order"""
    try:
        # Convert amount to centavos (PayMongo uses smallest currency unit)
        amount_centavos = int(order_data['total_amount'] * 100)
        
        payload = {
            "data": {
                "attributes": {
                    "amount": amount_centavos,
                    "description": f"Order #{order_data['order_number']} - Arca's Yard Bakeshop",
                    "remarks": order_data['order_number'],
                    "payment_method_types": ["gcash", "paymaya", "card"]
                }
            }
        }
        
        # Make API call to PayMongo
        auth = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{PAYMONGO_API_URL}/links",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            link_data = data.get('data', {})
            attributes = link_data.get('attributes', {})
            
            return {
                "success": True,
                "link_id": link_data.get('id'),
                "checkout_url": attributes.get('checkout_url'),
                "reference_number": attributes.get('reference_number')
            }
        else:
            logger.error(f"PayMongo API error: {response.status_code} - {response.text}")
            return {"success": False, "error": "Failed to create payment link"}
    
    except Exception as e:
        logger.error(f"Error creating PayMongo link: {str(e)}")
        return {"success": False, "error": str(e)}

# Email Functions
async def send_manual_payment_notification(order_data: dict, qr_code_url: str, payment_method: str = "gcash"):
    """Send notification email to store owner when customer chooses manual payment"""
    payment_method_display = "GCash" if payment_method == "gcash" else "PayMaya"
    payment_color = "#007DFE" if payment_method == "gcash" else "#00B900"
    
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {payment_color}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9f7f4; padding: 30px; border-radius: 0 0 10px 10px; }}
                .order-details {{ background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }}
                .amount {{ font-size: 28px; color: #C65D3B; font-weight: bold; text-align: center; margin: 20px 0; }}
                .customer-info {{ background-color: #e8f4ea; padding: 15px; border-radius: 10px; margin: 20px 0; }}
                .items {{ background-color: white; padding: 15px; border-radius: 10px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New {payment_method_display} Payment</h1>
                    <p>A customer is paying via {payment_method_display} QR</p>
                </div>
                <div class="content">
                    <div class="amount">
                        Amount: ₱{order_data['total_amount']:.2f}
                    </div>
                    
                    <div class="order-details">
                        <h3>📋 Order Details</h3>
                        <p><strong>Order Number:</strong> {order_data['order_number']}</p>
                        <p><strong>Payment Method:</strong> {payment_method_display}</p>
                        <p><strong>Order Type:</strong> {order_data['order_type'].title()}</p>
                        <p><strong>Date:</strong> {order_data['delivery_date']}</p>
                        <p><strong>Time:</strong> {order_data['delivery_time']}</p>
                    </div>
                    
                    <div class="customer-info">
                        <h3>👤 Customer Information</h3>
                        <p><strong>Name:</strong> {order_data['customer_name']}</p>
                        <p><strong>Email:</strong> {order_data['customer_email']}</p>
                        <p><strong>Phone:</strong> {order_data['customer_phone']}</p>
                    </div>
                    
                    <div class="items">
                        <h3>🛒 Order Items</h3>
                        <ul>
                            {"".join(f"<li>{item.get('product_name', item.get('name', 'Item'))} x {item['quantity']} - ₱{item['price'] * item['quantity']:.2f}</li>" for item in order_data.get('items', []))}
                        </ul>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h4>⏳ Waiting for {payment_method_display} Payment</h4>
                        <p>The customer has been shown your {payment_method_display} QR code.</p>
                        <p>They should send a payment screenshot to this email.</p>
                        <p><strong>Look for a {payment_method_display} payment of ₱{order_data['total_amount']:.2f}</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": "Arca's Yard Orders <onboarding@resend.dev>",
            "to": [STORE_EMAIL],
            "subject": f"🔔 {payment_method_display} Payment - {order_data['order_number']} - ₱{order_data['total_amount']:.2f}",
            "html": html_content
        }
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Payment notification sent to store ({payment_method_display}), email_id: {email.get('id')}")
        return {"success": True, "email_id": email.get("id")}
    
    except Exception as e:
        logger.error(f"Failed to send payment notification: {str(e)}")
        return {"success": False, "error": str(e)}


async def send_customer_payment_email(order_data: dict, qr_code_url: str, payment_method: str = "gcash"):
    """Send payment instructions email to customer"""
    payment_method_display = "GCash" if payment_method == "gcash" else "PayMaya"
    payment_color = "#007DFE" if payment_method == "gcash" else "#00B900"
    
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {payment_color}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9f7f4; padding: 30px; border-radius: 0 0 10px 10px; }}
                .order-details {{ background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }}
                .amount {{ font-size: 28px; color: #C65D3B; font-weight: bold; text-align: center; margin: 20px 0; }}
                .qr-container {{ text-align: center; margin: 20px 0; }}
                .qr-code {{ max-width: 200px; border-radius: 10px; }}
                .instructions {{ background-color: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Arca's Yard Bakeshop</h1>
                    <p>{payment_method_display} Payment Instructions</p>
                </div>
                <div class="content">
                    <p>Hi <strong>{order_data['customer_name']}</strong>,</p>
                    <p>Thank you for your order! Please complete your payment using {payment_method_display}.</p>
                    
                    <div class="order-details">
                        <h3>📋 Order Details</h3>
                        <p><strong>Order Number:</strong> {order_data['order_number']}</p>
                        <p><strong>Order Type:</strong> {order_data['order_type'].title()}</p>
                        <p><strong>Date:</strong> {order_data['delivery_date']}</p>
                        <p><strong>Time:</strong> {order_data['delivery_time']}</p>
                    </div>
                    
                    <div class="amount">
                        Amount to Pay: ₱{order_data['total_amount']:.2f}
                    </div>
                    
                    <div class="qr-container">
                        <p><strong>Scan this QR code with {payment_method_display}:</strong></p>
                        <img src="{qr_code_url}" alt="{payment_method_display} QR Code" class="qr-code">
                    </div>
                    
                    <div class="instructions">
                        <h4>📱 How to Pay:</h4>
                        <ol>
                            <li>Open your <strong>{payment_method_display} app</strong></li>
                            <li>Tap <strong>"Scan QR"</strong></li>
                            <li>Scan the QR code above</li>
                            <li>Enter amount: <strong>₱{order_data['total_amount']:.2f}</strong></li>
                            <li>Add message: <strong>{order_data['order_number']}</strong></li>
                            <li>Complete the payment</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h4>✅ After Payment:</h4>
                        <p><strong>Reply to this email</strong> with a screenshot of your {payment_method_display} payment confirmation.</p>
                        <p>Or send it to: <strong>{STORE_EMAIL}</strong></p>
                        <p>We will confirm your order once we receive your payment proof.</p>
                    </div>
                    
                    <div class="footer">
                        <p>Questions? Reply to this email or contact us at {STORE_EMAIL}</p>
                        <p>© Arca's Yard Bakeshop</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": "Arca's Yard Bakeshop <onboarding@resend.dev>",
            "to": [order_data['customer_email']],
            "reply_to": STORE_EMAIL,
            "subject": f"Payment Instructions - Order #{order_data['order_number']} - {payment_method_display}",
            "html": html_content
        }
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Payment instructions sent to customer {order_data['customer_email']}, email_id: {email.get('id')}")
        return {"success": True, "email_id": email.get("id")}
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send customer email: {error_msg}")
        # Check if it's a domain verification error
        if "domain" in error_msg.lower() or "testing" in error_msg.lower() or "only send" in error_msg.lower():
            return {"success": False, "error": "domain_verification_required", "message": "Domain verification required to send customer emails"}
        return {"success": False, "error": error_msg}


# Product Endpoints
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None, available: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if available is not None:
        query["available"] = available
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        # Add default stock value for older products
        product.setdefault('stock', 0)
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    # Add default stock value for older products
    product.setdefault('stock', 0)
    
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_input: ProductCreate):
    product_dict = product_input.model_dump()
    product = Product(**product_dict)
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.products.insert_one(doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_input: ProductCreate):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_input.model_dump()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated_product.get('created_at'), str):
        updated_product['created_at'] = datetime.fromisoformat(updated_product['created_at'])
    
    return updated_product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Order Endpoints
MINIMUM_DELIVERY_ORDER = 300  # Minimum order amount for delivery

@api_router.post("/orders", response_model=Order)
async def create_order(order_input: OrderCreate):
    # Validate minimum order for delivery
    if order_input.order_type == "delivery" and order_input.subtotal < MINIMUM_DELIVERY_ORDER:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum order for delivery is ₱{MINIMUM_DELIVERY_ORDER}. Your order subtotal is ₱{order_input.subtotal:.2f}"
        )
    
    # Check stock availability for all items
    for item in order_input.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_name} not found")
        if not product.get("available", True):
            raise HTTPException(status_code=400, detail=f"Product {item.product_name} is not available")
        
        # Check stock if tracked (stock > 0 means tracked)
        product_stock = product.get("stock", 0)
        if product_stock > 0 and item.quantity > product_stock:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {item.product_name}. Only {product_stock} available."
            )
    
    # Reduce stock for all items
    for item in order_input.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        product_stock = product.get("stock", 0)
        if product_stock > 0:  # Only update if stock is tracked
            new_stock = product_stock - item.quantity
            await db.products.update_one(
                {"id": item.product_id},
                {"$set": {"stock": new_stock, "available": new_stock > 0}}
            )
    
    order_dict = order_input.model_dump()
    order_dict["order_number"] = generate_order_number()
    order_dict["payment_status"] = "pending"
    order_dict["order_status"] = "pending"
    
    order = Order(**order_dict)
    
    # Create PayMongo payment link
    payment_result = create_paymongo_payment_link(order.model_dump())
    
    if payment_result.get("success"):
        order.payment_link_url = payment_result.get("checkout_url")
        order.paymongo_link_id = payment_result.get("link_id")
        order.qr_code_data = None  # No QR code needed with PayMongo
    else:
        # Fallback to QR code if PayMongo fails
        settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
        if settings and settings.get("payment_qr_code_url"):
            order.qr_code_data = settings["payment_qr_code_url"]
        else:
            order.qr_code_data = generate_qr_code(order.model_dump())
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.orders.insert_one(doc)
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(order_status: Optional[str] = None, payment_status: Optional[str] = None):
    query = {}
    if order_status:
        query["order_status"] = order_status
    if payment_status:
        query["payment_status"] = payment_status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Normalize orders to handle missing fields from older documents
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        # Apply default values for fields that might be missing in older orders
        order.setdefault('order_type', 'delivery')
        order.setdefault('delivery_distance', 0)
        order.setdefault('delivery_fee', 150)
        order.setdefault('subtotal', order.get('total_amount', 0) - order.get('delivery_fee', 150))
        order.setdefault('notes', '')
        order.setdefault('payment_link_url', None)
        order.setdefault('paymongo_link_id', None)
        order.setdefault('qr_code_data', None)
    
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    # Apply default values for fields that might be missing in older orders
    order.setdefault('order_type', 'delivery')
    order.setdefault('delivery_distance', 0)
    order.setdefault('delivery_fee', 150)
    order.setdefault('subtotal', order.get('total_amount', 0) - order.get('delivery_fee', 150))
    order.setdefault('notes', '')
    order.setdefault('payment_link_url', None)
    order.setdefault('paymongo_link_id', None)
    order.setdefault('qr_code_data', None)
    
    return order

@api_router.patch("/orders/{order_id}", response_model=Order)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {}
    if status_update.order_status:
        update_data["order_status"] = status_update.order_status
    if status_update.payment_status:
        update_data["payment_status"] = status_update.payment_status
    
    if update_data:
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order.get('created_at'), str):
        updated_order['created_at'] = datetime.fromisoformat(updated_order['created_at'])
    
    return updated_order

# Admin Login
@api_router.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    """Admin login with simple password verification"""
    # Verify username
    if login_data.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password (simple comparison)
    if login_data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate secure token
    token = str(uuid.uuid4())
    
    return {
        "success": True,
        "token": token,
        "message": "Login successful",
        "username": login_data.username
    }

# Store Settings Endpoints
@api_router.get("/store-settings")
async def get_store_settings():
    settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    
    if not settings:
        default_settings = StoreSettings()
        doc = default_settings.model_dump()
        await db.store_settings.insert_one(doc)
        return default_settings
    return settings

# Change Admin Password
@api_router.post("/admin/change-password")
async def change_admin_password(password_data: PasswordChange):
    """Change admin password"""
    try:
        # Verify current password
        if password_data.current_password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Update .env file with new password
        env_path = Path(__file__).parent / '.env'
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        with open(env_path, 'w') as f:
            for line in lines:
                if line.startswith('ADMIN_PASSWORD='):
                    f.write(f'ADMIN_PASSWORD="{password_data.new_password}"\n')
                else:
                    f.write(line)
        
        logger.info("Admin password changed successfully")
        
        return {
            "success": True,
            "message": "Password changed successfully. Please restart backend to apply changes."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to change password")

@api_router.put("/store-settings")
async def update_store_settings(settings_update: StoreSettingsUpdate):
    settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    
    if not settings:
        new_settings = StoreSettings()
        if settings_update.closed_dates is not None:
            new_settings.closed_dates = settings_update.closed_dates
        if settings_update.recurring_closed_days is not None:
            new_settings.recurring_closed_days = settings_update.recurring_closed_days
        if settings_update.payment_qr_code_url is not None:
            new_settings.payment_qr_code_url = settings_update.payment_qr_code_url
        if settings_update.paymaya_qr_code_url is not None:
            new_settings.paymaya_qr_code_url = settings_update.paymaya_qr_code_url
        if settings_update.available_time_slots is not None:
            new_settings.available_time_slots = settings_update.available_time_slots
        
        doc = new_settings.model_dump()
        await db.store_settings.insert_one(doc)
        return new_settings
    
    update_data = {}
    if settings_update.closed_dates is not None:
        update_data["closed_dates"] = settings_update.closed_dates
    if settings_update.recurring_closed_days is not None:
        update_data["recurring_closed_days"] = settings_update.recurring_closed_days
    if settings_update.payment_qr_code_url is not None:
        update_data["payment_qr_code_url"] = settings_update.payment_qr_code_url
    if settings_update.paymaya_qr_code_url is not None:
        update_data["paymaya_qr_code_url"] = settings_update.paymaya_qr_code_url
    if settings_update.available_time_slots is not None:
        update_data["available_time_slots"] = [slot.model_dump() if hasattr(slot, 'model_dump') else slot for slot in settings_update.available_time_slots]
    
    if update_data:
        await db.store_settings.update_one(
            {"id": "store_settings"},
            {"$set": update_data}
        )
    
    updated_settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
    return updated_settings

# Storefront Settings Endpoints
@api_router.get("/storefront-settings")
async def get_storefront_settings():
    settings = await db.storefront_settings.find_one({"id": "storefront_settings"}, {"_id": 0})
    
    if not settings:
        default_settings = StorefrontSettings()
        doc = default_settings.model_dump()
        await db.storefront_settings.insert_one(doc)
        return default_settings
    return settings

@api_router.put("/storefront-settings")
async def update_storefront_settings(settings_update: StorefrontSettingsUpdate):
    settings = await db.storefront_settings.find_one({"id": "storefront_settings"}, {"_id": 0})
    
    if not settings:
        new_settings = StorefrontSettings()
        if settings_update.tagline is not None:
            new_settings.tagline = settings_update.tagline
        if settings_update.categories is not None:
            new_settings.categories = settings_update.categories
        
        doc = new_settings.model_dump()
        await db.storefront_settings.insert_one(doc)
        return new_settings
    
    update_data = {}
    if settings_update.tagline is not None:
        update_data["tagline"] = settings_update.tagline
    if settings_update.categories is not None:
        update_data["categories"] = [cat.model_dump() if hasattr(cat, 'model_dump') else cat for cat in settings_update.categories]
    
    if update_data:
        await db.storefront_settings.update_one(
            {"id": "storefront_settings"},
            {"$set": update_data}
        )
    
    updated_settings = await db.storefront_settings.find_one({"id": "storefront_settings"}, {"_id": 0})
    return updated_settings

@api_router.post("/categories")
async def add_category(category: CategoryCreate):
    """Add a new category"""
    settings = await db.storefront_settings.find_one({"id": "storefront_settings"}, {"_id": 0})
    
    if not settings:
        settings = StorefrontSettings().model_dump()
        await db.storefront_settings.insert_one(settings)
    
    categories = settings.get("categories", [])
    
    # Check if category already exists
    if any(cat["name"].lower() == category.name.lower() for cat in categories):
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_category = Category(
        name=category.name,
        display_order=len(categories)
    )
    
    categories.append(new_category.model_dump())
    
    await db.storefront_settings.update_one(
        {"id": "storefront_settings"},
        {"$set": {"categories": categories}}
    )
    
    return new_category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    settings = await db.storefront_settings.find_one({"id": "storefront_settings"}, {"_id": 0})
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    categories = settings.get("categories", [])
    original_len = len(categories)
    categories = [cat for cat in categories if cat["id"] != category_id]
    
    if len(categories) == original_len:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update display order
    for i, cat in enumerate(categories):
        cat["display_order"] = i
    
    await db.storefront_settings.update_one(
        {"id": "storefront_settings"},
        {"$set": {"categories": categories}}
    )
    
    return {"message": "Category deleted successfully"}

# Stats Endpoint
@api_router.get("/admin/stats")
async def get_admin_stats():
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    completed_orders = await db.orders.count_documents({"order_status": "completed"})
    total_products = await db.products.count_documents({})
    
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_products": total_products,
        "total_revenue": total_revenue
    }

# Send Manual Payment Email Endpoint
class SendPaymentEmailRequest(BaseModel):
    order_id: str
    payment_method: Optional[str] = "gcash"  # "gcash" or "paymaya"

@api_router.post("/send-payment-email")
async def send_payment_email_endpoint(request: SendPaymentEmailRequest):
    """Send payment notification to store owner AND payment instructions to customer"""
    try:
        # Get order
        order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get store settings for QR code
        settings = await db.store_settings.find_one({"id": "store_settings"}, {"_id": 0})
        
        # Get the appropriate QR code based on payment method
        if request.payment_method == "paymaya":
            qr_code_url = settings.get("paymaya_qr_code_url") if settings else None
        else:
            qr_code_url = settings.get("payment_qr_code_url") if settings else None
        
        if not qr_code_url:
            raise HTTPException(status_code=400, detail=f"{request.payment_method.upper()} QR code not configured")
        
        # Send notification to store owner
        store_result = await send_manual_payment_notification(order, qr_code_url, request.payment_method)
        
        # Send payment instructions to customer
        customer_result = await send_customer_payment_email(order, qr_code_url, request.payment_method)
        
        # Update order status
        update_data = {
            "payment_notification_sent": True, 
            "payment_notification_sent_at": datetime.now(timezone.utc).isoformat(),
            "payment_method_chosen": request.payment_method
        }
        
        if customer_result.get("success"):
            update_data["customer_email_sent"] = True
            update_data["customer_email_sent_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.orders.update_one(
            {"id": request.order_id},
            {"$set": update_data}
        )
        
        # Determine response message
        if store_result.get("success") and customer_result.get("success"):
            return {
                "success": True, 
                "message": "Payment instructions sent to your email! Store has been notified.",
                "customer_email_sent": True
            }
        elif store_result.get("success"):
            # Store email worked, but customer email failed (likely domain verification issue)
            customer_error = customer_result.get("error", "")
            if customer_error == "domain_verification_required":
                return {
                    "success": True, 
                    "message": "Store has been notified. Check the QR code below to pay.",
                    "customer_email_sent": False,
                    "note": "Customer email requires domain verification"
                }
            return {
                "success": True, 
                "message": "Store has been notified. Please proceed with payment.",
                "customer_email_sent": False
            }
        else:
            raise HTTPException(status_code=500, detail=store_result.get("error", "Failed to send notification"))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending payment notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# PayMongo Webhook Endpoint
@api_router.post("/paymongo/webhook")
async def paymongo_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle PayMongo webhook events for payment confirmation"""
    try:
        body = await request.body()
        webhook_data = json.loads(body)
        
        # Extract event data
        event_data = webhook_data.get("data", {})
        event_type = event_data.get("attributes", {}).get("type")
        
        logger.info(f"Received PayMongo webhook: {event_type}")
        
        # Handle link.payment.paid event
        if event_type == "link.payment.paid":
            resource = event_data.get("attributes", {}).get("data", {})
            link_id = resource.get("id")
            attributes = resource.get("attributes", {})
            remarks = attributes.get("remarks", "")  # This is the order number
            
            if remarks:
                # Find order by order number
                order = await db.orders.find_one({"order_number": remarks}, {"_id": 0})
                
                if order:
                    # Update order payment status
                    await db.orders.update_one(
                        {"order_number": remarks},
                        {
                            "$set": {
                                "payment_status": "paid",
                                "order_status": "confirmed"
                            }
                        }
                    )
                    
                    logger.info(f"Order {remarks} marked as paid")
                    
                    # TODO: Send email notification to bakeshop and customer
                    # This will be implemented next with email service
        
        return {"status": "received"}
    
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


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