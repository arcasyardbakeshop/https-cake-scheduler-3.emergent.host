import requests
import sys
from datetime import datetime, timedelta
import json

class EcommerceAPITester:
    def __init__(self):
        self.base_url = "https://cake-scheduler-3.preview.emergentagent.com/api"
        self.admin_token = None
        self.test_product_id = None
        self.test_order_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_info = f"Expected {expected_status}, got {response.status_code}"
                if response.content:
                    try:
                        error_detail = response.json()
                        error_info += f", Response: {error_detail}"
                    except:
                        error_info += f", Response: {response.text[:200]}"
                
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "error": error_info
                })
                print(f"❌ Failed - {error_info}")
                return False, {}

        except Exception as e:
            error_msg = f"Error: {str(e)}"
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": error_msg
            })
            print(f"❌ Failed - {error_msg}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Authentication...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"Admin token received: {self.admin_token[:20]}...")
            return True
        return False

    def test_admin_login_invalid(self):
        """Test invalid admin login"""
        success, response = self.run_test(
            "Invalid Admin Login",
            "POST",
            "admin/login",
            401,
            data={"username": "admin", "password": "wrongpass"}
        )
        return success

    def test_get_products(self):
        """Test get all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        if success and isinstance(response, list):
            print(f"Found {len(response)} products")
            return True
        return False

    def test_get_products_by_category(self):
        """Test get products by category"""
        success, response = self.run_test(
            "Get Products by Category",
            "GET",
            "products?category=cakes",
            200
        )
        return success

    def test_create_product(self):
        """Test create product"""
        product_data = {
            "name": "Test Chocolate Cake",
            "description": "Delicious test chocolate cake",
            "price": 850.0,
            "image_url": "https://example.com/test-cake.jpg",
            "category": "cakes",
            "available": True
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.test_product_id = response['id']
            print(f"Created product ID: {self.test_product_id}")
            return True
        return False

    def test_get_single_product(self):
        """Test get single product"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Product",
            "GET",
            f"products/{self.test_product_id}",
            200
        )
        return success

    def test_update_product(self):
        """Test update product"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        update_data = {
            "name": "Updated Test Cake",
            "description": "Updated description",
            "price": 900.0,
            "image_url": "https://example.com/updated-cake.jpg",
            "category": "cakes",
            "available": True
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.test_product_id}",
            200,
            data=update_data
        )
        return success

    def test_create_order(self):
        """Test create order"""
        future_date = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')
        
        order_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "09171234567",
            "delivery_address": "123 Test Street, Test City",
            "delivery_date": future_date,
            "delivery_time": "9:00 AM - 12:00 PM",
            "items": [
                {
                    "product_id": self.test_product_id or "test-id",
                    "product_name": "Test Chocolate Cake",
                    "quantity": 2,
                    "price": 850.0
                }
            ],
            "total_amount": 1700.0,
            "notes": "Test order notes"
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.test_order_id = response['id']
            print(f"Created order ID: {self.test_order_id}")
            # Verify QR code was generated
            if 'qr_code_data' in response and response['qr_code_data']:
                print("✅ QR code generated successfully")
            else:
                print("⚠️ Warning: QR code not generated")
            return True
        return False

    def test_get_orders(self):
        """Test get all orders"""
        success, response = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        if success and isinstance(response, list):
            print(f"Found {len(response)} orders")
            return True
        return False

    def test_get_single_order(self):
        """Test get single order"""
        if not self.test_order_id:
            print("❌ Skipping - No test order ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Order",
            "GET",
            f"orders/{self.test_order_id}",
            200
        )
        return success

    def test_update_order_status(self):
        """Test update order status"""
        if not self.test_order_id:
            print("❌ Skipping - No test order ID available")
            return False
            
        status_data = {
            "order_status": "confirmed",
            "payment_status": "paid"
        }
        
        success, response = self.run_test(
            "Update Order Status",
            "PATCH",
            f"orders/{self.test_order_id}",
            200,
            data=status_data
        )
        return success

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        success, response = self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
        if success:
            expected_fields = ['total_orders', 'pending_orders', 'completed_orders', 'total_products', 'total_revenue']
            for field in expected_fields:
                if field not in response:
                    print(f"⚠️ Warning: Missing field {field} in stats response")
                else:
                    print(f"Stats {field}: {response[field]}")
            return True
        return False

    def test_delete_product(self):
        """Test delete product (cleanup)"""
        if not self.test_product_id:
            print("❌ Skipping - No test product ID available")
            return False
            
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{self.test_product_id}",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Ecommerce API Testing...")
        print(f"Backend URL: {self.base_url}")
        
        # Authentication tests
        self.test_admin_login()
        self.test_admin_login_invalid()
        
        # Product tests
        self.test_get_products()
        self.test_get_products_by_category()
        self.test_create_product()
        self.test_get_single_product()
        self.test_update_product()
        
        # Order tests
        self.test_create_order()
        self.test_get_orders()
        self.test_get_single_order()
        self.test_update_order_status()
        
        # Admin stats
        self.test_admin_stats()
        
        # Cleanup
        self.test_delete_product()
        
        # Print results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return self.tests_passed, self.tests_run, self.failed_tests

def main():
    tester = EcommerceAPITester()
    passed, total, failed = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())