import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, Eye } from 'lucide-react';
import { toast } from 'sonner';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ordered: 'bg-blue-100 text-blue-800',
      processed: 'bg-purple-100 text-purple-800',
      shipped: 'bg-yellow-100 text-yellow-800',
      out_for_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      return_requested: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      ordered: 'Ordered',
      processed: 'Processed',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      return_requested: 'Return Requested'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div data-testid="no-orders" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-24 h-24 mx-auto mb-6 text-gray-400" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No orders yet</h2>
          <p className="text-gray-600 mb-8">Start shopping to see your orders here</p>
          <Link to="/products">
            <Button data-testid="start-shopping-btn" size="lg">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="orders-page" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Orders</h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              data-testid={`order-${order.id}`}
              className="glass rounded-2xl p-6 border border-gray-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {order.tracking_id && (
                    <p className="text-sm text-gray-600 mt-1">Tracking ID: {order.tracking_id}</p>
                  )}
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <p className="text-2xl font-bold text-gray-900">₹{order.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{order.items.length} items</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {order.items.map((item) => (
                  <div key={item.product_id} className="flex gap-4">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={`/orders/${order.id}`}>
                  <Button data-testid={`track-order-btn-${order.id}`} variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Track Order
                  </Button>
                </Link>
                {order.status === 'delivered' && (
                  <Link to={`/products/${order.items[0].product_id}`}>
                    <Button variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Buy Again
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
