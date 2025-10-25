import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      await api.put('/cart/update', { product_id: productId, quantity });
      fetchCart();
    } catch (error) {
      toast.error('Failed to update cart');
    }
  };

  const removeItem = async (productId) => {
    try {
      await api.delete(`/cart/remove/${productId}`);
      fetchCart();
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const applyDiscount = () => {
    if (discountCode === 'SAVE10') {
      setDiscount(subtotal * 0.1);
      toast.success('Discount applied!');
    } else {
      toast.error('Invalid discount code');
    }
  };

  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const total = subtotal + shipping - discount;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div data-testid="empty-cart" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 mx-auto mb-6 text-gray-400" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some products to get started</p>
          <Link to="/products">
            <Button data-testid="continue-shopping-btn" size="lg">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.product_id}
                data-testid={`cart-item-${item.product_id}`}
                className="bg-white rounded-2xl p-6 border border-gray-200 flex gap-6"
              >
                <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                </Link>
                <div className="flex-1">
                  <Link to={`/products/${item.product_id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                      {item.product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600 mb-4">{item.product.brand}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        data-testid={`decrease-btn-${item.product_id}`}
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span data-testid={`quantity-${item.product_id}`} className="text-lg font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        data-testid={`increase-btn-${item.product_id}`}
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p data-testid={`item-price-${item.product_id}`} className="text-xl font-bold text-gray-900">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        data-testid={`remove-btn-${item.product_id}`}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span data-testid="subtotal" className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span data-testid="shipping" className="font-semibold">
                    {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span data-testid="discount">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Total</span>
                    <span data-testid="total" className="text-2xl font-bold text-gray-900">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {shipping > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-blue-800">
                    Add ₹{(500 - subtotal).toFixed(2)} more for FREE shipping!
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Discount Code</label>
                <div className="flex gap-2">
                  <Input
                    data-testid="discount-code-input"
                    type="text"
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <Button data-testid="apply-discount-btn" variant="outline" onClick={applyDiscount}>
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Try code: SAVE10</p>
              </div>

              <Button
                data-testid="checkout-btn"
                size="lg"
                className="w-full"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
