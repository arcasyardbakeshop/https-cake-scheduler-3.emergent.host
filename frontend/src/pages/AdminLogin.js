import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, formData);
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        toast.success('Login successful!');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-bakery-cocoa mb-2" data-testid="admin-login-heading">
            Admin Login
          </h1>
          <p className="text-stone-600">Sign in to manage your bakery</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-bakery-cocoa mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border-bakery-latte/50 bg-white pl-12 pr-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all"
                  placeholder="admin"
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-bakery-cocoa mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-xl border-bakery-latte/50 bg-white pl-12 pr-4 py-3 focus:ring-2 focus:ring-bakery-cocoa/20 focus:border-bakery-cocoa outline-none transition-all"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bakery-cocoa text-white rounded-full px-8 py-4 font-medium hover:bg-bakery-cocoa/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-bakery-cocoa/20 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-bakery-flour/50 rounded-xl">
            <p className="text-sm text-stone-600 text-center">
              Default credentials: <br />
              <strong>Username:</strong> admin <br />
              <strong>Password:</strong> admin123
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-bakery-terracotta hover:underline text-sm">
            Back to Store
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;