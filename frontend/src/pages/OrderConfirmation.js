import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Download, Home, Mail, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('gcash'); // 'gcash' or 'paymaya' (paymongo disabled)
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchStoreSettings();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
      // Check if email was already sent
      if (response.data.payment_email_sent) {
        setEmailSent(true);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const response = await axios.get(`${API}/store-settings`);
      setStoreSettings(response.data);
    } catch (error) {
      console.error('Error fetching store settings:', error);
    }
  };

  const handleSendPaymentEmail = async (method = 'gcash') => {
    setSendingEmail(true);
    try {
      const response = await axios.post(`${API}/send-payment-email`, { 
        order_id: orderId,
        payment_method: method 
      });
      setEmailSent(true);
      
      // Show appropriate message based on whether customer email was sent
      if (response.data.customer_email_sent) {
        toast.success('Payment instructions sent to your email!');
      } else {
        toast.success('Store has been notified! Check the QR code below.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to notify store. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadQR = () => {
    if (!order?.qr_code_data) return;
    
    const link = document.createElement('a');
    link.href = order.qr_code_data;
    link.download = `order-${order.order_number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-stone-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-500 mb-4">Order not found</p>
          <Link to="/" className="text-bakery-terracotta hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 md:px-12 lg:px-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-bakery-matcha/20 rounded-full mb-6">
            <Check className="w-10 h-10 text-bakery-matcha" />
          </div>
          <h1 className="text-5xl font-heading font-bold text-bakery-cocoa mb-4" data-testid="confirmation-heading">
            Order Confirmed!
          </h1>
          <p className="text-lg text-stone-600">
            Thank you for your order. We'll have your treats ready for delivery.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">Order Number</h3>
              <p className="text-xl font-bold text-bakery-cocoa" data-testid="order-number">{order.order_number}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">Total Amount</h3>
              <p className="text-xl font-bold text-bakery-terracotta" data-testid="order-total">₱{order.total_amount.toFixed(2)}</p>
              <p className="text-xs text-stone-500">
                (Subtotal: ₱{order.subtotal.toFixed(2)} + {order.order_type === 'pickup' ? 'Pick Up: FREE' : `Delivery: ₱${order.delivery_fee.toFixed(2)}`})
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">{order.order_type === 'pickup' ? 'Pick Up Date' : 'Delivery Date'}</h3>
              <p className="text-lg text-bakery-cocoa">{order.delivery_date}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-2">{order.order_type === 'pickup' ? 'Pick Up Time' : 'Delivery Time'}</h3>
              <p className="text-lg text-bakery-cocoa">{order.delivery_time}</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6 mb-6">
            <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Customer Information</h3>
            <div className="space-y-2 text-stone-600">
              <p><strong>Name:</strong> {order.customer_name}</p>
              <p><strong>Email:</strong> {order.customer_email}</p>
              <p><strong>Phone:</strong> {order.customer_phone}</p>
              <p><strong>Order Type:</strong> {order.order_type === 'pickup' ? '🏪 Pick Up' : '🚚 Delivery'}</p>
              {order.order_type === 'delivery' && (
                <p><strong>Delivery Address:</strong> {order.delivery_address}</p>
              )}
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-stone-600">
                    {item.product_name} x {item.quantity}
                  </span>
                  <span className="font-medium text-bakery-cocoa">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-bakery-flour/30 rounded-3xl p-8 border border-bakery-cocoa/5 mb-8">
          <h2 className="text-2xl font-heading font-semibold text-bakery-cocoa mb-4 text-center">Complete Your Payment</h2>
          <p className="text-center text-stone-600 mb-6">
            <strong>Amount to Pay: ₱{order.total_amount.toFixed(2)}</strong>
          </p>
          
          {/* Payment Method Selection */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              disabled
              className="px-6 py-3 rounded-full font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
              data-testid="select-paymongo"
            >
              💳 PayMongo - Coming Soon
            </button>
            <button
              onClick={() => setPaymentMethod('gcash')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                paymentMethod === 'gcash'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-bakery-cocoa border border-bakery-cocoa/20 hover:border-blue-400'
              }`}
              data-testid="select-gcash-qr"
            >
              📱 GCash QR
            </button>
            <button
              onClick={() => setPaymentMethod('paymaya')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                paymentMethod === 'paymaya'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-bakery-cocoa border border-bakery-cocoa/20 hover:border-green-400'
              }`}
              data-testid="select-paymaya-qr"
            >
              💚 PayMaya QR
            </button>
          </div>

          {/* PayMongo Online Payment */}
          {paymentMethod === 'paymongo' && order.payment_link_url && (
            <div className="flex flex-col items-center">
              <p className="text-center text-stone-600 mb-6">
                Pay securely with GCash, Maya, or Credit/Debit Card
              </p>
              
              <a
                href={order.payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-bakery-cocoa text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-bakery-cocoa/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-bakery-cocoa/30 mb-6"
                data-testid="paymongo-payment-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pay ₱{order.total_amount.toFixed(2)}
              </a>

              <div className="w-full max-w-md p-4 bg-white/50 rounded-xl space-y-2">
                <p className="text-sm text-stone-600">
                  <strong>💳 Accepted Payment Methods:</strong>
                </p>
                <ul className="text-sm text-stone-600 list-disc list-inside ml-2 space-y-1">
                  <li>GCash</li>
                  <li>Maya (PayMaya)</li>
                  <li>Credit Cards (Visa, Mastercard)</li>
                  <li>Debit Cards</li>
                </ul>
                <p className="text-xs text-stone-500 mt-3">
                  ✅ Secure payment powered by PayMongo. Your order will be automatically confirmed once payment is received.
                </p>
              </div>
            </div>
          )}

          {/* PayMongo fallback if no payment link */}
          {paymentMethod === 'paymongo' && !order.payment_link_url && (
            <div className="flex flex-col items-center">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-md">
                <p className="text-amber-800 font-medium mb-2">Payment link not available</p>
                <p className="text-amber-700 text-sm">
                  Please use GCash QR or PayMaya QR option instead.
                </p>
              </div>
            </div>
          )}

          {/* GCash QR Payment Option */}
          {paymentMethod === 'gcash' && storeSettings?.payment_qr_code_url && (
            <div className="flex flex-col items-center">
              {/* Email Button - Primary Action */}
              <div className="w-full max-w-md mb-6">
                {!emailSent ? (
                  <button
                    onClick={() => handleSendPaymentEmail('gcash')}
                    disabled={sendingEmail}
                    className="w-full inline-flex items-center justify-center gap-3 bg-blue-500 text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="send-email-button"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Notifying Store...
                      </>
                    ) : (
                      <>
                        <Mail className="w-6 h-6" />
                        I'm Ready to Pay - Notify Store
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-700 font-semibold mb-2">
                      <Check className="w-5 h-5" />
                      Store Notified!
                    </div>
                    <p className="text-sm text-blue-600">
                      We're expecting your payment of <strong>₱{order.total_amount.toFixed(2)}</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Scan the QR code below and send screenshot to: <strong>arcasyardbakeshop@gmail.com</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center text-stone-500 text-sm mb-4">— scan QR code below —</div>

              <div className="bg-white p-4 rounded-2xl shadow-lg mb-4 w-full max-w-xs" data-testid="gcash-qr-container">
                <div className="bg-blue-500 text-white text-center py-2 rounded-t-lg font-bold mb-2">
                  GCash
                </div>
                <img
                  src={storeSettings.payment_qr_code_url}
                  alt="GCash QR Code"
                  className="w-full h-auto rounded-lg"
                  data-testid="gcash-qr-image"
                />
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-xl w-full max-w-md space-y-3">
                <p className="text-sm text-stone-600">
                  <strong>📱 How to Pay with GCash:</strong>
                </p>
                <ol className="text-sm text-stone-600 list-decimal list-inside space-y-2 ml-2">
                  <li>Open your <strong>GCash app</strong></li>
                  <li>Tap <strong>"Scan QR"</strong></li>
                  <li>Scan the QR code above</li>
                  <li>Enter amount: <strong className="text-blue-600">₱{order.total_amount.toFixed(2)}</strong></li>
                  <li>Add message: <strong className="text-blue-600">{order.order_number}</strong></li>
                  <li>Complete the payment</li>
                </ol>
                
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>✅ After paying:</strong> Send your payment screenshot to:
                  </p>
                  <p className="text-lg font-bold text-green-900 mt-1">📧 arcasyardbakeshop@gmail.com</p>
                  <p className="text-xs text-green-700 mt-1">Include your order number: <strong>{order.order_number}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* PayMaya QR Payment Option */}
          {paymentMethod === 'paymaya' && storeSettings?.paymaya_qr_code_url && (
            <div className="flex flex-col items-center">
              {/* Email Button - Primary Action */}
              <div className="w-full max-w-md mb-6">
                {!emailSent ? (
                  <button
                    onClick={() => handleSendPaymentEmail('paymaya')}
                    disabled={sendingEmail}
                    className="w-full inline-flex items-center justify-center gap-3 bg-green-500 text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-green-600 transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="send-email-button-paymaya"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Notifying Store...
                      </>
                    ) : (
                      <>
                        <Mail className="w-6 h-6" />
                        I'm Ready to Pay - Notify Store
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold mb-2">
                      <Check className="w-5 h-5" />
                      Store Notified!
                    </div>
                    <p className="text-sm text-green-600">
                      We're expecting your payment of <strong>₱{order.total_amount.toFixed(2)}</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Scan the QR code below and send screenshot to: <strong>arcasyardbakeshop@gmail.com</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center text-stone-500 text-sm mb-4">— scan QR code below —</div>

              <div className="bg-white p-4 rounded-2xl shadow-lg mb-4 w-full max-w-xs" data-testid="paymaya-qr-container">
                <div className="bg-green-500 text-white text-center py-2 rounded-t-lg font-bold mb-2">
                  PayMaya
                </div>
                <img
                  src={storeSettings.paymaya_qr_code_url}
                  alt="PayMaya QR Code"
                  className="w-full h-auto rounded-lg"
                  data-testid="paymaya-qr-image"
                />
              </div>
              
              <div className="mt-4 p-4 bg-green-50 rounded-xl w-full max-w-md space-y-3">
                <p className="text-sm text-stone-600">
                  <strong>💚 How to Pay with PayMaya:</strong>
                </p>
                <ol className="text-sm text-stone-600 list-decimal list-inside space-y-2 ml-2">
                  <li>Open your <strong>PayMaya app</strong></li>
                  <li>Tap <strong>"Scan QR"</strong></li>
                  <li>Scan the QR code above</li>
                  <li>Enter amount: <strong className="text-green-600">₱{order.total_amount.toFixed(2)}</strong></li>
                  <li>Add message: <strong className="text-green-600">{order.order_number}</strong></li>
                  <li>Complete the payment</li>
                </ol>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>✅ After paying:</strong> Send your payment screenshot to:
                  </p>
                  <p className="text-lg font-bold text-blue-900 mt-1">📧 arcasyardbakeshop@gmail.com</p>
                  <p className="text-xs text-blue-700 mt-1">Include your order number: <strong>{order.order_number}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Fallback if PayMaya QR not configured */}
          {paymentMethod === 'paymaya' && !storeSettings?.paymaya_qr_code_url && (
            <div className="text-center text-stone-600">
              <p>PayMaya QR is not configured yet.</p>
              <p>Please use GCash instead.</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-bakery-flour text-bakery-cocoa rounded-full px-8 py-4 font-medium hover:bg-bakery-latte/50 transition-colors border border-bakery-cocoa/10"
            data-testid="back-home-button"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;