import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Allowed delivery areas
const ALLOWED_AREAS = ['baguio', 'la trinidad', 'latrinidad', 'la trinidad benguet', 'baguio city'];
const MINIMUM_DELIVERY_ORDER = 300; // Minimum order for delivery

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  // Default date is 2 days from now
  const [date, setDate] = useState(() => addDays(new Date(), 2));
  const [storeSettings, setStoreSettings] = useState(null);
  const [orderType, setOrderType] = useState('delivery');
  const [addressError, setAddressError] = useState('');
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    house_number: '',
    street_name: '',
    barangay: '',
    city: '', // New field for city/municipality
    landmark: '',
    delivery_time: '',
    notes: ''
  });

  const DEFAULT_DELIVERY_FEE = 150;
  const deliveryFee = orderType === 'pickup' ? 0 : DEFAULT_DELIVERY_FEE;
  const subtotal = getCartTotal();
  const totalWithDelivery = subtotal + deliveryFee;

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const response = await axios.get(`${API}/store-settings`);
      setStoreSettings(response.data);
    } catch (error) {
      console.error('Error fetching store settings:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Validate city/municipality for delivery area
    if (name === 'city' && orderType === 'delivery') {
      const cityLower = value.toLowerCase().trim();
      if (value && !ALLOWED_AREAS.some(area => cityLower.includes(area))) {
        setAddressError('Sorry, we only deliver to Baguio City and La Trinidad, Benguet.');
      } else {
        setAddressError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!date) {
      toast.error('Please select a delivery date');
      return;
    }

    if (!formData.delivery_time) {
      toast.error('Please select a delivery time');
      return;
    }

    // Validate delivery area for delivery orders
    if (orderType === 'delivery') {
      if (!formData.city) {
        toast.error('Please enter your city/municipality');
        return;
      }
      const cityLower = formData.city.toLowerCase().trim();
      if (!ALLOWED_AREAS.some(area => cityLower.includes(area))) {
        toast.error('Sorry, we only deliver to Baguio City and La Trinidad, Benguet.');
        return;
      }
    }

    setLoading(true);

    // Build delivery address from parts
    const deliveryAddress = orderType === 'pickup' 
      ? 'PICKUP' 
      : `${formData.house_number}, ${formData.street_name}, ${formData.barangay}, ${formData.city}${formData.landmark ? ', Near ' + formData.landmark : ''}`;

    const orderData = {
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone,
      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_date: format(date, 'yyyy-MM-dd'),
      delivery_distance: 0,
      delivery_fee: deliveryFee,
      subtotal: subtotal,
      delivery_time: formData.delivery_time,
      notes: formData.notes,
      items: cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total_amount: totalWithDelivery
    };

    try {
      const response = await axios.post(`${API}/orders`, orderData);
      toast.success('Order placed successfully!');
      clearCart();
      navigate(`/order-confirmation/${response.data.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-4">Your cart is empty</h2>
          <Link to="/" className="text-bakery-terracotta hover:underline">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const timeSlots = [
    '9:00 AM - 12:00 PM',
    '12:00 PM - 3:00 PM',
    '3:00 PM - 6:00 PM',
    '6:00 PM - 9:00 PM'
  ];

  const isDateDisabled = (checkDate) => {
    const today = startOfDay(new Date());
    const minDate = addDays(today, 2); // Minimum 2 days advance booking
    
    // Disable today and tomorrow (next day delivery not allowed)
    if (checkDate < minDate) return true;
    
    if (!storeSettings) return false;
    
    const dayOfWeek = checkDate.getDay();
    if (storeSettings.recurring_closed_days?.includes(dayOfWeek)) {
      return true;
    }
    
    const dateString = format(checkDate, 'yyyy-MM-dd');
    if (storeSettings.closed_dates?.includes(dateString)) {
      return true;
    }
    
    return false;
  };

  const availableTimeSlots = storeSettings?.available_time_slots?.filter(slot => slot.enabled).map(slot => slot.slot) || [
    '9:00 AM - 12:00 PM',
    '12:00 PM - 3:00 PM',
    '3:00 PM - 6:00 PM',
    '6:00 PM - 9:00 PM'
  ];

  return (
    <div className="min-h-screen py-12 px-6 md:px-12 lg:px-20">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-bakery-cocoa hover:text-bakery-terracotta transition-colors mb-8"
          data-testid="back-to-cart"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cart
        </Link>

        <h1 className="text-5xl font-heading font-bold text-bakery-cocoa mb-12" data-testid="checkout-heading">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">Order Type</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === 'delivery'
                        ? 'border-bakery-cocoa bg-bakery-cocoa/5'
                        : 'border-stone-200 hover:border-bakery-cocoa/30'
                    }`}
                    data-testid="delivery-option"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🚚</div>
                      <div className="font-semibold text-bakery-cocoa">Delivery</div>
                      <div className="text-sm text-stone-500">₱150 delivery fee</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setOrderType('pickup')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === 'pickup'
                        ? 'border-bakery-cocoa bg-bakery-cocoa/5'
                        : 'border-stone-200 hover:border-bakery-cocoa/30'
                    }`}
                    data-testid="pickup-option"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏪</div>
                      <div className="font-semibold text-bakery-cocoa">Pick Up</div>
                      <div className="text-sm text-stone-500">No delivery fee</div>
                    </div>
                  </button>
                </div>

                {orderType === 'pickup' && (
                  <div className="mt-4 p-4 bg-bakery-flour/30 rounded-xl border border-bakery-cocoa/10">
                    <h3 className="font-semibold text-bakery-cocoa mb-2">📍 Pick Up Location:</h3>
                    <p className="text-stone-700 font-medium">
                      #888 Tiptop Ambuclao Road, Beckel La Trinidad Boundary
                    </p>
                    <p className="text-sm text-stone-600 mt-1">
                      Near Arca's Yard Cafe and APTS
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">Customer Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                      placeholder="Juan Dela Cruz"
                      data-testid="customer-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                      placeholder="juan@example.com"
                      data-testid="customer-email-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                      placeholder="09171234567"
                      data-testid="customer-phone-input"
                    />
                  </div>
                </div>
              </div>

              {orderType === 'delivery' && (
                <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm">
                  <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">Delivery Address</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-bakery-cocoa mb-2">House Number *</label>
                        <input
                          type="text"
                          name="house_number"
                          value={formData.house_number}
                          onChange={handleInputChange}
                          required={orderType === 'delivery'}
                          className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                          placeholder="123"
                          data-testid="house-number-input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-bakery-cocoa mb-2">Street Name *</label>
                        <input
                          type="text"
                          name="street_name"
                          value={formData.street_name}
                          onChange={handleInputChange}
                          required={orderType === 'delivery'}
                          className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                          placeholder="Session Road"
                          data-testid="street-name-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-bakery-cocoa mb-2">Barangay *</label>
                      <input
                        type="text"
                        name="barangay"
                        value={formData.barangay}
                        onChange={handleInputChange}
                        required={orderType === 'delivery'}
                        className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                        placeholder="e.g., Baguio City Proper"
                        data-testid="barangay-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-bakery-cocoa mb-2">City/Municipality *</label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required={orderType === 'delivery'}
                        className={`w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all ${
                          addressError ? 'border-red-400 bg-red-50' : ''
                        }`}
                        data-testid="city-input"
                      >
                        <option value="">Select City/Municipality</option>
                        <option value="Baguio City">Baguio City</option>
                        <option value="La Trinidad, Benguet">La Trinidad, Benguet</option>
                      </select>
                      {addressError && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>{addressError}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-bakery-cocoa mb-2">Landmark (Optional)</label>
                      <input
                        type="text"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                        placeholder="e.g., Near SM City Baguio"
                        data-testid="landmark-input"
                      />
                    </div>

                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-700">
                        <strong>📍 Delivery Areas:</strong> Baguio City & La Trinidad, Benguet only
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Standard delivery fee: ₱150
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-8 border border-stone-100 shadow-sm">
                <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">
                  {orderType === 'pickup' ? 'Pick Up' : 'Delivery'} Schedule
                </h2>
                
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                  <p className="text-xs text-amber-700">
                    <strong>📅 Advance Booking Required:</strong> Please order at least 2 days in advance. Same-day and next-day orders are not available.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">
                      {orderType === 'pickup' ? 'Pick Up Date *' : 'Delivery Date *'}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 h-auto justify-start text-left font-normal hover:bg-bakery-flour/50"
                          data-testid="date-picker-button"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : <span className="text-stone-400">Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white rounded-2xl border-bakery-latte/50" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={isDateDisabled}
                          initialFocus
                          className="rounded-2xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">
                      {orderType === 'pickup' ? 'Pick Up Time *' : 'Delivery Time *'}
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <select
                        name="delivery_time"
                        value={formData.delivery_time}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-xl border-bakery-latte/50 bg-white pl-11 pr-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all appearance-none cursor-pointer"
                        data-testid="delivery-time-select"
                      >
                        <option value="">Select time slot</option>
                        {availableTimeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-bakery-cocoa mb-2">Special Instructions (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full rounded-xl border-bakery-latte/50 bg-white px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all placeholder:text-stone-400"
                    placeholder="Any special requests or instructions..."
                    data-testid="notes-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (orderType === 'delivery' && subtotal < MINIMUM_DELIVERY_ORDER)}
                className="w-full bg-bakery-cocoa text-white rounded-full px-8 py-4 font-medium hover:bg-bakery-cocoa/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-bakery-cocoa/20 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : (orderType === 'delivery' && subtotal < MINIMUM_DELIVERY_ORDER) ? `Minimum ₱${MINIMUM_DELIVERY_ORDER} for Delivery` : 'Place Order'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-bakery-flour/30 rounded-3xl p-8 border border-bakery-cocoa/5 sticky top-8">
              <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-stone-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-bakery-cocoa">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-bakery-cocoa/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-stone-600">
                  <span>Subtotal</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-600">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-bakery-terracotta">₱{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-bakery-cocoa/10 pt-2">
                  <div className="flex justify-between text-lg font-bold text-bakery-cocoa">
                    <span>Total</span>
                    <span data-testid="checkout-total">₱{totalWithDelivery.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Minimum order warning for delivery */}
                {orderType === 'delivery' && subtotal < MINIMUM_DELIVERY_ORDER && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Minimum order for delivery is <strong>₱{MINIMUM_DELIVERY_ORDER}</strong>. 
                        Add ₱{(MINIMUM_DELIVERY_ORDER - subtotal).toFixed(2)} more to proceed.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;