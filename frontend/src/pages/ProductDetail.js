import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`${quantity} x ${product.name} added to cart!`);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-stone-500">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-500 mb-4">Product not found</p>
          <Link to="/" className="text-bakery-terracotta hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-bakery-cocoa hover:text-bakery-terracotta transition-colors mb-8"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="rounded-3xl overflow-hidden shadow-lg" data-testid="product-image">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div className="inline-block px-4 py-1 bg-bakery-flour rounded-full text-sm text-bakery-cocoa font-medium mb-4 w-fit">
              {product.category}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-bakery-cocoa mb-4" data-testid="product-name">
              {product.name}
            </h1>
            
            <p className="text-lg text-stone-600 leading-relaxed mb-6" data-testid="product-description">
              {product.description}
            </p>
            
            <div className="text-4xl font-bold text-bakery-terracotta mb-4" data-testid="product-price">
              ₱{product.price.toFixed(2)}
            </div>
            
            {/* Stock indicator */}
            {product.stock > 0 && product.available && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                product.stock <= 5 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {product.stock <= 5 
                  ? `⚠️ Only ${product.stock} left in stock!` 
                  : `✓ ${product.stock} available in stock`}
              </div>
            )}

            <div className="flex items-center gap-4 mb-8">
              <label className="text-sm font-medium text-bakery-cocoa">Quantity:</label>
              <div className="flex items-center gap-3 bg-bakery-flour rounded-full px-2 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  data-testid="decrease-quantity"
                >
                  <Minus className="w-5 h-5 text-bakery-cocoa" />
                </button>
                <span className="text-lg font-semibold text-bakery-cocoa min-w-[3rem] text-center" data-testid="quantity-value">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                  data-testid="increase-quantity"
                >
                  <Plus className="w-5 h-5 text-bakery-cocoa" />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="bg-bakery-cocoa text-white rounded-full px-8 py-4 font-medium hover:bg-bakery-cocoa/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-bakery-cocoa/20 flex items-center justify-center gap-3 text-lg"
              data-testid="add-to-cart-button"
            >
              <ShoppingCart className="w-6 h-6" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;