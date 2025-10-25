import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    min_price: 0,
    max_price: 10000,
    sort: searchParams.get('sort') || '',
    search: searchParams.get('search') || ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      min_price: 0,
      max_price: 10000,
      sort: '',
      search: ''
    });
    setSearchParams({});
  };

  return (
    <div data-testid="product-list-page" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </h3>
                <Button data-testid="clear-filters-btn" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={filters.category || "all"} onValueChange={(value) => updateFilter('category', value === "all" ? '' : value)}>
                    <SelectTrigger data-testid="category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Sort By</Label>
                  <Select value={filters.sort || "default"} onValueChange={(value) => updateFilter('sort', value === "default" ? '' : value)}>
                    <SelectTrigger data-testid="sort-filter">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Price Range: ₹{filters.min_price} - ₹{filters.max_price}</Label>
                  <div className="mt-2">
                    <Slider
                      data-testid="price-slider"
                      min={0}
                      max={10000}
                      step={100}
                      value={[filters.min_price, filters.max_price]}
                      onValueChange={([min, max]) => {
                        setFilters({ ...filters, min_price: min, max_price: max });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {filters.search ? `Search results for "${filters.search}"` : 'All Products'}
              </h1>
              <p className="text-gray-600">{products.length} products found</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner"></div>
              </div>
            ) : products.length === 0 ? (
              <div data-testid="no-products" className="text-center py-20">
                <p className="text-xl text-gray-600">No products found</p>
                <Button onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    data-testid={`product-card-${product.id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden card-hover border border-gray-200">
                      <div className="product-image-container aspect-square">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="product-image w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-sm text-gray-500">({product.reviews_count})</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
                          {product.original_price && (
                            <>
                              <span className="text-sm text-gray-500 line-through">
                                ₹{product.original_price}
                              </span>
                              <span className="text-sm font-semibold text-green-600">
                                {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                              </span>
                            </>
                          )}
                        </div>
                        {product.stock < 10 && product.stock > 0 && (
                          <p className="text-sm text-orange-600 mt-2">Only {product.stock} left!</p>
                        )}
                        {product.stock === 0 && (
                          <p className="text-sm text-red-600 mt-2">Out of Stock</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
