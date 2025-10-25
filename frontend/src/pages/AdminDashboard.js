import { useEffect, useState } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, DollarSign, Users, ShoppingBag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    category: '',
    brand: '',
    images: [''],
    stock: 0
  });

  useEffect(() => {
    fetchAnalytics();
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/admin/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct}`, productForm);
        toast.success('Product updated!');
      } else {
        await api.post('/admin/products', productForm);
        toast.success('Product created!');
      }
      setShowProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted!');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, null, { params: { status } });
      toast.success('Order status updated!');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: 0,
      original_price: 0,
      category: '',
      brand: '',
      images: [''],
      stock: 0
    });
  };

  const openEditDialog = (product) => {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price || 0,
      category: product.category,
      brand: product.brand,
      images: product.images,
      stock: product.stock
    });
    setShowProductDialog(true);
  };

  return (
    <div data-testid="admin-dashboard" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div data-testid="total-revenue" className="text-2xl font-bold">₹{analytics.total_revenue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div data-testid="total-orders" className="text-2xl font-bold">{analytics.total_orders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div data-testid="total-products" className="text-2xl font-bold">{analytics.total_products}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div data-testid="total-users" className="text-2xl font-bold">{analytics.total_users}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger data-testid="products-tab" value="products">Products</TabsTrigger>
            <TabsTrigger data-testid="orders-tab" value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Management</CardTitle>
                  <Dialog open={showProductDialog} onOpenChange={(open) => {
                    setShowProductDialog(open);
                    if (!open) {
                      setEditingProduct(null);
                      resetProductForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-product-btn">Add Product</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={saveProduct} data-testid="product-form" className="space-y-4">
                        <div>
                          <Label>Product Name</Label>
                          <Input
                            data-testid="product-name-input"
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            data-testid="product-description-input"
                            required
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Price</Label>
                            <Input
                              data-testid="product-price-input"
                              type="number"
                              required
                              value={productForm.price}
                              onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label>Original Price</Label>
                            <Input
                              data-testid="product-original-price-input"
                              type="number"
                              value={productForm.original_price}
                              onChange={(e) => setProductForm({ ...productForm, original_price: parseFloat(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Category</Label>
                            <Input
                              data-testid="product-category-input"
                              required
                              value={productForm.category}
                              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Brand</Label>
                            <Input
                              data-testid="product-brand-input"
                              required
                              value={productForm.brand}
                              onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Stock</Label>
                          <Input
                            data-testid="product-stock-input"
                            type="number"
                            required
                            value={productForm.stock}
                            onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Image URL</Label>
                          <Input
                            data-testid="product-image-input"
                            required
                            value={productForm.images[0]}
                            onChange={(e) => setProductForm({ ...productForm, images: [e.target.value] })}
                          />
                        </div>
                        <Button data-testid="save-product-btn" type="submit" className="w-full">
                          {editingProduct ? 'Update Product' : 'Create Product'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div data-testid="products-list" className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      data-testid={`product-row-${product.id}`}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-gray-600">{product.brand} - {product.category}</p>
                        <p className="text-sm">₹{product.price} | Stock: {product.stock}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          data-testid={`edit-product-${product.id}`}
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          Edit
                        </Button>
                        <Button
                          data-testid={`delete-product-${product.id}`}
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteProduct(product.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div data-testid="orders-list" className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      data-testid={`order-row-${order.id}`}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{order.total.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{order.items.length} items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-sm">Status:</Label>
                        <Select
                          value={order.status}
                          onValueChange={(status) => updateOrderStatus(order.id, status)}
                        >
                          <SelectTrigger data-testid={`order-status-${order.id}`} className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="processed">Processed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
