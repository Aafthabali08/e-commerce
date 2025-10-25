import requests
import sys
import json
from datetime import datetime

class ECommerceAPITester:
    def __init__(self, base_url="https://buy-sphere-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_product_id = None
        self.created_order_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add authentication if available
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Test seeding initial data"""
        print("\n🌱 Testing Data Seeding...")
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_authentication(self):
        """Test user authentication"""
        print("\n🔐 Testing Authentication...")
        
        # Test user registration
        test_user_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "name": "Test User",
            "phone": "1234567890"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
        
        # Test user login
        login_success, login_response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": test_user_data["email"], "password": test_user_data["password"]}
        )
        
        # Test admin login
        admin_success, admin_response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@shop.com", "password": "admin123"}
        )
        
        if admin_success and 'token' in admin_response:
            self.admin_token = admin_response['token']
            self.admin_id = admin_response['user']['id']
        
        # Test profile fetch
        if self.token:
            self.run_test(
                "Get User Profile",
                "GET",
                "auth/profile",
                200
            )
        
        return success and login_success and admin_success

    def test_products(self):
        """Test product-related APIs"""
        print("\n📦 Testing Product APIs...")
        
        # Test get all products
        self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        # Test get products with filters
        self.run_test(
            "Get Products by Category",
            "GET",
            "products?category=Electronics",
            200
        )
        
        self.run_test(
            "Get Products with Price Filter",
            "GET",
            "products?min_price=1000&max_price=5000",
            200
        )
        
        self.run_test(
            "Search Products",
            "GET",
            "products?search=headphones",
            200
        )
        
        # Test get categories
        self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        
        # Get a product ID for further testing
        success, products_response = self.run_test(
            "Get Products for Testing",
            "GET",
            "products",
            200
        )
        
        product_id = None
        if success and products_response and len(products_response) > 0:
            product_id = products_response[0]['id']
            
            # Test get single product
            self.run_test(
                "Get Single Product",
                "GET",
                f"products/{product_id}",
                200
            )
            
            # Test get product reviews
            self.run_test(
                "Get Product Reviews",
                "GET",
                f"products/{product_id}/reviews",
                200
            )
            
            # Test add review (requires authentication)
            if self.token:
                self.run_test(
                    "Add Product Review",
                    "POST",
                    f"products/{product_id}/review",
                    200,
                    data={"rating": 5, "comment": "Great product!"}
                )
        
        return product_id is not None

    def test_cart(self):
        """Test shopping cart APIs"""
        print("\n🛒 Testing Cart APIs...")
        
        if not self.token:
            print("❌ Skipping cart tests - no user token")
            return False
        
        # Get a product for cart testing
        success, products_response = self.run_test(
            "Get Products for Cart",
            "GET",
            "products",
            200
        )
        
        if not success or not products_response:
            return False
            
        product_id = products_response[0]['id']
        
        # Test add to cart
        self.run_test(
            "Add Item to Cart",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 2}
        )
        
        # Test get cart
        self.run_test(
            "Get Cart",
            "GET",
            "cart",
            200
        )
        
        # Test update cart
        self.run_test(
            "Update Cart Item",
            "PUT",
            "cart/update",
            200,
            data={"product_id": product_id, "quantity": 3}
        )
        
        # Test remove from cart
        self.run_test(
            "Remove Item from Cart",
            "DELETE",
            f"cart/remove/{product_id}",
            200
        )
        
        # Add item back for order testing
        self.run_test(
            "Add Item Back to Cart",
            "POST",
            "cart/add",
            200,
            data={"product_id": product_id, "quantity": 1}
        )
        
        return True

    def test_wishlist(self):
        """Test wishlist APIs"""
        print("\n❤️ Testing Wishlist APIs...")
        
        if not self.token:
            print("❌ Skipping wishlist tests - no user token")
            return False
        
        # Get a product for wishlist testing
        success, products_response = self.run_test(
            "Get Products for Wishlist",
            "GET",
            "products",
            200
        )
        
        if not success or not products_response:
            return False
            
        product_id = products_response[0]['id']
        
        # Test add to wishlist
        self.run_test(
            "Add to Wishlist",
            "POST",
            f"wishlist/add/{product_id}",
            200
        )
        
        # Test get wishlist
        self.run_test(
            "Get Wishlist",
            "GET",
            "wishlist",
            200
        )
        
        # Test remove from wishlist
        self.run_test(
            "Remove from Wishlist",
            "DELETE",
            f"wishlist/remove/{product_id}",
            200
        )
        
        return True

    def test_address_management(self):
        """Test address management"""
        print("\n🏠 Testing Address Management...")
        
        if not self.token:
            print("❌ Skipping address tests - no user token")
            return False
        
        # Test add address
        address_data = {
            "full_name": "Test User",
            "phone": "1234567890",
            "address_line": "123 Test Street",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456",
            "is_default": True
        }
        
        success, response = self.run_test(
            "Add Address",
            "POST",
            "auth/address",
            200,
            data=address_data
        )
        
        if success and 'address' in response:
            address_id = response['address']['id']
            
            # Test delete address
            self.run_test(
                "Delete Address",
                "DELETE",
                f"auth/address/{address_id}",
                200
            )
        
        return success

    def test_orders(self):
        """Test order management"""
        print("\n📋 Testing Order APIs...")
        
        if not self.token:
            print("❌ Skipping order tests - no user token")
            return False
        
        # First add address for shipping
        address_data = {
            "full_name": "Test User",
            "phone": "1234567890",
            "address_line": "123 Test Street",
            "city": "Test City",
            "state": "Test State",
            "pincode": "123456",
            "is_default": True
        }
        
        addr_success, addr_response = self.run_test(
            "Add Address for Order",
            "POST",
            "auth/address",
            200,
            data=address_data
        )
        
        if not addr_success:
            return False
        
        # Get products for order
        success, products_response = self.run_test(
            "Get Products for Order",
            "GET",
            "products",
            200
        )
        
        if not success or not products_response:
            return False
            
        product_id = products_response[0]['id']
        
        # Create order
        order_data = {
            "items": [{"product_id": product_id, "quantity": 1}],
            "shipping_address": addr_response['address'],
            "payment_method": "upi",
            "discount_code": "SAVE10"
        }
        
        order_success, order_response = self.run_test(
            "Create Order",
            "POST",
            "orders/create",
            200,
            data=order_data
        )
        
        if order_success and 'id' in order_response:
            self.created_order_id = order_response['id']
            
            # Test payment processing
            self.run_test(
                "Process Payment",
                "POST",
                f"orders/{self.created_order_id}/payment",
                200
            )
            
            # Test get orders
            self.run_test(
                "Get User Orders",
                "GET",
                "orders",
                200
            )
            
            # Test get single order
            self.run_test(
                "Get Single Order",
                "GET",
                f"orders/{self.created_order_id}",
                200
            )
        
        return order_success

    def test_returns(self):
        """Test return system"""
        print("\n🔄 Testing Return System...")
        
        if not self.token or not self.created_order_id:
            print("❌ Skipping return tests - no order to return")
            return False
        
        # First update order status to delivered (admin action)
        if self.admin_token:
            self.run_test(
                "Update Order to Delivered",
                "PUT",
                f"admin/orders/{self.created_order_id}/status",
                200,
                headers={'Authorization': f'Bearer {self.admin_token}'},
                use_admin=True
            )
        
        # Test create return request
        return_data = {
            "order_id": self.created_order_id,
            "reason": "Product not as expected"
        }
        
        self.run_test(
            "Create Return Request",
            "POST",
            "returns/create",
            200,
            data=return_data
        )
        
        # Test get returns
        self.run_test(
            "Get User Returns",
            "GET",
            "returns",
            200
        )
        
        return True

    def test_admin_apis(self):
        """Test admin-specific APIs"""
        print("\n👑 Testing Admin APIs...")
        
        if not self.admin_token:
            print("❌ Skipping admin tests - no admin token")
            return False
        
        # Test admin analytics
        self.run_test(
            "Get Admin Analytics",
            "GET",
            "admin/analytics",
            200,
            use_admin=True
        )
        
        # Test get all orders (admin)
        self.run_test(
            "Get All Orders (Admin)",
            "GET",
            "admin/orders",
            200,
            use_admin=True
        )
        
        # Test create product
        product_data = {
            "name": "Test Product",
            "description": "A test product for API testing",
            "price": 999.99,
            "original_price": 1299.99,
            "category": "Electronics",
            "brand": "TestBrand",
            "images": ["https://via.placeholder.com/300"],
            "stock": 10
        }
        
        create_success, create_response = self.run_test(
            "Create Product (Admin)",
            "POST",
            "admin/products",
            200,
            data=product_data,
            use_admin=True
        )
        
        if create_success and 'id' in create_response:
            self.created_product_id = create_response['id']
            
            # Test update product
            updated_data = {**product_data, "price": 899.99}
            self.run_test(
                "Update Product (Admin)",
                "PUT",
                f"admin/products/{self.created_product_id}",
                200,
                data=updated_data,
                use_admin=True
            )
            
            # Test delete product
            self.run_test(
                "Delete Product (Admin)",
                "DELETE",
                f"admin/products/{self.created_product_id}",
                200,
                use_admin=True
            )
        
        return create_success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting E-Commerce API Testing...")
        print(f"Testing against: {self.base_url}")
        
        # Test in logical order
        seed_success = self.test_seed_data()
        auth_success = self.test_authentication()
        products_success = self.test_products()
        cart_success = self.test_cart()
        wishlist_success = self.test_wishlist()
        address_success = self.test_address_management()
        orders_success = self.test_orders()
        returns_success = self.test_returns()
        admin_success = self.test_admin_apis()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ECommerceAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())