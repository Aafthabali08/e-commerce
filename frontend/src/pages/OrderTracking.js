import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, Package, Truck, Home, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const requestReturn = async (e) => {
    e.preventDefault();
    try {
      await api.post('/returns/create', {
        order_id: id,
        reason: returnReason
      });
      toast.success('Return request submitted!');
      setShowReturnDialog(false);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request return');
    }
  };

  const orderStatuses = [
    { key: 'ordered', label: 'Ordered', icon: Package },
    { key: 'processed', label: 'Processed', icon: Check },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Home }
  ];

  const getStatusIndex = (status) => {
    return orderStatuses.findIndex(s => s.key === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!order) return null;

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div data-testid="order-tracking-page" className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/orders">
          <Button data-testid="back-to-orders-btn" variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Link>

        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              {order.tracking_id && (
                <p data-testid="tracking-id" className="text-gray-600 mt-1">Tracking ID: {order.tracking_id}</p>
              )}
            </div>
            <div className="text-right">
              <p data-testid="order-total" className="text-3xl font-bold text-gray-900">₹{order.total.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">{order.payment_method.toUpperCase()}</p>
            </div>
          </div>

          {/* Order Status Timeline */}
          <div data-testid="order-timeline" className="mb-8">
            <h2 className="text-xl font-semibold mb-6">Order Status</h2>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 w-full h-1 bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%` }}
                ></div>
              </div>

              {/* Status Steps */}
              <div className="relative flex justify-between">
                {orderStatuses.map((status, index) => {
                  const StatusIcon = status.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  return (
                    <div key={status.key} className="flex flex-col items-center flex-1">
                      <div
                        data-testid={`status-${status.key}`}
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                          isCompleted
                            ? 'bg-gradient-to-br from-blue-500 to-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        } ${isCurrent ? 'ring-4 ring-blue-300' : ''}`}
                      >
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <p className={`text-sm font-medium text-center ${
                        isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {status.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Delivery Address</h3>
            <div data-testid="delivery-address" className="text-gray-600">
              <p className="font-medium text-gray-900">{order.shipping_address.full_name}</p>
              <p>{order.shipping_address.address_line}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</p>
              <p>Phone: {order.shipping_address.phone}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div data-testid="order-items" className="space-y-4">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex gap-4">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <Link to={`/products/${item.product_id}`} className="font-medium hover:text-blue-600">
                      {item.product_name}
                    </Link>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Price: ₹{item.price}</p>
                  </div>
                  <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span data-testid="order-subtotal" className="font-semibold">₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span data-testid="order-shipping" className="font-semibold">
                  {order.shipping === 0 ? 'FREE' : `₹${order.shipping.toFixed(2)}`}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span data-testid="order-discount">-₹{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Return Option */}
          {order.status === 'delivered' && order.status !== 'return_requested' && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="request-return-btn" variant="outline">
                    Request Return
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Return</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={requestReturn} data-testid="return-form" className="space-y-4">
                    <div>
                      <Label>Reason for Return</Label>
                      <Textarea
                        data-testid="return-reason"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Please describe why you want to return this order..."
                        rows={4}
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Returns are accepted within 7 days of delivery. Refund will be processed to your original payment method.
                    </p>
                    <Button data-testid="submit-return-btn" type="submit" className="w-full">
                      Submit Return Request
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {order.status === 'return_requested' && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">Return request submitted</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your return request is being processed. We'll update you shortly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
