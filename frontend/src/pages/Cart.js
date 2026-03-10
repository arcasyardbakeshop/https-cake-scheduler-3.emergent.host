import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-4">Your cart is empty</h2>
          <p className="text-stone-600 mb-6">Add some delicious treats to get started!</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-bakery-cocoa text-white rounded-full px-8 py-4 font-medium hover:bg-bakery-cocoa/90 transition-all"
            data-testid="browse-products-button"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-bakery-cocoa hover:text-bakery-terracotta transition-colors mb-8"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-5 h-5" />
          Continue Shopping
        </Link>

        <h1 className="text-5xl font-heading font-bold text-bakery-cocoa mb-12" data-testid="cart-heading">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="flex gap-4">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-stone-500 mb-3">{item.category}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 bg-bakery-flour rounded-full px-2 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-white rounded-full transition-colors"
                          data-testid={`decrease-${item.id}`}
                        >
                          <Minus className="w-4 h-4 text-bakery-cocoa" />
                        </button>
                        <span className="text-sm font-semibold text-bakery-cocoa min-w-[2rem] text-center" data-testid={`quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-white rounded-full transition-colors"
                          data-testid={`increase-${item.id}`}
                        >
                          <Plus className="w-4 h-4 text-bakery-cocoa" />
                        </button>
                      </div>
                      <span className="text-lg font-bold text-bakery-terracotta">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 hover:bg-red-50 rounded-full transition-colors self-start"
                    data-testid={`remove-${item.id}`}
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-bakery-flour/30 rounded-3xl p-8 border border-bakery-cocoa/5 sticky top-8">
              <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>₱{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Fee</span>
                  <span className="text-bakery-terracotta font-medium">₱150.00</span>
                </div>
                <div className="border-t border-bakery-cocoa/10 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold text-bakery-cocoa">
                    <span>Total</span>
                    <span data-testid="cart-total">₱{(getCartTotal() + 150).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-bakery-cocoa text-white rounded-full px-8 py-4 font-medium hover:bg-bakery-cocoa/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-bakery-cocoa/20"
                data-testid="proceed-checkout-button"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;