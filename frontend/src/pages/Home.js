import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [storefrontSettings, setStorefrontSettings] = useState(null);
  const { getCartCount, addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchStorefrontSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStorefrontSettings = async () => {
    try {
      const response = await axios.get(`${API}/storefront-settings`);
      setStorefrontSettings(response.data);
    } catch (error) {
      console.error('Error fetching storefront settings:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.available;
  });

  const categories = ['all', ...new Set(products.map((p) => p.category))];

  const handleQuickAdd = (product) => {
    addToCart(product, 1);
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen">
      <nav className="fixed top-4 left-4 right-4 md:left-8 md:right-8 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-white/20 z-50 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-bakery-cocoa" data-testid="site-logo">Arca's Yard Bakeshop</h1>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link
            to="/cart"
            className="relative p-3 rounded-full hover:bg-bakery-flour transition-colors text-bakery-cocoa"
            data-testid="cart-button"
          >
            <ShoppingCart className="w-6 h-6" />
            {getCartCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-bakery-terracotta text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" data-testid="cart-count">
                {getCartCount()}
              </span>
            )}
          </Link>
          <Link
            to="/admin"
            className="text-bakery-cocoa hover:bg-bakery-flour/50 rounded-full px-6 py-3 transition-colors text-sm font-medium"
            data-testid="admin-link"
          >
            Admin
          </Link>
        </div>
      </nav>

      <div className="pt-32 pb-12 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <div className="rounded-3xl overflow-hidden bg-bakery-flour/30 p-12 flex flex-col justify-center border border-bakery-cocoa/5">
              <h2 className="text-5xl md:text-6xl font-heading font-bold text-bakery-cocoa mb-6">
                Sweetness<br />Delivered
              </h2>
              <p className="text-lg text-stone-700 leading-relaxed">
                Pre-order your favorite Kakanin and other treats with scheduled delivery around Baguio City and La Trinidad, Benguet.
              </p>
            </div>

            <div className="rounded-3xl overflow-hidden bg-white p-8 flex items-center justify-center border border-bakery-cocoa/5 shadow-sm">
              <img
                src="https://i.imgur.com/d9nINRN.jpg"
                alt="Arca's Yard Bakeshop Logo"
                className="w-full h-auto max-w-md object-contain"
              />
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
              <h3 className="text-4xl font-heading font-semibold text-bakery-cocoa" data-testid="products-heading">Our Products</h3>
              
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search for cakes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-bakery-latte/50 bg-white pl-12 pr-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                  data-testid="search-input"
                />
              </div>
            </div>

            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-bakery-cocoa text-white shadow-lg shadow-bakery-cocoa/20'
                      : 'bg-bakery-flour text-bakery-cocoa hover:bg-bakery-latte/50'
                  }`}
                  data-testid={`category-${category}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-lg text-stone-500">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]" data-testid="products-grid">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-bakery-cocoa/5 transition-all duration-300 border border-stone-100 group cursor-pointer"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="h-64 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                    />
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-heading font-semibold text-bakery-cocoa mb-2">
                      {product.name}
                    </h4>
                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    
                    {/* Stock indicator */}
                    {product.stock > 0 && product.available && (
                      <div className={`text-xs font-medium mb-2 ${
                        product.stock <= 5 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {product.stock <= 5 ? `⚠️ Only ${product.stock} left!` : `✓ ${product.stock} in stock`}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-bakery-terracotta">
                        ₱{product.price.toFixed(2)}
                      </span>
                      {!product.available || (product.stock > 0 && product.stock === 0) ? (
                        <span className="bg-gray-200 text-gray-500 rounded-full px-4 py-2 text-sm font-medium">
                          Out of Stock
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuickAdd(product);
                          }}
                          className="bg-bakery-cocoa text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-bakery-cocoa/90 transition-colors"
                          data-testid={`quick-add-${product.id}`}
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-lg text-stone-500">No products found</p>
            </div>
          )}
        </div>
      </div>

      <footer className="bg-bakery-cocoa text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-heading font-bold mb-2">Arca's Yard Bakeshop</h3>
          <p className="text-white/80 mb-3">{storefrontSettings?.tagline || "Your local bakery, delivering happiness since 2023"}</p>
          <div className="text-white/70 text-sm space-y-1">
            <p>By Chef Valerie Novales Frias</p>
            <p>Chef Reza Galap</p>
            <p>Bakers: Alexia Antino, Aiza Camolo</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;