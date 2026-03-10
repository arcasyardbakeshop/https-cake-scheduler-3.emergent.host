import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  LogOut,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [selectedRecurringDays, setSelectedRecurringDays] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Storefront settings state
  const [storefrontSettings, setStorefrontSettings] = useState(null);
  const [editingTagline, setEditingTagline] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, productsRes, ordersRes, settingsRes, storefrontRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/products`),
        axios.get(`${API}/orders`),
        axios.get(`${API}/store-settings`),
        axios.get(`${API}/storefront-settings`)
      ]);
      setStats(statsRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setStoreSettings(settingsRes.data);
      setSelectedRecurringDays(settingsRes.data.recurring_closed_days || []);
      setQrCodeUrl(settingsRes.data.payment_qr_code_url || '');
      setTimeSlots(settingsRes.data.available_time_slots || []);
      setStorefrontSettings(storefrontRes.data);
      setEditingTagline(storefrontRes.data.tagline || '');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateOrderStatus = async (orderId, orderStatus, paymentStatus) => {
    try {
      await axios.patch(`${API}/orders/${orderId}`, {
        order_status: orderStatus,
        payment_status: paymentStatus
      });
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const handleAddClosedDate = () => {
    if (!newClosedDate) return;
    
    const updatedDates = [...(storeSettings?.closed_dates || []), newClosedDate];
    handleUpdateStoreSettings(updatedDates, selectedRecurringDays);
    setNewClosedDate('');
  };

  const handleRemoveClosedDate = (dateToRemove) => {
    const updatedDates = storeSettings.closed_dates.filter(d => d !== dateToRemove);
    handleUpdateStoreSettings(updatedDates, selectedRecurringDays);
  };

  const handleToggleRecurringDay = (day) => {
    const updatedDays = selectedRecurringDays.includes(day)
      ? selectedRecurringDays.filter(d => d !== day)
      : [...selectedRecurringDays, day];
    
    setSelectedRecurringDays(updatedDays);
    handleUpdateStoreSettings(storeSettings.closed_dates, updatedDays);
  };

  const handleUpdateStoreSettings = async (closedDates, recurringDays) => {
    try {
      const updateData = {};
      if (closedDates !== undefined) updateData.closed_dates = closedDates;
      if (recurringDays !== undefined) updateData.recurring_closed_days = recurringDays;
      
      const response = await axios.put(`${API}/store-settings`, updateData);
      setStoreSettings(response.data);
      toast.success('Store settings updated');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const handleUpdateQrCode = async () => {
    if (!qrCodeUrl.trim()) {
      toast.error('Please enter a QR code URL');
      return;
    }
    
    try {
      const response = await axios.put(`${API}/store-settings`, {
        payment_qr_code_url: qrCodeUrl
      });
      setStoreSettings(response.data);
      toast.success('Payment QR code updated successfully!');
    } catch (error) {
      console.error('Error updating QR code:', error);
      toast.error('Failed to update QR code');
    }
  };

  const handleToggleTimeSlot = async (slotIndex) => {
    const updatedSlots = timeSlots.map((slot, idx) => 
      idx === slotIndex ? { ...slot, enabled: !slot.enabled } : slot
    );
    
    try {
      const response = await axios.put(`${API}/store-settings`, {
        available_time_slots: updatedSlots
      });
      setStoreSettings(response.data);
      setTimeSlots(response.data.available_time_slots);
      toast.success('Time slot updated');
    } catch (error) {
      console.error('Error updating time slot:', error);
      toast.error('Failed to update time slot');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    try {
      await axios.post(`${API}/admin/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      toast.success('Password changed successfully! Backend will restart in 5 seconds.');
      
      // Clear form
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      // Logout after password change
      setTimeout(() => {
        localStorage.removeItem('adminToken');
        toast.info('Please login with your new password');
        navigate('/admin');
      }, 5000);
      
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.response?.status === 401) {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password');
      }
    }
  };

  // Storefront Settings Handlers
  const handleUpdateTagline = async () => {
    if (!editingTagline.trim()) {
      toast.error('Tagline cannot be empty');
      return;
    }
    
    try {
      await axios.put(`${API}/storefront-settings`, {
        tagline: editingTagline.trim()
      });
      setStorefrontSettings(prev => ({ ...prev, tagline: editingTagline.trim() }));
      toast.success('Tagline updated successfully!');
    } catch (error) {
      console.error('Error updating tagline:', error);
      toast.error('Failed to update tagline');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/categories`, {
        name: newCategoryName.trim()
      });
      setStorefrontSettings(prev => ({
        ...prev,
        categories: [...(prev.categories || []), response.data]
      }));
      setNewCategoryName('');
      toast.success('Category added successfully!');
    } catch (error) {
      console.error('Error adding category:', error);
      if (error.response?.status === 400) {
        toast.error('Category already exists');
      } else {
        toast.error('Failed to add category');
      }
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/categories/${categoryId}`);
      setStorefrontSettings(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== categoryId)
      }));
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };


  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-stone-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bakery-cream">
      <nav className="bg-bakery-cocoa text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold" data-testid="admin-dashboard-title">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:bg-white/10 rounded-full px-4 py-2 transition-colors"
            data-testid="logout-button"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-bakery-cocoa border-b-2 border-bakery-cocoa'
                : 'text-stone-500 hover:text-bakery-cocoa'
            }`}
            data-testid="overview-tab"
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'products'
                ? 'text-bakery-cocoa border-b-2 border-bakery-cocoa'
                : 'text-stone-500 hover:text-bakery-cocoa'
            }`}
            data-testid="products-tab"
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'orders'
                ? 'text-bakery-cocoa border-b-2 border-bakery-cocoa'
                : 'text-stone-500 hover:text-bakery-cocoa'
            }`}
            data-testid="orders-tab"
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-bakery-cocoa border-b-2 border-bakery-cocoa'
                : 'text-stone-500 hover:text-bakery-cocoa'
            }`}
            data-testid="settings-tab"
          >
            Store Settings
          </button>
          <button
            onClick={() => setActiveTab('storefront')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'storefront'
                ? 'text-bakery-cocoa border-b-2 border-bakery-cocoa'
                : 'text-stone-500 hover:text-bakery-cocoa'
            }`}
            data-testid="storefront-tab"
          >
            Storefront
          </button>
        </div>

        {activeTab === 'overview' && (
          <div>
            <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-stone-100" data-testid="stat-total-orders">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-bakery-flour rounded-xl">
                    <ShoppingBag className="w-6 h-6 text-bakery-cocoa" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Total Orders</p>
                    <p className="text-2xl font-bold text-bakery-cocoa">{stats?.total_orders || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100" data-testid="stat-pending-orders">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Pending</p>
                    <p className="text-2xl font-bold text-bakery-cocoa">{stats?.pending_orders || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100" data-testid="stat-completed-orders">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Completed</p>
                    <p className="text-2xl font-bold text-bakery-cocoa">{stats?.completed_orders || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100" data-testid="stat-revenue">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-bakery-terracotta/20 rounded-xl">
                    <DollarSign className="w-6 h-6 text-bakery-terracotta" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Revenue</p>
                    <p className="text-2xl font-bold text-bakery-cocoa">₱{stats?.total_revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-stone-100">
              <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-bakery-flour/30 rounded-xl">
                    <div>
                      <p className="font-semibold text-bakery-cocoa">{order.order_number}</p>
                      <p className="text-sm text-stone-600">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-bakery-terracotta">₱{order.total_amount.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.order_status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-heading font-bold text-bakery-cocoa">Products</h2>
              <ProductDialog
                product={null}
                onSuccess={() => {
                  fetchData();
                  setShowProductDialog(false);
                }}
                trigger={
                  <Button className="bg-bakery-cocoa text-white rounded-full px-6 py-3 hover:bg-bakery-cocoa/90" data-testid="add-product-button">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Product
                  </Button>
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-stone-100" data-testid={`admin-product-${product.id}`}>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-stone-600 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-bakery-terracotta">
                        ₱{product.price.toFixed(2)}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        product.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-stone-600">
                        Stock: {product.stock > 0 ? (
                          <span className={product.stock <= 5 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                            {product.stock} units
                          </span>
                        ) : (
                          <span className="text-stone-400">Unlimited</span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <ProductDialog
                        product={product}
                        onSuccess={() => {
                          fetchData();
                        }}
                        trigger={
                          <Button variant="outline" className="flex-1 rounded-full" data-testid={`edit-product-${product.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="rounded-full text-red-500 hover:bg-red-50"
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-6">Orders</h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-6 border border-stone-100" data-testid={`order-${order.id}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-heading font-semibold text-bakery-cocoa">
                        {order.order_number}
                      </h3>
                      <p className="text-sm text-stone-600">{order.customer_name} - {order.customer_phone}</p>
                      <p className="text-sm text-stone-600">{order.customer_email}</p>
                    </div>
                    <div className="text-right mt-4 md:mt-0">
                      <p className="text-2xl font-bold text-bakery-terracotta">₱{order.total_amount.toFixed(2)}</p>
                      <p className="text-xs text-stone-500">(Items: ₱{order.subtotal.toFixed(2)} + Delivery: ₱{order.delivery_fee.toFixed(2)})</p>
                      <p className="text-sm text-stone-600">{order.delivery_date} - {order.delivery_time}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-bakery-cocoa mb-2">Items:</h4>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm text-stone-600">
                          {item.product_name} x{item.quantity} - ₱{(item.price * item.quantity).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={order.order_status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value, order.payment_status)}
                      className="rounded-full border-bakery-latte/50 px-4 py-2 text-sm focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      data-testid={`order-status-${order.id}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={order.payment_status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, order.order_status, e.target.value)}
                      className="rounded-full border-bakery-latte/50 px-4 py-2 text-sm focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      data-testid={`payment-status-${order.id}`}
                    >
                      <option value="pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && storeSettings && (
          <div>
            <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-6">Store Settings</h2>
            
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Payment QR Code</h3>
                <p className="text-sm text-stone-600 mb-4">
                  Upload your GCash or PayMaya QR code. This will be displayed to customers during checkout.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">QR Code Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={qrCodeUrl}
                        onChange={(e) => setQrCodeUrl(e.target.value)}
                        placeholder="https://example.com/my-gcash-qr.jpg"
                        className="flex-1 rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                        data-testid="qr-code-url-input"
                      />
                      <button
                        onClick={handleUpdateQrCode}
                        className="bg-bakery-cocoa text-white rounded-xl px-6 py-3 hover:bg-bakery-cocoa/90 transition-colors"
                        data-testid="update-qr-button"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  
                  {storeSettings.payment_qr_code_url && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-bakery-flour/30 rounded-xl">
                      <p className="text-sm font-medium text-bakery-cocoa">Current QR Code:</p>
                      <img
                        src={storeSettings.payment_qr_code_url}
                        alt="Payment QR Code"
                        className="w-48 h-48 object-contain rounded-xl border-2 border-bakery-cocoa/10"
                        data-testid="current-qr-preview"
                      />
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Upload your QR code to a free image hosting service like{' '}

              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">🔐 Change Admin Password</h3>
                <p className="text-sm text-stone-600 mb-4">
                  Update your admin password for security. You'll be logged out after changing.
                </p>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      required
                      className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      placeholder="Enter current password"
                      data-testid="current-password-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      required
                      minLength={8}
                      className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      placeholder="Enter new password (min 8 characters)"
                      data-testid="new-password-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                      required
                      minLength={8}
                      className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      placeholder="Confirm new password"
                      data-testid="confirm-password-input"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="bg-bakery-terracotta text-white rounded-xl px-6 py-3 hover:bg-bakery-terracotta/90 transition-colors font-medium"
                    data-testid="change-password-button"
                  >
                    Change Password
                  </button>
                  
                  <p className="text-xs text-stone-500 mt-2">
                    Password must be at least 8 characters. You'll be logged out after changing.
                  </p>
                </form>
              </div>

                      <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="underline">Imgur</a> or{' '}
                      <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="underline">ImgBB</a>,{' '}
                      then paste the image URL here.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Available Time Slots</h3>
                <p className="text-sm text-stone-600 mb-4">Enable or disable delivery time slots</p>
                
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <label key={index} className="flex items-center justify-between p-3 bg-bakery-flour/30 rounded-xl cursor-pointer hover:bg-bakery-flour/50 transition-colors">
                      <span className="font-medium text-bakery-cocoa">{slot.slot}</span>
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={() => handleToggleTimeSlot(index)}
                        className="w-5 h-5 rounded text-bakery-cocoa focus:ring-bakery-cocoa"
                        data-testid={`time-slot-${index}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Recurring Closed Days</h3>
                <p className="text-sm text-stone-600 mb-4">Select days when your store is always closed</p>
                
                <div className="space-y-2">
                  {weekDays.map((day) => (
                    <label key={day.value} className="flex items-center gap-3 p-3 bg-bakery-flour/30 rounded-xl cursor-pointer hover:bg-bakery-flour/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedRecurringDays.includes(day.value)}
                        onChange={() => handleToggleRecurringDay(day.value)}
                        className="w-5 h-5 rounded text-bakery-cocoa focus:ring-bakery-cocoa"
                        data-testid={`recurring-day-${day.value}`}
                      />
                      <span className="font-medium text-bakery-cocoa">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Specific Closed Dates</h3>
                <p className="text-sm text-stone-600 mb-4">Block specific dates (holidays, special closures, etc.)</p>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="date"
                    value={newClosedDate}
                    onChange={(e) => setNewClosedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 rounded-xl border-bakery-latte/50 px-4 py-2 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                    data-testid="new-closed-date-input"
                  />
                  <button
                    onClick={handleAddClosedDate}
                    disabled={!newClosedDate}
                    className="bg-bakery-cocoa text-white rounded-xl px-4 py-2 hover:bg-bakery-cocoa/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="add-closed-date-button"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {storeSettings.closed_dates && storeSettings.closed_dates.length > 0 ? (
                    storeSettings.closed_dates.sort().map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between p-3 bg-bakery-flour/30 rounded-xl"
                        data-testid={`closed-date-${date}`}
                      >
                        <span className="font-medium text-bakery-cocoa">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <button
                          onClick={() => handleRemoveClosedDate(date)}
                          className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500"
                          data-testid={`remove-closed-date-${date}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-stone-400 py-8">No closed dates configured</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-bakery-flour/30 rounded-xl">
              <p className="text-sm text-stone-600">
                <strong>Note:</strong> All these settings will automatically apply to the customer checkout experience. 
                Blocked dates and disabled time slots won't be selectable.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'storefront' && storefrontSettings && (
          <div>
            <h2 className="text-3xl font-heading font-bold text-bakery-cocoa mb-6">Storefront Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tagline Section */}
              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Store Tagline</h3>
                <p className="text-sm text-stone-600 mb-4">
                  This tagline appears on your homepage below the store name.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-bakery-cocoa mb-2">Tagline</label>
                    <input
                      type="text"
                      value={editingTagline}
                      onChange={(e) => setEditingTagline(e.target.value)}
                      placeholder="Enter your store tagline"
                      className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                      data-testid="tagline-input"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleUpdateTagline}
                      className="bg-bakery-cocoa text-white rounded-xl px-6 py-3 hover:bg-bakery-cocoa/90 transition-colors"
                      data-testid="update-tagline-button"
                    >
                      Update Tagline
                    </button>
                    {editingTagline !== storefrontSettings.tagline && (
                      <span className="text-sm text-amber-600">Unsaved changes</span>
                    )}
                  </div>
                  
                  <div className="p-3 bg-bakery-flour/30 rounded-xl">
                    <p className="text-xs text-stone-500 mb-1">Current tagline:</p>
                    <p className="text-sm text-bakery-cocoa italic">"{storefrontSettings.tagline}"</p>
                  </div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="bg-white rounded-2xl p-6 border border-stone-100">
                <h3 className="text-xl font-heading font-semibold text-bakery-cocoa mb-4">Product Categories</h3>
                <p className="text-sm text-stone-600 mb-4">
                  Manage categories for organizing your products.
                </p>
                
                {/* Add New Category */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 rounded-xl border-bakery-latte/50 px-4 py-2 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                    data-testid="new-category-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="bg-bakery-cocoa text-white rounded-xl px-4 py-2 hover:bg-bakery-cocoa/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="add-category-button"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Category List */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {storefrontSettings.categories && storefrontSettings.categories.length > 0 ? (
                    storefrontSettings.categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 bg-bakery-flour/30 rounded-xl"
                        data-testid={`category-${category.id}`}
                      >
                        <span className="font-medium text-bakery-cocoa">{category.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500"
                          data-testid={`delete-category-${category.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-stone-400 py-4">No categories yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Categories you create here will be available when adding new products. Make sure product categories match these names exactly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductDialog = ({ product, onSuccess, trigger }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    image_url: product?.image_url || '',
    category: product?.category || 'cakes',
    available: product?.available ?? true,
    stock: product?.stock || 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (product) {
        await axios.put(`${API}/products/${product.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, formData);
        toast.success('Product created successfully');
      }
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading font-bold text-bakery-cocoa">
            {product ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bakery-cocoa mb-2">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
              data-testid="product-name-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bakery-cocoa mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
              data-testid="product-description-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-bakery-cocoa mb-2">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
                className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                data-testid="product-price-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bakery-cocoa mb-2">Stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
                data-testid="product-stock-input"
                placeholder="0 = unlimited"
              />
              <p className="text-xs text-stone-500 mt-1">Set to 0 for unlimited stock</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bakery-cocoa mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
              data-testid="product-category-select"
            >
              <option value="cakes">Cakes</option>
              <option value="pastries">Pastries</option>
              <option value="breads">Breads</option>
              <option value="desserts">Desserts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-bakery-cocoa mb-2">Image URL</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              required
              className="w-full rounded-xl border-bakery-latte/50 px-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 outline-none"
              data-testid="product-image-input"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="available"
              checked={formData.available}
              onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              className="rounded"
              data-testid="product-available-checkbox"
            />
            <label htmlFor="available" className="text-sm text-bakery-cocoa">
              Available for sale
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-bakery-cocoa text-white rounded-full py-3 hover:bg-bakery-cocoa/90"
            data-testid="save-product-button"
          >
            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboard;
