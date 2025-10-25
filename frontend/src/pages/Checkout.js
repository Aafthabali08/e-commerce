import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cartRes, profileRes] = await Promise.all([
        api.get('/cart'),
        api.get('/auth/profile')
      ]);
      setCart(cartRes.data);
      setAddresses(profileRes.data.addresses || []);
      if (profileRes.data.addresses?.length > 0) {
        setSelectedAddress(profileRes.data.addresses[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/address', newAddress);
      toast.success('Address added!');
      setShowAddressDialog(false);
      fetchData();
      setNewAddress({
        full_name: '',
        phone: '',
        address_line: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
      });
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      // Create order
      const orderResponse = await api.post('/orders/create', {
        items: cart.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        shipping_address: selectedAddress,
        payment_method: paymentMethod,
        discount_code: 'SAVE10'
      });

      // Process payment
      await api.post(`/orders/${orderResponse.data.id}/payment`);

      toast.success('Order placed successfully!');
      navigate(`/orders/${orderResponse.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const discount = subtotal * 0.1;
  const total = subtotal + shipping - discount;

  if (cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div data-testid="checkout-page" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Delivery Address</h2>
                <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-address-btn" variant="outline">Add New Address</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Address</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addAddress} data-testid="address-form" className="space-y-4">
                      <div>
                        <Label>Full Name</Label>
                        <Input
                          data-testid="address-name"
                          required
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          data-testid="address-phone"
                          required
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          data-testid="address-line"
                          required
                          value={newAddress.address_line}
                          onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            data-testid="address-city"
                            required
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            data-testid="address-state"
                            required
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <Input
                          data-testid="address-pincode"
                          required
                          value={newAddress.pincode}
                          onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                        />
                      </div>
                      <Button data-testid="save-address-btn" type="submit" className="w-full">Save Address</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {addresses.length === 0 ? (
                <p data-testid="no-addresses" className="text-gray-600">No addresses found. Please add a delivery address.</p>
              ) : (
                <RadioGroup value={selectedAddress?.id} onValueChange={(id) => {
                  setSelectedAddress(addresses.find(addr => addr.id === id));
                }}>
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        data-testid={`address-${addr.id}`}
                        className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500"
                        onClick={() => setSelectedAddress(addr)}
                      >
                        <RadioGroupItem value={addr.id} id={addr.id} />
                        <label htmlFor={addr.id} className="flex-1 cursor-pointer">
                          <p className="font-semibold">{addr.full_name}</p>
                          <p className="text-sm text-gray-600">{addr.address_line}</p>
                          <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-sm text-gray-600">Phone: {addr.phone}</p>
                        </label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            {/* Payment Method */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  <div data-testid="payment-upi" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex-1 cursor-pointer">UPI (PhonePe, Google Pay, Paytm)</Label>
                  </div>
                  <div data-testid="payment-card" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">Credit / Debit Card</Label>
                  </div>
                  <div data-testid="payment-netbanking" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="netbanking" id="netbanking" />
                    <Label htmlFor="netbanking" className="flex-1 cursor-pointer">Net Banking</Label>
                  </div>
                  <div data-testid="payment-cod" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">Cash on Delivery</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span data-testid="checkout-subtotal" className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span data-testid="checkout-shipping" className="font-semibold">
                    {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount (SAVE10)</span>
                  <span data-testid="checkout-discount">-₹{discount.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Total</span>
                    <span data-testid="checkout-total" className="text-2xl font-bold text-gray-900">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                data-testid="place-order-btn"
                size="lg"
                className="w-full mt-6"
                onClick={placeOrder}
                disabled={loading || !selectedAddress}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
