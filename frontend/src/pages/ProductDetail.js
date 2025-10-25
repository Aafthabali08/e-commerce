import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, ShoppingCart, Heart, Minus, Plus, Package, Shield, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const ProductDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/products/${id}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const addToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/auth');
      return;
    }

    try {
      await api.post('/cart/add', { product_id: id, quantity });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to cart');
    }
  };

  const addToWishlist = async () => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      navigate('/auth');
      return;
    }

    try {
      await api.post(`/wishlist/add/${id}`);
      toast.success('Added to wishlist!');
    } catch (error) {
      toast.error('Failed to add to wishlist');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }

    try {
      await api.post(`/products/${id}/review`, review);
      toast.success('Review submitted!');
      setReview({ rating: 5, comment: '' });
      fetchReviews();
      fetchProduct();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div data-testid="product-detail-page" className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Image */}
          <div>
            <div className="sticky top-24">
              <div className="product-image-container aspect-square bg-white rounded-2xl overflow-hidden border border-gray-200">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="product-image w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
              <h1 data-testid="product-name" className="text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span data-testid="product-rating" className="text-lg font-medium">{product.rating}</span>
                <span className="text-gray-500">({product.reviews_count} reviews)</span>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 py-6">
              <div className="flex items-baseline gap-4 mb-2">
                <span data-testid="product-price" className="text-4xl font-bold text-gray-900">₹{product.price}</span>
                {product.original_price && (
                  <>
                    <span className="text-xl text-gray-500 line-through">₹{product.original_price}</span>
                    <span className="text-lg font-semibold text-green-600">
                      {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">Inclusive of all taxes</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p data-testid="product-description" className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {product.stock > 0 ? (
              <div className="space-y-4">
                <div>
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      data-testid="decrease-quantity-btn"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span data-testid="quantity-display" className="text-xl font-semibold w-12 text-center">{quantity}</span>
                    <Button
                      data-testid="increase-quantity-btn"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">{product.stock} available</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    data-testid="add-to-cart-btn"
                    size="lg"
                    className="flex-1"
                    onClick={addToCart}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    data-testid="add-to-wishlist-btn"
                    size="lg"
                    variant="outline"
                    onClick={addToWishlist}
                  >
                    <Heart className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 font-semibold">Out of Stock</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Fast Delivery</p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Secure Payment</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">7 Day Return</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-gray-200 pt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>

          {user && (
            <div className="glass rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
              <form onSubmit={submitReview} data-testid="review-form" className="space-y-4">
                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        data-testid={`rating-star-${star}`}
                        className={`w-8 h-8 cursor-pointer ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        onClick={() => setReview({ ...review, rating: star })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Comment</Label>
                  <Textarea
                    data-testid="review-comment"
                    value={review.comment}
                    onChange={(e) => setReview({ ...review, comment: e.target.value })}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    required
                  />
                </div>
                <Button data-testid="submit-review-btn" type="submit">Submit Review</Button>
              </form>
            </div>
          )}

          <div data-testid="reviews-list" className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} data-testid={`review-${rev.id}`} className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{rev.user_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
