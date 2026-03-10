# Arca's Yard Bakeshop - E-commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform for "Arca's Yard Bakeshop" with:
- Product catalog and shopping cart
- Guest checkout with delivery/pickup options
- Admin dashboard for managing products, orders, and store settings
- Secure admin authentication
- PayMongo payment integration
- Manual GCash QR payment with email notifications

## User Personas
- **Customer**: Browse products, add to cart, checkout with delivery/pickup
- **Admin**: Manage products, orders, store settings, view stats

## Core Requirements
1. Product Management (CRUD operations)
2. Order Management with status tracking
3. Store Settings (closed dates, time slots, QR code)
4. Secure admin authentication with bcrypt
5. PayMongo payment integration
6. Manual GCash QR payment option with store notification

## Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: PayMongo (LIVE keys), Manual GCash QR
- **Email**: Resend (for store notifications)
- **Auth**: bcrypt for password hashing

## What's Been Implemented
### Completed (as of Dec 2025)
- [x] Full product catalog with categories
- [x] Shopping cart with context state management
- [x] Multi-step checkout (delivery/pickup options)
- [x] Admin dashboard with tabs (Overview, Products, Orders, Store Settings, Storefront)
- [x] Secure admin login with bcrypt hashing
- [x] Password change functionality
- [x] Store settings (closed dates, time slots, QR code)
- [x] PayMongo payment link integration (LIVE keys)
- [x] Order management with status updates
- [x] Editable Storefront (Tagline, Categories)
- [x] Manual GCash QR payment option
- [x] Email notification to store when customer chooses manual payment

### Bug Fixes (Dec 2025)
- [x] Fixed `/api/store-settings` endpoint - function was incomplete
- [x] Made `/api/orders` endpoint resilient to missing fields
- [x] Fixed Storefront tab rendering issue

## Current Architecture
```
/app/
├── backend/
│   ├── .env (MongoDB, PayMongo keys, Resend key, Admin credentials)
│   ├── server.py (All API logic)
│   └── seed_data.py
└── frontend/
    ├── .env (REACT_APP_BACKEND_URL)
    └── src/
        ├── pages/ (Home, ProductDetail, Cart, Checkout, OrderConfirmation, AdminLogin, AdminDashboard)
        └── context/CartContext.js
```

## Key API Endpoints
- `GET /api/products` - List products
- `GET /api/orders` - List orders
- `GET /api/store-settings` - Get store settings
- `GET /api/storefront-settings` - Get storefront settings (tagline, categories)
- `POST /api/orders` - Create order + PayMongo link
- `POST /api/send-payment-email` - Send notification to store for manual payment
- `POST /api/paymongo/webhook` - Payment confirmation
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/change-password` - Change admin password
- `POST /api/categories` - Add category
- `DELETE /api/categories/{id}` - Delete category

## Payment Flow
### PayMongo (Online)
1. Customer places order
2. PayMongo link is generated
3. Customer pays via GCash/Maya/Card on PayMongo
4. Webhook confirms payment

### Manual GCash QR
1. Customer places order
2. Customer clicks "GCash QR" then "I'm Ready to Pay - Notify Store"
3. Email sent to arcasyardbakeshop@gmail.com with order details
4. Customer scans QR, pays, sends screenshot to store email
5. Store manually confirms payment

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Fix admin panel stability
- [x] Add manual GCash payment option
- [x] Email notification for manual payments

### P1 (High)
- [ ] **PayMongo Webhook Setup** - User must configure in PayMongo dashboard
  - URL: `https://<app-name>.emergent.host/api/paymongo/webhook`
  - Events: `link.payment.paid`

### P2 (Medium)
- [ ] Forgot Password functionality (domain verification needed for customer emails)
- [ ] Order status email notifications to customers

### P3 (Low/Future)
- [ ] SMS/WhatsApp notifications (Twilio)
- [ ] Location-based delivery fee calculation
- [ ] Two-Factor Authentication (2FA)

## Credentials
- **Admin Username**: arcasyardbakeshop
- **Admin Password**: Aybakeshop888***
- **MongoDB**: localhost:27017/test_database
- **PayMongo**: LIVE keys configured
- **Resend**: API key configured
- **Store Email**: arcasyardbakeshop@gmail.com
