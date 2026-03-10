import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

sample_products = [
    {
        "id": "1",
        "name": "Classic Chocolate Cake",
        "description": "Rich and moist chocolate cake with velvety chocolate frosting. Perfect for any celebration!",
        "price": 850.00,
        "image_url": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
        "category": "cakes",
        "available": True
    },
    {
        "id": "2",
        "name": "Vanilla Birthday Cake",
        "description": "Light and fluffy vanilla cake with buttercream frosting. Customizable with your message!",
        "price": 750.00,
        "image_url": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80",
        "category": "cakes",
        "available": True
    },
    {
        "id": "3",
        "name": "Red Velvet Cake",
        "description": "Smooth red velvet layers with cream cheese frosting. A classic favorite!",
        "price": 950.00,
        "image_url": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&q=80",
        "category": "cakes",
        "available": True
    },
    {
        "id": "4",
        "name": "Ube Cake",
        "description": "Filipino favorite! Purple yam cake with ube halaya frosting.",
        "price": 900.00,
        "image_url": "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&q=80",
        "category": "cakes",
        "available": True
    },
    {
        "id": "5",
        "name": "Ensaymada",
        "description": "Soft and buttery brioche topped with butter, sugar, and cheese. Pack of 6.",
        "price": 180.00,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
        "category": "pastries",
        "available": True
    },
    {
        "id": "6",
        "name": "Cheese Rolls",
        "description": "Flaky pastry rolls filled with creamy cheese. Pack of 8.",
        "price": 200.00,
        "image_url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
        "category": "pastries",
        "available": True
    },
    {
        "id": "7",
        "name": "Pandesal",
        "description": "Traditional Filipino bread rolls. Soft and slightly sweet. Pack of 10.",
        "price": 50.00,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
        "category": "breads",
        "available": True
    },
    {
        "id": "8",
        "name": "Leche Flan",
        "description": "Creamy Filipino caramel custard. Perfect dessert for any occasion!",
        "price": 250.00,
        "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80",
        "category": "desserts",
        "available": True
    },
    {
        "id": "9",
        "name": "Strawberry Shortcake",
        "description": "Light sponge cake with fresh strawberries and whipped cream.",
        "price": 800.00,
        "image_url": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80",
        "category": "cakes",
        "available": True
    }
]

async def seed_database():
    print("Checking for existing products...")
    existing_count = await db.products.count_documents({})
    
    if existing_count > 0:
        print(f"Database already has {existing_count} products. Skipping seed.")
        return
    
    print("Seeding database with sample products...")
    result = await db.products.insert_many(sample_products)
    print(f"Successfully inserted {len(result.inserted_ids)} products!")

if __name__ == "__main__":
    asyncio.run(seed_database())
    client.close()
