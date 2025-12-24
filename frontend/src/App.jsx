import React, { useMemo, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './i18n'; // Import i18n configuration
import { useTranslation } from 'react-i18next';
import {
  Car,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Compass,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Truck,
  Eye,
  EyeOff,
  Share2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import LanguageSwitcher from './components/LanguageSwitcher';
import BookingShareModal from './components/BookingShareModal';

// API Configuration - Uses environment variable or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2060';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// Axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and tenant header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add X-Tenant-Id header if tenant is selected
    const selectedTenantId = localStorage.getItem('selected_tenant_id');
    if (selectedTenantId) {
      config.headers['X-Tenant-Id'] = selectedTenantId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Helper function to load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
};

const createEmptyAddress = (isPrimary = false) => ({
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  isPrimary,
});

const createEmptyContact = (isPrimary = false) => ({
  label: '',
  phoneNumber: '',
  isPrimary,
});

const DEVANAGARI_DIGITS = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

const convertDigitsForLanguage = (value, language) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (language === 'sa') {
    return str.replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[digit] || digit);
  }
  return str;
};

const statCards = (t) => [
  { label: t('nav.customers'), value: '10+' },
  { label: t('nav.drivers'), value: '15+' },
  { label: t('nav.dispatchers'), value: '3' },
  { label: t('trip.title'), value: '5 seed' },
];

function App() {
  const { t, i18n } = useTranslation(); // Add translation hook

  const convertDigits = useCallback(
    (value) => convertDigitsForLanguage(value, i18n.language),
    [i18n.language]
  );

  const formatDate = useCallback(
    (dateValue) => {
      if (!dateValue) return '';
      const dateString = new Date(dateValue).toLocaleString();
      return convertDigits(dateString);
    },
    [convertDigits]
  );
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  });
  const [showLogin, setShowLogin] = useState(!isAuthenticated);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'CUSTOMER',
    name: '',
    phone: '',
    address: {
      address_line: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_primary: true
    }
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [view, setView] = useState('register'); // 'register', 'customers', 'trips', 'drivers', 'dispatchers', 'booking', 'vehicles'
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
  const [addresses, setAddresses] = useState([createEmptyAddress(true)]);
  const [contacts, setContacts] = useState([createEmptyContact(true)]);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [customerSummary, setCustomerSummary] = useState([]);
  const [driverSummary, setDriverSummary] = useState([]);
  const [dispatcherSummary, setDispatcherSummary] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDispatcher, setSelectedDispatcher] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [filters, setFilters] = useState({
    dispatcher_id: '',
    driver_id: '',
    customer_id: '',
    transaction_number: '',
    date_preset: '',
    date_from: '',
    date_to: '',
  });
  const [bookingForm, setBookingForm] = useState({
    dispatcher_id: '',
    customer_id: '',
    driver_id: '',
    vehicle_id: '',
    pickup_location: '',
    destination_location: '',
    return_location: '',
    ride_duration_hours: 4,
    payment_method: 'RAZORPAY',
    // Expense fields
    food_bill: 0,
    outstation_bill: 0,
    toll_fees: 0,
    accommodation_bill: 0,
    late_fine: 0,
    pickup_location_fare: 0,
    accommodation_included: false,
  });
  const [driverForm, setDriverForm] = useState({
    name: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    phone_number: '',
  });
  const [dispatcherForm, setDispatcherForm] = useState({
    name: '',
    email: '',
    contact_number: '',
  });
  const [vehicleForm, setVehicleForm] = useState({
    customer_id: '',
    nickname: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_type: 'Sedan',
    is_automatic: true,
    registration_number: '',
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null); // 'customer', 'driver', 'dispatcher', 'admin', 'super_admin'
  
  // Analytics state
  const [selectedAnalyticsReport, setSelectedAnalyticsReport] = useState(null); // 'driver', 'customer', 'dispatcher', 'admin', 'super_admin', 'transaction', 'vehicle', 'overview'
  const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [vehicleTransmissionFilter, setVehicleTransmissionFilter] = useState('all'); // 'all', 'automatic', 'manual'
  const [selectedDriverForBreakdown, setSelectedDriverForBreakdown] = useState(null);
  const [driverRevenueBreakdown, setDriverRevenueBreakdown] = useState(null);
  const [revenueBreakdownLoading, setRevenueBreakdownLoading] = useState(false);
  const [shareBooking, setShareBooking] = useState(null); // For booking share modal
  
  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  
  // Tenant management state
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  
  // Expandable sections state for drill-down
  const [expandedDrivers, setExpandedDrivers] = useState({});
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [expandedTransactions, setExpandedTransactions] = useState({});
  const [expandedDispatchers, setExpandedDispatchers] = useState({});
  const [expandedVehicles, setExpandedVehicles] = useState({});

  // Database seeding state
  const [seedingStatus, setSeedingStatus] = useState(null);
  const [showSeedingModal, setShowSeedingModal] = useState(false);

  // Fetch tenants for all authenticated users
  const fetchTenants = useCallback(async () => {
    if (!isAuthenticated || !currentUser) return;
    
    setTenantLoading(true);
    try {
      const response = await api.get('/api/tenants/');
      setTenants(response.data);
      
      // Restore selected tenant from localStorage if exists
      const savedTenantId = localStorage.getItem('selected_tenant_id');
      if (savedTenantId) {
        const tenant = response.data.find(t => t.id === parseInt(savedTenantId));
        if (tenant) {
          setSelectedTenant(tenant);
        } else {
          // Set DEMO as default tenant if saved tenant not found
          const demoTenant = response.data.find(t => t.code === 'DEMO');
          if (demoTenant) {
            setSelectedTenant(demoTenant);
            localStorage.setItem('selected_tenant_id', demoTenant.id.toString());
          }
        }
      } else {
        // No saved tenant - set DEMO as default for all users
        const demoTenant = response.data.find(t => t.code === 'DEMO');
        if (demoTenant) {
          setSelectedTenant(demoTenant);
          localStorage.setItem('selected_tenant_id', demoTenant.id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setTenantLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Handle tenant selection
  const handleTenantSelect = (tenant) => {
    setSelectedTenant(tenant);
    if (tenant) {
      localStorage.setItem('selected_tenant_id', tenant.id.toString());
    } else {
      localStorage.removeItem('selected_tenant_id');
    }
    
    // Refresh data when tenant changes
    if (isAuthenticated) {
      fetchDashboardStats();
      // You can add other data refresh calls here
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setDashboardLoading(true);
    try {
      console.log('Fetching dashboard stats...');
      const response = await api.get('/api/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error.response?.data || error);
      if (error.response?.status === 401) {
        console.log('Authentication failed, clearing tokens...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
        setShowLogin(true);
      }
    } finally {
      setDashboardLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch dashboard stats when authenticated
  useEffect(() => {
    if (isAuthenticated && view === 'register') {
      fetchDashboardStats();
    }
  }, [isAuthenticated, view, fetchDashboardStats]);

  // Fetch tenants when authenticated and user changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchTenants();
    }
  }, [isAuthenticated, currentUser, fetchTenants]);

  // Authentication handlers
  const handleLogin = async (e) => {
    e?.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await api.post('/api/auth/login', loginForm);
      const { access_token, user } = response.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setCurrentUser(user);
      setShowLogin(false);
      setLoginForm({ email: '', password: '' });
      setAuthError(''); // Clear any errors
    } catch (error) {
      // Show detailed error message
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.response) {
        const detail = error.response.data?.detail;
        if (detail) {
          errorMessage = detail;
          // Add helpful hint if user doesn't exist
          if (detail.includes('Incorrect email or password')) {
            errorMessage = `${detail}. If you don't have an account, please register first.`;
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      console.error('Login error:', error.response?.data || error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setAuthError('');
    
    // Frontend validation
    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    
    if (registerForm.password.length < 8) {
      setAuthError('Password must be at least 8 characters');
      return;
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(registerForm.password);
    const hasLowerCase = /[a-z]/.test(registerForm.password);
    const hasNumber = /\d/.test(registerForm.password);
    const hasSpecialChar = /[@$!%*?&]/.test(registerForm.password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setAuthError('Password must contain: uppercase letter, lowercase letter, number, and special character (@$!%*?&)');
      return;
    }
    
    setAuthLoading(true);
    try {
      // Register the user
      const registerResponse = await api.post('/api/auth/register', {
        email: registerForm.email,
        password: registerForm.password,
        name: registerForm.name,
        phone: registerForm.phone,
        address: registerForm.address,
        role: registerForm.role,
      });
      
      // Auto-login after successful registration
      const loginResponse = await api.post('/api/auth/login', {
        email: registerForm.email,
        password: registerForm.password,
      });
      
      const { access_token, user } = loginResponse.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setCurrentUser(user);
      setShowLogin(false);
      setRegisterForm({ 
        email: '', 
        password: '', 
        confirmPassword: '', 
        role: 'CUSTOMER',
        name: '',
        phone: '',
        address: {
          address_line: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'India',
          is_primary: true
        }
      });
      setAuthError(''); // Clear any errors
    } catch (error) {
      // Show detailed error message
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check if the backend server is running and try again.';
      } else if (error.response) {
        // Handle validation errors (422)
        if (error.response.status === 422) {
          const errors = error.response.data?.detail;
          if (Array.isArray(errors)) {
            errorMessage = errors.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
          } else if (typeof errors === 'string') {
            errorMessage = errors;
          } else if (errors?.detail) {
            errorMessage = errors.detail;
          }
        } else {
          // Handle other HTTP errors
          errorMessage = error.response.data?.detail || error.response.data?.message || errorMessage;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = `Cannot connect to server. Please ensure the backend is running on ${API_BASE_URL}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setAuthError(errorMessage);
      console.error('Registration error:', error.response?.data || error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await api.post(`/api/auth/quick-login/${role}`);
      const { access_token, user } = response.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setCurrentUser(user);
      setAuthError('');
    } catch (error) {
      let errorMessage = 'Quick login failed. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setAuthError(errorMessage);
      console.error('Quick login error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setShowLogin(true);
    window.location.reload();
  };

  // Database seeding handlers
  const handleSeedDatabase = async () => {
    try {
      const response = await api.post('/api/admin/seed-database');
      setSeedingStatus({
        is_running: true,
        progress: 0,
        message: response.data.message,
        completed: false,
        error: null
      });
      setShowSeedingModal(true);
      
      // Start polling for status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await api.get('/api/admin/seed-database/status');
          setSeedingStatus(statusResponse.data);
          
          if (!statusResponse.data.is_running) {
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Error polling seeding status:', error);
          clearInterval(pollInterval);
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to start database seeding');
      console.error('Seeding error:', error);
    }
  };

  const closeSeedingModal = () => {
    setShowSeedingModal(false);
    if (seedingStatus?.completed) {
      window.location.reload(); // Reload to show new data
    }
  };

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token is still valid
      api.get('/api/auth/me')
        .then(response => {
          setCurrentUser(response.data);
          setIsAuthenticated(true);
          setShowLogin(false);
        })
        .catch(() => {
          // Token invalid, clear and show login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setIsAuthenticated(false);
          setCurrentUser(null);
          setShowLogin(true);
        });
    } else {
      // No token, show login
      setIsAuthenticated(false);
      setShowLogin(true);
    }
  }, []);

  const summary = useMemo(
    () => ({
      primaryAddress: addresses.find((addr) => addr.isPrimary),
      primaryContact: contacts.find((contact) => contact.isPrimary),
    }),
    [addresses, contacts]
  );

  // Computed commission breakdown from summaryData
  const commissionBreakdown = useMemo(() => {
    if (!summaryData) return null;
    const total = summaryData.total_amount || 0;
    const paid = summaryData.paid_amount || 0;
    const due = summaryData.due_amount || 0;
    return {
      customer: { total: total, paid: paid, due: due },
      driver: { total: (total * 0.75).toFixed(2), paid: (paid * 0.75).toFixed(2), due: (due * 0.75).toFixed(2) },
      admin: { total: (total * 0.20).toFixed(2), paid: (paid * 0.20).toFixed(2), due: (due * 0.20).toFixed(2) },
      dispatcher: { total: (total * 0.02).toFixed(2), paid: (paid * 0.02).toFixed(2), due: (due * 0.02).toFixed(2) },
      super_admin: { total: (total * 0.03).toFixed(2), paid: (paid * 0.03).toFixed(2), due: (due * 0.03).toFixed(2) },
    };
  }, [summaryData]);

  useEffect(() => {
    if (view === 'customers') {
      setLoading(true);
      api.get('/api/customers/')
        .then(res => setCustomers(res.data))
        .catch(err => console.error('Failed to fetch customers:', err))
        .finally(() => setLoading(false));
    } else if (view === 'trips') {
      setLoading(true);
      api.get('/api/transactions/')
        .then(res => setTrips(res.data))
        .catch(err => console.error('Failed to fetch trips:', err))
        .finally(() => setLoading(false));
    } else if (view === 'drivers') {
      setLoading(true);
      api.get('/api/drivers/')
        .then(res => setDrivers(res.data))
        .catch(err => console.error('Failed to fetch drivers:', err))
        .finally(() => setLoading(false));
    } else if (view === 'dispatchers') {
      setLoading(true);
      api.get('/api/dispatchers/')
        .then(res => setDispatchers(res.data))
        .catch(err => console.error('Failed to fetch dispatchers:', err))
        .finally(() => setLoading(false));
    } else if (view === 'booking') {
      setLoading(true);
      Promise.all([
        api.get('/api/customers/'),
        api.get('/api/drivers/'),
        api.get('/api/dispatchers/'),
        api.get('/api/vehicles/'),
      ])
        .then(([custRes, driverRes, dispRes, vehRes]) => {
          setCustomers(custRes.data);
          setDrivers(driverRes.data);
          setDispatchers(dispRes.data);
          setVehicles(vehRes.data);
        })
        .catch(err => console.error('Failed to fetch booking data:', err))
        .finally(() => setLoading(false));
    } else if (view === 'vehicles') {
      setLoading(true);
      Promise.all([
        api.get('/api/vehicles/'),
        api.get('/api/customers/'),
      ])
        .then(([vehRes, custRes]) => {
          setVehicles(vehRes.data);
          setCustomers(custRes.data);
        })
        .catch(err => console.error('Failed to fetch vehicles:', err))
        .finally(() => setLoading(false));
    } else if (view === 'summary') {
      fetchSummaryData();
    }
  }, [view, selectedTenant]);

  const fetchSummaryData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.dispatcher_id) params.append('dispatcher_id', filters.dispatcher_id);
    if (filters.driver_id) params.append('driver_id', filters.driver_id);
    if (filters.customer_id) params.append('customer_id', filters.customer_id);
    if (filters.transaction_number) params.append('transaction_number', filters.transaction_number);
    if (filters.date_preset) params.append('date_preset', filters.date_preset);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    Promise.all([
      api.get(`/api/summary/transactions${queryString}`),
      api.get(`/api/summary/by-customer${queryString}`),
      api.get(`/api/summary/by-driver${queryString}`),
      api.get(`/api/summary/by-dispatcher${queryString}`),
      api.get(`/api/summary/by-transaction${queryString}`),
      api.get('/api/customers/'),
      api.get('/api/drivers/'),
      api.get('/api/dispatchers/'),
      api.get('/api/summary/by-payment'),
    ])
      .then(([txnRes, custRes, driverRes, dispRes, txnListRes, allCustRes, allDriverRes, allDispRes, paymentRes]) => {
        setSummaryData(txnRes.data);
        setCustomerSummary(custRes.data);
        setDriverSummary(driverRes.data);
        setDispatcherSummary(dispRes.data);
        setTransactionSummary(txnListRes.data);
        setCustomers(allCustRes.data);
        setDrivers(allDriverRes.data);
        setDispatchers(allDispRes.data);
        setPaymentSummary(paymentRes.data);
      })
      .catch(err => console.error('Failed to fetch summary:', err))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddressChange = (index, field, value) => {
    setAddresses((prev) =>
      prev.map((addr, idx) => (idx === index ? { ...addr, [field]: value } : addr))
    );
  };

  const handleContactChange = (index, field, value) => {
    setContacts((prev) =>
      prev.map((contact, idx) => (idx === index ? { ...contact, [field]: value } : contact))
    );
  };

  const setPrimaryAddress = (index) => {
    setAddresses((prev) => prev.map((addr, idx) => ({ ...addr, isPrimary: idx === index })));
  };

  const setPrimaryContact = (index) => {
    setContacts((prev) => prev.map((contact, idx) => ({ ...contact, isPrimary: idx === index })));
  };

  const addAddress = () => {
    setAddresses((prev) => [...prev, createEmptyAddress(prev.length === 0)]);
  };

  const addContact = () => {
    setContacts((prev) => [...prev, createEmptyContact(prev.length === 0)]);
  };

  const removeAddress = (index) => {
    if (addresses.length === 1) return;
    setAddresses((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (!filtered.some((addr) => addr.isPrimary) && filtered.length) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const removeContact = (index) => {
    if (contacts.length === 1) return;
    setContacts((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (!filtered.some((contact) => contact.isPrimary) && filtered.length) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!customerInfo.name.trim()) {
      nextErrors.name = 'Customer name is required';
    }

    if (!customerInfo.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(customerInfo.email)) {
      nextErrors.email = 'Email is invalid';
    }

    if (!addresses.length) {
      nextErrors.addresses = 'At least one address is required';
    } else {
      addresses.forEach((addr) => {
        if (!addr.addressLine.trim() || !addr.city.trim() || !addr.country.trim()) {
          nextErrors.addresses = 'Address line, city, and country are required';
        }
      });
      if (!addresses.some((addr) => addr.isPrimary)) {
        nextErrors.addresses = 'Select a primary address';
      }
    }

    if (!contacts.length) {
      nextErrors.contacts = 'At least one contact number is required';
    } else {
      contacts.forEach((contact) => {
        if (!contact.label.trim() || !contact.phoneNumber.trim()) {
          nextErrors.contacts = 'Label and phone are required';
        } else if (!/^\d{7,15}$/.test(contact.phoneNumber.replace(/\D/g, ''))) {
          nextErrors.contacts = 'Phone numbers must be 7-15 digits';
        }
      });
      if (!contacts.some((contact) => contact.isPrimary)) {
        nextErrors.contacts = 'Select a primary contact';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      await api.post('/api/customers/', {
        name: customerInfo.name,
        email: customerInfo.email,
        addresses: addresses.map((addr) => ({
          address_line: addr.addressLine,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postalCode,
          country: addr.country,
          is_primary: addr.isPrimary,
        })),
        contact_numbers: contacts.map((contact) => ({
          label: contact.label,
          phone_number: contact.phoneNumber,
          is_primary: contact.isPrimary,
        })),
      });

      setSubmitStatus('Customer registered successfully!');
      setCustomerInfo({ name: '', email: '' });
      setAddresses([createEmptyAddress(true)]);
      setContacts([createEmptyContact(true)]);
      setErrors({});
    } catch (error) {
      const detail = error.response?.data?.detail;
      setSubmitStatus(detail ? `Error: ${detail}` : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch analytics data based on report type and time filter
  const fetchAnalyticsData = async (reportType, timeFilter) => {
    setAnalyticsLoading(true);
    console.log('Fetching analytics:', { reportType, timeFilter });
    
    try {
      const payload = {
        date_range: {
          range_type: timeFilter,
          start_date: null,
          end_date: null
        },
        tenant_id: null,
        driver_id: null,
        customer_id: null,
        dispatcher_id: null
      };

      let endpoint = '';
      switch(reportType) {
        case 'driver':
          endpoint = '/api/analytics/drivers/comprehensive';
          break;
        case 'customer':
          endpoint = '/api/reports/detailed/customers';
          break;
        case 'dispatcher':
          endpoint = '/api/reports/detailed/dispatchers';
          break;
        case 'admin':
          endpoint = '/api/reports/detailed/admin';
          break;
        case 'super_admin':
          endpoint = '/api/reports/detailed/super-admin';
          break;
        case 'transaction':
          endpoint = '/api/reports/transactions';
          break;
        case 'vehicle':
          endpoint = '/api/reports/vehicles';
          break;
        case 'overview':
          endpoint = '/api/reports/analytics';
          break;
        default:
          console.error('Unknown report type:', reportType);
          return;
      }

      console.log('Calling endpoint:', endpoint, 'with payload:', payload);
      const response = await api.post(endpoint, payload);
      console.log('Analytics response:', response.data);
      setAnalyticsData(response.data);
      
      // Show helpful message if no data
      if (response.data && (
        (response.data.drivers && response.data.drivers.length === 0) ||
        (response.data.summary && response.data.summary.total_bookings === 0)
      )) {
        console.warn('No data found for the selected period. You may need to create some bookings first.');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      console.error('Error details:', error.response?.data);
      
      // Don't set error state if it's a 401 (page will reload via interceptor)
      if (error.response?.status !== 401) {
        setAnalyticsData({
          summary: {},
          drivers: [],
          error: true,
          message: error.response?.data?.detail || 'Failed to fetch analytics data. Please try again.'
        });
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Handle analytics card click
  const handleAnalyticsCardClick = (reportType) => {
    setSelectedAnalyticsReport(reportType);
    fetchAnalyticsData(reportType, analyticsTimeFilter);
  };

  // Handle time filter change
  const handleAnalyticsTimeFilterChange = (newTimeFilter) => {
    setAnalyticsTimeFilter(newTimeFilter);
    if (selectedAnalyticsReport) {
      fetchAnalyticsData(selectedAnalyticsReport, newTimeFilter);
    }
  };

  // Fetch driver revenue breakdown
  const fetchDriverRevenueBreakdown = async (driverId) => {
    setRevenueBreakdownLoading(true);
    setSelectedDriverForBreakdown(driverId);
    try {
      const response = await api.get(`/api/analytics/drivers/${driverId}/revenue-breakdown`, {
        params: { time_filter: analyticsTimeFilter }
      });
      setDriverRevenueBreakdown(response.data);
    } catch (error) {
      console.error('Failed to fetch driver revenue breakdown:', error);
    } finally {
      setRevenueBreakdownLoading(false);
    }
  };

  // Toggle expandable sections for drill-down
  const toggleDriverExpand = (driverId) => {
    setExpandedDrivers(prev => ({
      ...prev,
      [driverId]: !prev[driverId]
    }));
  };

  const toggleCustomerExpand = (customerId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const toggleTransactionExpand = (transactionId) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const toggleDispatcherExpand = (dispatcherId) => {
    setExpandedDispatchers(prev => ({
      ...prev,
      [dispatcherId]: !prev[dispatcherId]
    }));
  };

  const toggleVehicleExpand = (vehicleId) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  // Login/Register UI - Show if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8 justify-center">
              <Car className="h-8 w-8 text-purple-300" />
              <span className="text-xl uppercase tracking-[0.2em] font-semibold text-purple-300">{t('app.title')}</span>
            </div>
            
            {/* Language Switcher */}
            <div className="flex justify-center mb-6">
              <LanguageSwitcher />
            </div>
            
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition ${
                  showLogin
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t('auth.login')}
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition ${
                  !showLogin
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t('auth.register')}
              </button>
            </div>

            {showLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('placeholders.enterPassword')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                    <p className="mb-1">{authError}</p>
                    {authError.includes('Incorrect email or password') && (
                      <p className="text-xs text-slate-400 mt-2">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setShowLogin(false);
                            setAuthError('');
                          }}
                          className="text-purple-400 hover:text-purple-300 underline"
                        >
                          Click here to register
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? t('common.loading') : t('auth.login')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.fullName')}</label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder={t('placeholders.enterName')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.phoneNumber')}</label>
                  <input
                    type="tel"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder="+919876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.address')}</label>
                  <input
                    type="text"
                    value={registerForm.address.address_line}
                    onChange={(e) => setRegisterForm({ 
                      ...registerForm, 
                      address: { ...registerForm.address, address_line: e.target.value }
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                    placeholder={t('placeholders.enterAddress')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">{t('auth.city')}</label>
                    <input
                      type="text"
                      value={registerForm.address.city}
                      onChange={(e) => setRegisterForm({ 
                        ...registerForm, 
                        address: { ...registerForm.address, city: e.target.value }
                      })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('placeholders.enterCity')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">{t('auth.state')}</label>
                    <input
                      type="text"
                      value={registerForm.address.state}
                      onChange={(e) => setRegisterForm({ 
                        ...registerForm, 
                        address: { ...registerForm.address, state: e.target.value }
                      })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('placeholders.enterState')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">{t('auth.postalCode')}</label>
                    <input
                      type="text"
                      value={registerForm.address.postal_code}
                      onChange={(e) => setRegisterForm({ 
                        ...registerForm, 
                        address: { ...registerForm.address, postal_code: e.target.value }
                      })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('placeholders.enterPostalCode')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">{t('auth.country')}</label>
                    <input
                      type="text"
                      value={registerForm.address.country}
                      onChange={(e) => setRegisterForm({ 
                        ...registerForm, 
                        address: { ...registerForm.address, country: e.target.value }
                      })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('placeholders.enterCountry')}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('auth.passwordHint')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Must include: uppercase, lowercase, number, and special character (@$!%*?&)
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.confirmPassword')}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('auth.confirmPassword')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('auth.role')}</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CUSTOMER">{t('roles.customer')}</option>
                    <option value="DRIVER">{t('roles.driver')}</option>
                    <option value="DISPATCHER">{t('roles.dispatcher')}</option>
                    <option value="ADMIN">{t('roles.admin')}</option>
                  </select>
                </div>
                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                    {authError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? t('common.loading') : t('auth.register')}
                </button>
              </form>
            )}

            {/* Quick Login Section */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-400 mb-3 text-center">{t('auth.quickLogin')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLogin('customer')}
                  disabled={authLoading}
                  className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-xs font-medium disabled:opacity-50"
                >
                  👤 {t('roles.customer')}
                </button>
                <button
                  onClick={() => handleQuickLogin('driver')}
                  disabled={authLoading}
                  className="px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition text-xs font-medium disabled:opacity-50"
                >
                  🚗 {t('roles.driver')}
                </button>
                <button
                  onClick={() => handleQuickLogin('dispatcher')}
                  disabled={authLoading}
                  className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition text-xs font-medium disabled:opacity-50"
                >
                  📞 {t('roles.dispatcher')}
                </button>
                <button
                  onClick={() => handleQuickLogin('admin')}
                  disabled={authLoading}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition text-xs font-medium disabled:opacity-50"
                >
                  ⚙️ {t('roles.admin')}
                </button>
                <button
                  onClick={() => handleQuickLogin('super_admin')}
                  disabled={authLoading}
                  className="col-span-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition text-xs font-medium disabled:opacity-50"
                >
                  👑 {t('roles.superAdmin')}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">One-click login with seed accounts</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Left Sidebar - Fixed height with scrollable navigation */}
      <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 p-4 flex flex-col sticky top-0">
        <div className="flex items-center gap-3 text-purple-300 mb-4 px-2">
          <Car className="h-7 w-7" />
          <span className="text-sm uppercase tracking-[0.2em] font-semibold">{t('app.title')}</span>
        </div>
        
        {/* Tenant Selector - Available for all users */}
        {currentUser && tenants.length > 0 && (
          <div className="mb-4 pb-4 border-b border-slate-800">
            <label className="block text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">
              🏢 Company / Tenant
            </label>
            <select
              value={selectedTenant?.id || ''}
              onChange={(e) => {
                const tenant = tenants.find(t => t.id === parseInt(e.target.value));
                handleTenantSelect(tenant);
              }}
              disabled={tenantLoading}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 transition"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.code})
                </option>
              ))}
            </select>
            {selectedTenant && (
              <div className="mt-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 font-medium">
                  ✓ Active: {selectedTenant.name}
                </p>
              </div>
            )}
            {/* Tenant Management - Super Admin Only */}
            {currentUser.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setView('tenants')}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition"
              >
                ⚙️ Manage Tenants
              </button>
            )}
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">{t('sidebar.quickActions')}</p>
          <button
            onClick={() => setView('booking')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'booking'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <Plus className="h-4 w-4" />
            {t('nav.booking')}
          </button>
          <button
            onClick={() => setView('addDriver')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition mt-1 ${
              view === 'addDriver'
                ? 'bg-purple-500 text-white'
                : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
            }`}
          >
            <Plus className="h-4 w-4" />
            {t('nav.addDriver')}
          </button>
          <button
            onClick={() => {
              setSelectedDispatcher({ name: '', email: '', contact_number: '' });
              setEditMode('create-dispatcher');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition mt-1 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            {t('nav.addDispatcher')}
          </button>
          <button
            onClick={() => setView('register')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition mt-1 ${
              view === 'register'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Plus className="h-4 w-4" />
            {t('nav.register')}
          </button>
        </div>
        
        {/* Navigation - Scrollable section */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <p className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">{t('sidebar.navigation')}</p>
          <button
            onClick={() => setView('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'customers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            {t('nav.customers')}
          </button>
          <button
            onClick={() => setView('trips')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'trips'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {t('nav.trips')}
          </button>
          <button
            onClick={() => setView('drivers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'drivers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Car className="h-4 w-4" />
            {t('nav.drivers')}
          </button>
          <button
            onClick={() => setView('dispatchers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'dispatchers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Phone className="h-4 w-4" />
            {t('nav.dispatchers')}
          </button>
          <button
            onClick={() => setView('vehicles')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'vehicles'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Truck className="h-4 w-4" />
            {t('nav.vehicles')}
          </button>
          <button
            onClick={() => setView('summary')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'summary'
                ? 'bg-amber-500 text-white'
                : 'text-amber-300 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            {t('nav.summary')}
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'analytics'
                ? 'bg-purple-500 text-white'
                : 'text-purple-300 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            {t('nav.analytics')}
          </button>
        </div>
        
        {/* User Info & Logout */}
        {currentUser && (
          <div className="border-t border-slate-800 pt-4 mt-auto">
            <div className="rounded-xl bg-slate-800/50 p-3 mb-3">
              <p className="text-xs text-slate-400 mb-1">{t('sidebar.loggedInAs')}</p>
              <p className="text-sm font-semibold text-white truncate">{currentUser.email}</p>
              <p className="text-xs text-purple-300 mt-1">{currentUser.role}</p>
            </div>
            
            {/* Seed Database Button - Admin Only */}
            {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
              <button
                onClick={handleSeedDatabase}
                className="w-full py-2 px-3 rounded-xl text-sm font-medium transition bg-green-500/10 text-green-300 hover:bg-green-500/20 flex items-center justify-center gap-2 mb-2"
              >
                <Plus className="h-4 w-4" />
                {t('sidebar.seedDatabase')}
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-xl text-sm font-medium transition bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              {t('sidebar.logout')}
            </button>
          </div>
        )}
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              {view === 'register' && t('nav.register')}
              {view === 'customers' && t('customer.title')}
              {view === 'trips' && t('trip.title')}
              {view === 'drivers' && t('driver.title')}
              {view === 'dispatchers' && t('nav.dispatchers')}
              {view === 'booking' && t('nav.booking')}
              {view === 'addDriver' && t('nav.addDriver')}
              {view === 'vehicles' && t('nav.vehicles')}
              {view === 'summary' && t('nav.summary')}
              {view === 'analytics' && t('reports.title')}
              {view === 'tenants' && 'Tenant Management'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 text-sm">
                {view === 'register' && t('pageDescriptions.register')}
                {view === 'customers' && t('pageDescriptions.customers')}
                {view === 'trips' && t('pageDescriptions.trips')}
                {view === 'drivers' && t('pageDescriptions.drivers')}
                {view === 'dispatchers' && t('pageDescriptions.dispatchers')}
                {view === 'booking' && t('pageDescriptions.booking')}
                {view === 'addDriver' && t('pageDescriptions.addDriver')}
                {view === 'vehicles' && t('pageDescriptions.vehicles')}
                {view === 'analytics' && t('pageDescriptions.analytics')}
                {view === 'summary' && t('pageDescriptions.summary')}
                {view === 'tenants' && 'Create and manage company tenants for different regions or businesses'}
              </p>
              {/* Active Tenant Indicator */}
              {selectedTenant && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-300">
                  🏢 {selectedTenant.name}
                </span>
              )}
            </div>
          </div>
        
          {/* Language Switcher in Header */}
          <LanguageSwitcher />
        </header>

        {view === 'register' && (
          <>
            <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10"
              >
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{t('register.customerDetailsTitle')}</h2>
                  <p className="text-sm text-slate-400">{t('register.customerDetailsSubtitle')}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <UserPlus className="h-4 w-4 text-purple-300" />
                    {t('register.nameLabel')}
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleCustomerChange}
                    placeholder={t('register.namePlaceholder')}
                    className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.name && <span className="text-xs text-red-400">{errors.name}</span>}
                </label>

                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mail className="h-4 w-4 text-purple-300" />
                    {t('register.emailLabel')}
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleCustomerChange}
                    placeholder={t('register.emailPlaceholder')}
                    className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none ${
                      errors.email ? 'border-red-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.email && <span className="text-xs text-red-400">{errors.email}</span>}
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{t('register.addressesTitle')}</h2>
                    <p className="text-sm text-slate-400">{t('register.addressesSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAddress}
                  className="flex items-center gap-2 rounded-2xl border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10"
                >
                  <Plus className="h-4 w-4" />
                  {t('register.addAddress')}
                </button>
              </div>

              <div className="space-y-4">
                {addresses.map((address, index) => (
                  <div
                    key={`address-${index}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-black/40"
                  >
                    <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <Compass className="h-5 w-5 text-blue-300" />
                        {t('register.addressCard', { number: convertDigits(index + 1) })}
                      </span>
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        {t('register.addressLineLabel')}
                        <input
                          type="text"
                          value={address.addressLine}
                          onChange={(e) => handleAddressChange(index, 'addressLine', e.target.value)}
                          placeholder={t('register.addressLinePlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        {t('register.cityLabel')}
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                          placeholder={t('register.cityPlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        {t('register.stateLabel')}
                        <input
                          type="text"
                          value={address.state}
                          onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                          placeholder={t('register.statePlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        {t('register.postalCodeLabel')}
                        <input
                          type="text"
                          value={address.postalCode}
                          onChange={(e) => handleAddressChange(index, 'postalCode', e.target.value)}
                          placeholder={t('register.postalCodePlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300 md:col-span-2">
                        {t('register.countryLabel')}
                        <input
                          type="text"
                          value={address.country}
                          onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                          placeholder={t('register.countryPlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        checked={address.isPrimary}
                        onChange={() => setPrimaryAddress(index)}
                        name="primary-address"
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                      />
                      {t('register.primaryAddress')}
                    </label>
                  </div>
                ))}
              </div>
              {errors.addresses && <span className="text-xs text-red-400">{errors.addresses}</span>}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{t('register.contactsTitle')}</h2>
                    <p className="text-sm text-slate-400">{t('register.contactsSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  <Plus className="h-4 w-4" />
                  {t('register.addContact')}
                </button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div
                    key={`contact-${index}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-black/40"
                  >
                    <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <Phone className="h-5 w-5 text-emerald-300" />
                        {t('register.contactCard', { number: convertDigits(index + 1) })}
                      </span>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        {t('register.labelLabel')}
                        <input
                          type="text"
                          value={contact.label}
                          onChange={(e) => handleContactChange(index, 'label', e.target.value)}
                          placeholder={t('register.labelPlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        {t('register.phoneLabel')}
                        <input
                          type="tel"
                          value={contact.phoneNumber}
                          onChange={(e) => handleContactChange(index, 'phoneNumber', e.target.value)}
                          placeholder={t('register.phonePlaceholder')}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        checked={contact.isPrimary}
                        onChange={() => setPrimaryContact(index)}
                        name="primary-contact"
                        className="h-4 w-4 text-emerald-500 focus:ring-emerald-500"
                      />
                      {t('register.primaryContact')}
                    </label>
                  </div>
                ))}
              </div>
              {errors.contacts && <span className="text-xs text-red-400">{errors.contacts}</span>}
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-ping rounded-full bg-white" />
                  {t('register.registering')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  {t('register.registerButton')}
                </>
              )}
            </button>

            {submitStatus && (
              <div
                className={`rounded-2xl border px-4 py-3 text-center text-sm ${
                  submitStatus.includes('Error')
                    ? 'border-red-500/50 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {submitStatus}
              </div>
            )}
          </form>

          <aside className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/10">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">{t('dashboard.liveSummary')}</h2>
              <p className="text-sm text-slate-400">{t('dashboard.realTimeStats')}</p>
            </div>

            {dashboardLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-20 rounded-2xl bg-slate-800"></div>
                  <div className="mt-4 h-20 rounded-2xl bg-slate-800"></div>
                  <div className="mt-4 h-20 rounded-2xl bg-slate-800"></div>
                </div>
              </div>
            ) : dashboardStats ? (
              <div className="space-y-4">
                {/* Customer Stats */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.customerStats')}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-lg font-semibold text-white">
                      {t('dashboard.total')}: {dashboardStats.customer_stats.total}
                    </p>
                    <p className="text-sm text-slate-400">
                      {t('dashboard.newThisWeek')}: {dashboardStats.customer_stats.recent_this_week}
                    </p>
                  </div>
                </div>

                {/* Last Login */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.lastLogin')}</p>
                  {dashboardStats.last_login.email ? (
                    <div className="mt-3 space-y-1 text-sm text-slate-300">
                      <p className="font-semibold">{dashboardStats.last_login.email}</p>
                      <p className="text-xs text-slate-400">
                        {t('dashboard.role')}: {dashboardStats.last_login.role}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(dashboardStats.last_login.last_login).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">{t('dashboard.noRecentLogins')}</p>
                  )}
                </div>

                {/* Recent Transactions */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.recentTransactions')}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {dashboardStats.recent_transactions.length > 0 ? (
                      dashboardStats.recent_transactions.map((tx, index) => (
                        <li key={tx.id} className="border-b border-slate-800 pb-2 last:border-0">
                          <p className="font-semibold">{tx.transaction_number}</p>
                          <p className="text-xs text-slate-400">
                            {tx.pickup_location} → {tx.destination_location}
                          </p>
                          <p className="text-xs text-slate-500">
                            {tx.customer_name} • {tx.status}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">{t('dashboard.noTransactions')}</li>
                    )}
                  </ul>
                </div>

                {/* Active Drivers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.activeDrivers')}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {dashboardStats.active_drivers.length > 0 ? (
                      dashboardStats.active_drivers.map((driver) => (
                        <li key={driver.id} className="flex justify-between items-center">
                          <span className="font-semibold">{driver.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            driver.is_available 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {driver.is_available ? t('dashboard.available') : t('dashboard.busy')}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">{t('dashboard.noActiveDrivers')}</li>
                    )}
                  </ul>
                </div>

                {/* Active Customers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.lastActiveCustomers')}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {dashboardStats.active_customers && dashboardStats.active_customers.length > 0 ? (
                      dashboardStats.active_customers.map((customer) => (
                        <li key={customer.id} className="flex justify-between items-center">
                          <span className="font-semibold">{customer.name}</span>
                          <span className="text-xs text-slate-400">{customer.email}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">{t('customer.noCustomers')}</li>
                    )}
                  </ul>
                </div>

                {/* Active Dispatchers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.lastActiveDispatchers')}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {dashboardStats.active_dispatchers && dashboardStats.active_dispatchers.length > 0 ? (
                      dashboardStats.active_dispatchers.map((dispatcher) => (
                        <li key={dispatcher.id} className="flex justify-between items-center">
                          <span className="font-semibold">{dispatcher.name}</span>
                          <span className="text-xs text-slate-400">{dispatcher.email}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">{t('dashboard.noActiveDispatchers')}</li>
                    )}
                  </ul>
                </div>

                {/* Recent Bookings */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('dashboard.latestBookings')}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {dashboardStats.recent_bookings.length > 0 ? (
                      dashboardStats.recent_bookings.map((booking) => (
                        <li key={booking.id} className="border-b border-slate-800 pb-2 last:border-0">
                          <p className="font-semibold">{booking.transaction_number}</p>
                          <p className="text-xs text-slate-400">
                            {t('customer.title')}: {booking.customer_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t('driver.title')}: {booking.driver_name}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">{t('dashboard.noBookings')}</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">{t('dashboard.unableToLoad')}</p>
              </div>
            )}
          </aside>
          </div>
          </>
        )}

        {view === 'customers' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">{t('customer.title')}</h2>
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : customers.length === 0 ? (
              <p className="text-slate-400">No customers found.</p>
            ) : (
              <div className="space-y-4">
                {customers.map((customer) => {
                  // Get primary contact phone
                  const primaryContact = customer.contact_numbers?.find(c => c.is_primary) || customer.contact_numbers?.[0];
                  // Get primary address
                  const primaryAddress = customer.addresses?.find(a => a.is_primary) || customer.addresses?.[0];
                  
                  return (
                  <div key={customer.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{customer.name}</h3>
                          {primaryContact?.phone_number && (
                            <a href={`tel:${primaryContact.phone_number}`} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30">
                              <Phone className="w-3 h-3" />
                              {primaryContact.phone_number}
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{customer.email}</p>
                        {primaryAddress && (
                          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[primaryAddress.address_line, primaryAddress.city, primaryAddress.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="mt-2 flex gap-4 text-xs text-slate-400">
                          <span>{customer.addresses?.length || 0} address(es)</span>
                          <span>{customer.contact_numbers?.length || 0} contact(s)</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/customers/${customer.id}`);
                            setSelectedCustomer(res.data);
                            setEditMode(null);
                          }}
                          className="rounded-xl bg-blue-500/10 px-3 py-1 text-sm text-blue-300 transition hover:bg-blue-500/20"
                        >
                          {t('buttons.view')}
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/customers/${customer.id}`);
                            setSelectedCustomer(res.data);
                            setEditMode('customer');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          {t('buttons.edit')}
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Archive this customer?')) {
                              await api.delete(`/api/customers/${customer.id}`);
                              setCustomers(customers.filter(c => c.id !== customer.id));
                            }
                          }}
                          className="rounded-xl bg-red-500/10 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/20"
                        >
                          {t('buttons.archive')}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'trips' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">{t('trip.title')}</h2>
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : trips.length === 0 ? (
              <p className="text-slate-400">No trips found.</p>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => {
                  // Get customer primary phone
                  const customerPhone = trip.customer?.contact_numbers?.find(c => c.is_primary)?.phone_number || 
                                       trip.customer?.contact_numbers?.[0]?.phone_number;
                  // Get driver phone
                  const driverPhone = trip.driver?.contact_numbers?.find(c => c.is_primary)?.phone_number || 
                                     trip.driver?.contact_numbers?.[0]?.phone_number;
                  
                  return (
                  <div key={trip.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">{trip.transaction_number || `Trip #${trip.id}`}</h3>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            trip.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                            trip.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300' :
                            trip.status === 'REQUESTED' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {trip.status}
                          </span>
                          {!trip.is_paid && trip.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300">{t('trip.unpaid')}</span>
                          )}
                        </div>
                        
                        {/* Customer & Driver Info with Phone */}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Customer:</span>
                            <span className="text-white">{trip.customer?.name || 'N/A'}</span>
                            {customerPhone && (
                              <a href={`tel:${customerPhone}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30">
                                <Phone className="w-3 h-3" />
                                {customerPhone}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Driver:</span>
                            <span className="text-white">{trip.driver?.name || 'N/A'}</span>
                            {driverPhone && (
                              <a href={`tel:${driverPhone}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/30">
                                <Phone className="w-3 h-3" />
                                {driverPhone}
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-300">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            <span className="font-semibold">₹{trip.total_amount}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-blue-400" />
                            {new Date(trip.created_at).toLocaleDateString()}
                          </span>
                          {trip.ride_duration_hours && (
                            <span className="text-slate-400">{trip.ride_duration_hours}h ride</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.pickup_location} → {trip.destination_location}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShareBooking(trip)}
                          className="rounded-xl bg-green-500/10 px-3 py-1 text-sm text-green-300 transition hover:bg-green-500/20 flex items-center gap-1"
                        >
                          <Share2 className="h-4 w-4" />
                          Share
                        </button>
                        <button 
                          onClick={() => setSelectedTrip(trip)}
                          className="rounded-xl bg-blue-500/10 px-3 py-1 text-sm text-blue-300 transition hover:bg-blue-500/20"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'addDriver' && (
          <div className="rounded-3xl border border-purple-800 bg-slate-900/80 p-6 shadow-xl shadow-purple-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">{t('driver.add')}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setSubmitStatus('');
                try {
                  const response = await api.post('/api/drivers/', {
                    name: driverForm.name,
                    addresses: [{
                      label: 'Primary',
                      address_line: driverForm.address_line,
                      city: driverForm.city,
                      state: driverForm.state,
                      postal_code: driverForm.postal_code,
                      country: driverForm.country,
                      is_primary: true,
                    }],
                    contact_numbers: [{
                      label: 'Mobile',
                      phone_number: driverForm.phone_number,
                      is_primary: true,
                    }],
                  });
                  setSubmitStatus(`Driver created: ${response.data.name} (ID: ${response.data.id})`);
                  setDriverForm({ name: '', address_line: '', city: '', state: '', postal_code: '', country: 'India', phone_number: '' });
                } catch (err) {
                  setSubmitStatus(`Error: ${err.response?.data?.detail || 'Driver creation failed'}`);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Driver Name *</span>
                  <input
                    type="text"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Phone Number *</span>
                  <input
                    type="tel"
                    value={driverForm.phone_number}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+919876543210"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-300">Address Line *</span>
                  <input
                    type="text"
                    value={driverForm.address_line}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, address_line: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">City *</span>
                  <input
                    type="text"
                    value={driverForm.city}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">State *</span>
                  <input
                    type="text"
                    value={driverForm.state}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Postal Code *</span>
                  <input
                    type="text"
                    value={driverForm.postal_code}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t('auth.country')}</span>
                  <input
                    type="text"
                    value={driverForm.country}
                    onChange={(e) => setDriverForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating Driver...' : 'Create Driver'}
              </button>
              {submitStatus && (
                <div className={`rounded-2xl border px-4 py-3 text-center text-sm ${
                  submitStatus.includes('Error')
                    ? 'border-red-500/50 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {submitStatus}
                </div>
              )}
            </form>
          </div>
        )}

        {view === 'addDispatcher' && (
          <div className="rounded-3xl border border-purple-800 bg-slate-900/80 p-6 shadow-xl shadow-purple-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">{t('dispatcher.add')}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setSubmitStatus('');
                try {
                  await api.post('/api/dispatchers/', {
                    name: dispatcherForm.name,
                    email: dispatcherForm.email,
                    contact_number: dispatcherForm.contact_number,
                  });
                  setSubmitStatus('Dispatcher created successfully!');
                  setDispatcherForm({ name: '', email: '', contact_number: '' });
                  setTimeout(() => setView('dispatchers'), 1500);
                } catch (err) {
                  setSubmitStatus(`Error: ${err.response?.data?.detail || 'Dispatcher creation failed'}`);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Dispatcher Name *</span>
                  <input
                    type="text"
                    value={dispatcherForm.name}
                    onChange={(e) => setDispatcherForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Email Address *</span>
                  <input
                    type="email"
                    value={dispatcherForm.email}
                    onChange={(e) => setDispatcherForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Contact Number *</span>
                <input
                  type="tel"
                  value={dispatcherForm.contact_number}
                  onChange={(e) => setDispatcherForm(prev => ({ ...prev, contact_number: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? 'Creating Dispatcher...' : 'Create Dispatcher'}
              </button>
              {submitStatus && (
                <div className={`rounded-2xl border px-4 py-3 text-center text-sm ${
                  submitStatus.includes('Error')
                    ? 'border-red-500/50 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {submitStatus}
                </div>
              )}
            </form>
          </div>
        )}

        {view === 'drivers' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">{t('driver.title')}</h2>
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : drivers.length === 0 ? (
              <p className="text-slate-400">No drivers found.</p>
            ) : (
              <div className="space-y-4">
                {drivers.map((driver) => {
                  const primaryPhone = driver.contact_numbers?.find(c => c.is_primary)?.phone_number || driver.contact_numbers?.[0]?.phone_number;
                  const primaryAddress = driver.addresses?.find(a => a.is_primary) || driver.addresses?.[0];
                  
                  return (
                  <div key={driver.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{driver.name}</h3>
                          {primaryPhone && (
                            <a href={`tel:${primaryPhone}`} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30">
                              <Phone className="w-3 h-3" />
                              {primaryPhone}
                            </a>
                          )}
                        </div>
                        {primaryAddress && (
                          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[primaryAddress.address_line, primaryAddress.city, primaryAddress.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="mt-2 flex gap-4 text-xs text-slate-400">
                          <span>{driver.addresses?.length || 0} address(es)</span>
                          <span>{driver.contact_numbers?.length || 0} contact(s)</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/drivers/${driver.id}`);
                            setSelectedDriver(res.data);
                            setEditMode(null);
                          }}
                          className="rounded-xl bg-blue-500/10 px-3 py-1 text-sm text-blue-300 transition hover:bg-blue-500/20"
                        >
                          {t('buttons.view')}
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/drivers/${driver.id}`);
                            setSelectedDriver(res.data);
                            setEditMode('driver');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          {t('buttons.edit')}
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Archive this driver?')) {
                              await api.delete(`/api/drivers/${driver.id}`);
                              setDrivers(drivers.filter(d => d.id !== driver.id));
                            }
                          }}
                          className="rounded-xl bg-red-500/10 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/20"
                        >
                          {t('buttons.archive')}
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'dispatchers' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white">{t('dispatcher.title')}</h2>
              <button
                onClick={() => setView('addDispatcher')}
                className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600"
              >
                <Plus className="inline h-4 w-4 mr-2" />
                {t('buttons.addDispatcher')}
              </button>
            </div>
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : dispatchers.length === 0 ? (
              <p className="text-slate-400">No dispatchers found.</p>
            ) : (
              <div className="space-y-4">
                {dispatchers.map((dispatcher) => (
                  <div key={dispatcher.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{dispatcher.name}</h3>
                        <p className="text-sm text-slate-400">{dispatcher.email}</p>
                        <p className="text-sm text-slate-300">Phone: {dispatcher.contact_number}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/dispatchers/${dispatcher.id}`);
                            setSelectedDispatcher(res.data);
                            setEditMode(null);
                          }}
                          className="rounded-xl bg-blue-500/10 px-3 py-1 text-sm text-blue-300 transition hover:bg-blue-500/20"
                        >
                          {t('buttons.view')}
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/dispatchers/${dispatcher.id}`);
                            setSelectedDispatcher(res.data);
                            setEditMode('dispatcher');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          {t('buttons.edit')}
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Archive this dispatcher?')) {
                              await api.delete(`/api/dispatchers/${dispatcher.id}`);
                              setDispatchers(dispatchers.filter(d => d.id !== dispatcher.id));
                            }
                          }}
                          className="rounded-xl bg-red-500/10 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/20"
                        >
                          {t('buttons.archive')}
                        </button>
                        <button 
                          onClick={() => {
                            setBookingForm(prev => ({ ...prev, dispatcher_id: dispatcher.id }));
                            setView('booking');
                          }}
                          className="rounded-xl bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          {t('buttons.createBooking')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'vehicles' && (
          <div className="space-y-6">
            {/* Add Vehicle Form */}
            <div className="rounded-3xl border border-cyan-800 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10">
              <h2 className="mb-6 text-2xl font-semibold text-white">{t('vehicle.add')}</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  setSubmitStatus('');
                  try {
                    const response = await api.post('/api/vehicles/', {
                      customer_id: parseInt(vehicleForm.customer_id),
                      nickname: vehicleForm.nickname,
                      vehicle_make: vehicleForm.vehicle_make,
                      vehicle_model: vehicleForm.vehicle_model,
                      vehicle_type: vehicleForm.vehicle_type,
                      is_automatic: vehicleForm.is_automatic,
                      transmission_type: vehicleForm.is_automatic ? 'automatic' : 'manual',
                      registration_number: vehicleForm.registration_number,
                    });
                    setSubmitStatus(`Vehicle added: ${response.data.nickname} (${response.data.registration_number})`);
                    setVehicleForm({
                      customer_id: '',
                      nickname: '',
                      vehicle_make: '',
                      vehicle_model: '',
                      vehicle_type: 'Sedan',
                      is_automatic: true,
                      registration_number: '',
                    });
                    // Refresh vehicles list
                    const vehRes = await api.get('/api/vehicles/');
                    setVehicles(vehRes.data);
                  } catch (err) {
                    setSubmitStatus(`Error: ${err.response?.data?.detail || 'Vehicle creation failed'}`);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="grid gap-4 md:grid-cols-2"
              >
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Customer *</span>
                  <select
                    value={vehicleForm.customer_id}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Nickname *</span>
                  <input
                    type="text"
                    value={vehicleForm.nickname}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="My Car"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Make *</span>
                  <input
                    type="text"
                    value={vehicleForm.vehicle_make}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_make: e.target.value }))}
                    placeholder="Toyota, Honda, etc."
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Model *</span>
                  <input
                    type="text"
                    value={vehicleForm.vehicle_model}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_model: e.target.value }))}
                    placeholder="Corolla, City, etc."
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">{t('vehicle.type')}</span>
                  <select
                    value={vehicleForm.vehicle_type}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_type: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="MPV">MPV</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Registration Number *</span>
                  <input
                    type="text"
                    value={vehicleForm.registration_number}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, registration_number: e.target.value.toUpperCase() }))}
                    placeholder="KA01AB1234"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white uppercase"
                    required
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={vehicleForm.is_automatic}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, is_automatic: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500"
                  />
                  Automatic Transmission
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="md:col-span-2 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {isSubmitting ? 'Adding Vehicle...' : 'Add Vehicle'}
                </button>
              </form>
              {submitStatus && (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-center text-sm ${
                  submitStatus.includes('Error')
                    ? 'border-red-500/50 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                }`}>
                  {submitStatus}
                </div>
              )}
            </div>

            {/* Vehicles List */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
              <h2 className="mb-6 text-2xl font-semibold text-white">All Vehicles</h2>
              {loading ? (
                <p className="text-slate-400">Loading...</p>
              ) : vehicles.length === 0 ? (
                <p className="text-slate-400">No vehicles found. Add a vehicle above.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{vehicle.nickname}</h3>
                          <p className="text-sm text-cyan-300 font-mono">{vehicle.registration_number}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          vehicle.is_automatic ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {vehicle.transmission_type || (vehicle.is_automatic ? 'Auto' : 'Manual')}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Make:</span> {vehicle.make}</p>
                        <p><span className="text-slate-500">Model:</span> {vehicle.model}</p>
                        <p><span className="text-slate-500">Type:</span> {vehicle.type}</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this vehicle?')) {
                              await api.delete(`/api/vehicles/${vehicle.id}`);
                              setVehicles(vehicles.filter(v => v.id !== vehicle.id));
                            }
                          }}
                          className="flex-1 rounded-xl bg-red-500/10 px-3 py-1 text-sm text-red-300 transition hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            setBookingForm(prev => ({ ...prev, vehicle_id: vehicle.id, customer_id: vehicle.customer_id }));
                            setView('booking');
                          }}
                          className="flex-1 rounded-xl bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Book Ride
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'booking' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">
              {currentUser?.role === 'CUSTOMER' ? 'Book a Ride' : 'Create New Booking'}
            </h2>
            {loading ? (
              <p className="text-slate-400">Loading data...</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  setSubmitStatus('');
                  try {
                    // For customers, use default dispatcher and driver will be assigned later
                    const bookingData = {
                      dispatcher_id: currentUser?.role === 'CUSTOMER' ? 
                        (dispatchers.length > 0 ? dispatchers[0].id : 1) : 
                        parseInt(bookingForm.dispatcher_id),
                      customer_id: currentUser?.role === 'CUSTOMER' ? 
                        currentUser.customer_id : 
                        parseInt(bookingForm.customer_id),
                      driver_id: currentUser?.role === 'CUSTOMER' ? 
                        (drivers.length > 0 ? drivers[0].id : 1) : 
                        parseInt(bookingForm.driver_id),
                      vehicle_id: currentUser?.role === 'CUSTOMER' ? 
                        (vehicles.length > 0 ? vehicles[0].id : 1) : 
                        parseInt(bookingForm.vehicle_id),
                      pickup_location: bookingForm.pickup_location,
                      destination_location: bookingForm.destination_location,
                      return_location: bookingForm.return_location || null,
                      ride_duration_hours: parseInt(bookingForm.ride_duration_hours),
                      payment_method: bookingForm.payment_method,
                      // Include expense fields
                      food_bill: parseFloat(bookingForm.food_bill) || 0,
                      outstation_bill: parseFloat(bookingForm.outstation_bill) || 0,
                      toll_fees: parseFloat(bookingForm.toll_fees) || 0,
                      accommodation_bill: parseFloat(bookingForm.accommodation_bill) || 0,
                      late_fine: parseFloat(bookingForm.late_fine) || 0,
                      pickup_location_fare: parseFloat(bookingForm.pickup_location_fare) || 0,
                      accommodation_included: bookingForm.accommodation_included,
                    };
                    
                    const response = await api.post('/api/bookings/', bookingData);
                    setSubmitStatus(`Booking created: ${response.data.transaction_number}`);
                    setBookingForm({
                      dispatcher_id: '',
                      customer_id: '',
                      driver_id: '',
                      vehicle_id: '',
                      pickup_location: '',
                      destination_location: '',
                      return_location: '',
                      ride_duration_hours: 4,
                      payment_method: 'RAZORPAY',
                      food_bill: 0,
                      outstation_bill: 0,
                      toll_fees: 0,
                      accommodation_bill: 0,
                      late_fine: 0,
                      pickup_location_fare: 0,
                      accommodation_included: false,
                    });
                  } catch (err) {
                    setSubmitStatus(`Error: ${err.response?.data?.detail || 'Booking failed'}`);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {currentUser?.role !== 'CUSTOMER' && (
                    <>
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">{t('trip.dispatcher')}</span>
                        <select
                          value={bookingForm.dispatcher_id}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, dispatcher_id: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                          required
                        >
                          <option value="">{t('forms.selectDispatcher')}</option>
                          {dispatchers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">Customer</span>
                        <select
                          value={bookingForm.customer_id}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, customer_id: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                          required
                        >
                          <option value="">Select Customer</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">Driver</span>
                        <select
                          value={bookingForm.driver_id}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, driver_id: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                          required
                        >
                          <option value="">Select Driver</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">Vehicle</span>
                        <select
                          value={bookingForm.vehicle_id}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                          required
                        >
                          <option value="">Select Vehicle</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.nickname} ({v.vehicle_make})</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {currentUser?.role === 'CUSTOMER' && (
                    <div className="md:col-span-2 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                      <p className="text-sm text-blue-300">
                        <strong>Booking as:</strong> {currentUser.customer_name || 'Customer'}
                      </p>
                      <p className="text-xs text-blue-200 mt-1">
                        A dispatcher will be assigned and driver details will be shared after confirmation.
                      </p>
                    </div>
                  )}
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Pickup Location</span>
                    <input
                      type="text"
                      value={bookingForm.pickup_location}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, pickup_location: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Destination</span>
                    <input
                      type="text"
                      value={bookingForm.destination_location}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, destination_location: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Return Location (optional)</span>
                    <input
                      type="text"
                      value={bookingForm.return_location}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, return_location: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Duration (hours)</span>
                    <input
                      type="number"
                      min="1"
                      value={bookingForm.ride_duration_hours}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, ride_duration_hours: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Payment Method</span>
                    <select
                      value={bookingForm.payment_method}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                      required
                    >
                      <option value="RAZORPAY">Razorpay</option>
                      <option value="PHONEPE">PhonePe</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </label>
                </div>

                {/* Expense Details Section */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Expense Details (Optional)</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Food Bill</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.food_bill}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, food_bill: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Outstation Bill</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.outstation_bill}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, outstation_bill: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Toll Fees</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.toll_fees}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, toll_fees: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Accommodation Bill</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.accommodation_bill}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, accommodation_bill: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Late Fine</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.late_fine}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, late_fine: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-300">Pickup Location Fare (Auto Rickshaw)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bookingForm.pickup_location_fare}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, pickup_location_fare: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={bookingForm.accommodation_included}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, accommodation_included: e.target.checked }))}
                      className="h-4 w-4 text-emerald-500 focus:ring-emerald-500"
                    />
                    Accommodation Included
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">Estimated Cost: ₹{bookingForm.ride_duration_hours * 400}</p>
                  <p className="text-xs text-slate-500">
                    Driver (75%): ₹{Math.round(bookingForm.ride_duration_hours * 400 * 0.75)} | 
                    Admin (20%): ₹{Math.round(bookingForm.ride_duration_hours * 400 * 0.20)} | 
                    Dispatcher (2%): ₹{Math.round(bookingForm.ride_duration_hours * 400 * 0.02)} |
                    Super Admin (3%): ₹{Math.round(bookingForm.ride_duration_hours * 400 * 0.03)}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
                </button>
                {submitStatus && (
                  <div className={`rounded-2xl border px-4 py-3 text-center text-sm ${
                    submitStatus.includes('Error')
                      ? 'border-red-500/50 bg-red-500/10 text-red-200'
                      : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  }`}>
                    {submitStatus}
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {view === 'analytics' && (
          <div className="space-y-6">
            {!selectedAnalyticsReport ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('reports.title')}</h2>
                <p className="text-slate-400 mb-6">{t('analytics.drillDown.clickToExpand')}</p>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div 
                    onClick={() => handleAnalyticsCardClick('overview')}
                    className="p-6 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-purple-300 mb-2">📊 {t('analytics.overview')}</h3>
                    <p className="text-sm text-slate-400">Platform-wide statistics and insights</p>
                  </div>
                  
                  <div 
                    onClick={() => handleAnalyticsCardClick('driver')}
                    className="p-6 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-blue-300 mb-2">🚗 {t('analytics.byDriver')}</h3>
                    <p className="text-sm text-slate-400">Driver earnings and performance</p>
                  </div>
                  
                  <div 
                    onClick={() => handleAnalyticsCardClick('customer')}
                    className="p-6 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-green-300 mb-2">👤 {t('analytics.byCustomer')}</h3>
                    <p className="text-sm text-slate-400">Customer spending and bookings</p>
                  </div>
                  
                  <div 
                    onClick={() => handleAnalyticsCardClick('vehicle')}
                    className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-amber-300 mb-2">🚙 {t('analytics.byVehicle')}</h3>
                    <p className="text-sm text-slate-400">Vehicle usage and revenue</p>
                  </div>
                  
                  <div 
                    onClick={() => handleAnalyticsCardClick('dispatcher')}
                    className="p-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-cyan-300 mb-2">📞 {t('analytics.byDispatcher')}</h3>
                    <p className="text-sm text-slate-400">Dispatcher commission breakdown</p>
                  </div>
                  
                  <div 
                    onClick={() => handleAnalyticsCardClick('transaction')}
                    className="p-6 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-pink-300 mb-2">💰 {t('analytics.byTransaction')}</h3>
                    <p className="text-sm text-slate-400">Transaction-level details</p>
                  </div>

                  <div 
                    onClick={() => handleAnalyticsCardClick('admin')}
                    className="p-6 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-orange-300 mb-2">⚙️ {t('analytics.byAdmin')}</h3>
                    <p className="text-sm text-slate-400">Admin commission breakdown</p>
                  </div>

                  <div 
                    onClick={() => handleAnalyticsCardClick('super_admin')}
                    className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer hover:scale-105 transform"
                  >
                    <h3 className="text-lg font-semibold text-red-300 mb-2">👑 {t('analytics.bySuperAdmin')}</h3>
                    <p className="text-sm text-slate-400">Super admin commission breakdown</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">
                    <strong className="text-white">Commission Structure:</strong> Driver 79% • Dispatcher 18% • Admin 2% • Super Admin 1%
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header with back button and time filter */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        setSelectedAnalyticsReport(null);
                        setAnalyticsData(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                    >
                      ← Back to Reports
                    </button>
                    <h2 className="text-2xl font-semibold text-white">
                      {selectedAnalyticsReport === 'driver' && '🚗 Driver Analytics'}
                      {selectedAnalyticsReport === 'customer' && '👤 Customer Analytics'}
                      {selectedAnalyticsReport === 'dispatcher' && '📞 Dispatcher Analytics'}
                      {selectedAnalyticsReport === 'admin' && '⚙️ Admin Analytics'}
                      {selectedAnalyticsReport === 'super_admin' && '👑 Super Admin Analytics'}
                      {selectedAnalyticsReport === 'transaction' && '💰 Transaction Analytics'}
                      {selectedAnalyticsReport === 'vehicle' && '🚙 Vehicle Analytics'}
                      {selectedAnalyticsReport === 'overview' && '📊 Analytics Overview'}
                    </h2>
                  </div>

                  {/* Time Period Filter */}
                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-3">Time Period</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {[
                        { label: '1 Day', value: '1day' },
                        { label: '7 Days', value: '7days' },
                        { label: '14 Days', value: '14days' },
                        { label: '30 Days', value: '30days' },
                        { label: '1 Month', value: '1month' },
                        { label: '3 Months', value: '3months' },
                        { label: '6 Months', value: '6months' },
                        { label: '1 Year', value: '1year' },
                        { label: '5 Years', value: '5years' },
                        { label: '6 Years', value: '6years' },
                        { label: 'All Time', value: 'all' }
                      ].map((period) => (
                        <button
                          key={period.value}
                          onClick={() => handleAnalyticsTimeFilterChange(period.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            analyticsTimeFilter === period.value
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Transmission Filter - Show only for vehicle analytics */}
                  {selectedAnalyticsReport === 'vehicle' && (
                    <div className="mb-6">
                      <label className="block text-sm text-slate-400 mb-3">Transmission Type</label>
                      <div className="flex gap-2">
                        {[
                          { label: 'All', value: 'all' },
                          { label: 'Automatic', value: 'automatic' },
                          { label: 'Manual', value: 'manual' }
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setVehicleTransmissionFilter(type.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                              vehicleTransmissionFilter === type.value
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {analyticsLoading && (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                      <p className="mt-4 text-slate-400">Loading analytics data...</p>
                    </div>
                  )}

                  {/* Analytics Data Display */}
                  {!analyticsLoading && analyticsData && (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      {analyticsData.summary && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {Object.entries(analyticsData.summary).map(([key, value]) => (
                            <div key={key} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                              <p className="text-xs text-slate-400 uppercase mb-1">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-2xl font-bold text-white">
                                {typeof value === 'number' && (key.includes('amount') || key.includes('revenue') || key.includes('commission') || key.includes('charges'))
                                  ? `₹${value.toLocaleString()}`
                                  : typeof value === 'number' ? value.toLocaleString() : value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Charts Section for Driver Analytics */}
                      {selectedAnalyticsReport === 'driver' && analyticsData.drivers && analyticsData.drivers.length > 0 && (
                        <>
                          {/* Charts Row */}
                          <div className="grid gap-6 lg:grid-cols-2">
                            {/* Commission Distribution Pie Chart */}
                            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                              <h3 className="text-lg font-semibold text-white mb-4">💰 Commission Distribution</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Driver (79%)', value: analyticsData.summary?.total_commission_earned || 0, color: '#10b981' },
                                      { name: 'Dispatcher (18%)', value: (analyticsData.summary?.total_revenue || 0) * 0.18, color: '#8b5cf6' },
                                      { name: 'Admin (2%)', value: (analyticsData.summary?.total_revenue || 0) * 0.02, color: '#f59e0b' },
                                      { name: 'Super Admin (1%)', value: (analyticsData.summary?.total_revenue || 0) * 0.01, color: '#ef4444' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                  >
                                    {[
                                      { name: 'Driver', color: '#10b981' },
                                      { name: 'Dispatcher', color: '#8b5cf6' },
                                      { name: 'Admin', color: '#f59e0b' },
                                      { name: 'Super Admin', color: '#ef4444' }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Payment Status Pie Chart */}
                            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                              <h3 className="text-lg font-semibold text-white mb-4">📊 Payment Status</h3>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Fully Paid', value: analyticsData.summary?.total_fully_paid_transactions || 0, color: '#10b981' },
                                      { name: 'Partially Paid', value: analyticsData.summary?.total_partially_paid_transactions || 0, color: '#f59e0b' },
                                      { name: 'Unpaid', value: analyticsData.summary?.total_unpaid_transactions || 0, color: '#ef4444' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}
                                  >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#ef4444" />
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Driver Revenue Bar Chart */}
                          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">📈 Revenue by Driver</h3>
                            <ResponsiveContainer width="100%" height={400}>
                              <BarChart data={analyticsData.drivers.slice(0, 10).map(d => ({
                                name: d.driver_name?.split(' ')[0] || `Driver ${d.driver_id}`,
                                revenue: d.total_revenue_generated || 0,
                                commission: d.commission_earned || 0,
                                paid: d.commission_paid || 0,
                                pending: d.commission_pending || 0
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                                <Tooltip 
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" name="Total Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="commission" name="Commission Earned" fill="#10b981" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Commission Paid vs Pending Bar Chart */}
                          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">💵 Commission: Paid vs Pending</h3>
                            <ResponsiveContainer width="100%" height={350}>
                              <BarChart data={analyticsData.drivers.slice(0, 10).map(d => ({
                                name: d.driver_name?.split(' ')[0] || `Driver ${d.driver_id}`,
                                paid: d.commission_paid || 0,
                                pending: d.commission_pending || 0
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                                <Tooltip 
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="paid" name="Commission Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" name="Commission Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Driver Details with Hierarchical Drill-Down */}
                          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                            <div className="p-4 border-b border-slate-700">
                              <h3 className="text-lg font-semibold text-white">🚗 Driver Details - Hierarchical Drill-Down</h3>
                              <p className="text-xs text-slate-400 mt-1">Click on any driver to view transaction details and payment history</p>
                            </div>
                            <div className="space-y-2 p-4">
                              {analyticsData.drivers.map((driver) => (
                                <div key={driver.driver_id} className="border border-slate-700 rounded-lg overflow-hidden">
                                  {/* Level 1: Driver Summary */}
                                  <div 
                                    onClick={() => toggleDriverExpand(driver.driver_id)}
                                    className="p-4 bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                          {expandedDrivers[driver.driver_id] ? '▼' : '▶'}
                                        </div>
                                        <div>
                                          <p className="font-semibold text-white text-lg">{driver.driver_name}</p>
                                          <p className="text-xs text-slate-400">ID: {driver.driver_id} • Joined: {driver.driver_created_at ? new Date(driver.driver_created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-5 gap-4 text-center">
                                        <div>
                                          <p className="text-xs text-slate-400">Revenue</p>
                                          <p className="text-emerald-300 font-semibold">₹{(driver.total_revenue_generated || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-400">Commission</p>
                                          <p className="text-purple-300 font-semibold">₹{(driver.commission_earned || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-400">Trips</p>
                                          <p className="text-white font-semibold">{driver.total_bookings || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-400">Status</p>
                                          <div className="flex gap-1 justify-center">
                                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300">{driver.fully_paid_transactions || 0}</span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300">{driver.partially_paid_transactions || 0}</span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">{driver.unpaid_transactions || 0}</span>
                                          </div>
                                        </div>
                                        <div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              fetchDriverRevenueBreakdown(driver.driver_id);
                                            }}
                                            className="px-3 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-xs font-medium"
                                          >
                                            {t('buttons.view')} Breakdown
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Level 2: Expanded Driver Details */}
                                  {expandedDrivers[driver.driver_id] && (
                                    <div className="p-4 bg-slate-900/30 border-t border-slate-700">
                                      {/* Performance Metrics */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                          <p className="text-xs text-slate-400">Commission Earned</p>
                                          <p className="text-green-300 font-bold text-lg">₹{(driver.commission_earned || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                          <p className="text-xs text-slate-400">Commission Paid</p>
                                          <p className="text-emerald-300 font-bold text-lg">₹{(driver.commission_paid || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                          <p className="text-xs text-slate-400">Commission Pending</p>
                                          <p className="text-orange-300 font-bold text-lg">₹{(driver.commission_pending || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                          <p className="text-xs text-slate-400">Completed Trips</p>
                                          <p className="text-blue-300 font-bold text-lg">{driver.completed_bookings || 0}</p>
                                        </div>
                                      </div>

                                      {/* Level 3: Transaction List */}
                                      {driver.transactions && driver.transactions.length > 0 && (
                                        <div className="mt-4">
                                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                            <span>📋</span> Transaction History ({driver.transactions.length} trips)
                                          </h4>
                                          <div className="space-y-2">
                                            {driver.transactions.map((txn, idx) => (
                                              <div key={idx} className="border border-slate-600 rounded-lg overflow-hidden">
                                                <div 
                                                  onClick={() => toggleTransactionExpand(`${driver.driver_id}-${idx}`)}
                                                  className="p-3 bg-slate-800/30 hover:bg-slate-700/30 cursor-pointer transition"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-sm">{expandedTransactions[`${driver.driver_id}-${idx}`] ? '▼' : '▶'}</span>
                                                      <div>
                                                        <p className="text-sm font-medium text-white">{txn.transaction_number || `TXN-${idx + 1}`}</p>
                                                        <p className="text-xs text-slate-400">{txn.created_at ? new Date(txn.created_at).toLocaleString() : 'N/A'}</p>
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                      <div className="text-right">
                                                        <p className="text-xs text-slate-400">Amount</p>
                                                        <p className="text-white font-semibold">₹{(txn.total_amount || 0).toLocaleString()}</p>
                                                      </div>
                                                      <div className="text-right">
                                                        <p className="text-xs text-slate-400">Commission</p>
                                                        <p className="text-purple-300 font-semibold">₹{(txn.driver_share || 0).toLocaleString()}</p>
                                                      </div>
                                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        txn.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                                                        txn.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300' :
                                                        'bg-yellow-500/20 text-yellow-300'
                                                      }`}>
                                                        {txn.status || 'PENDING'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Level 4: Transaction Details & Payment History */}
                                                {expandedTransactions[`${driver.driver_id}-${idx}`] && (
                                                  <div className="p-3 bg-slate-900/50 border-t border-slate-600 space-y-3">
                                                    {/* Route Information */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                      <div>
                                                        <p className="text-xs text-slate-400 mb-1">📍 Pickup</p>
                                                        <p className="text-sm text-white">{txn.pickup_location || 'N/A'}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-xs text-slate-400 mb-1">🎯 Destination</p>
                                                        <p className="text-sm text-white">{txn.destination_location || 'N/A'}</p>
                                                      </div>
                                                    </div>

                                                    {/* Commission Breakdown */}
                                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                                      <p className="text-xs font-semibold text-slate-300 mb-2">💰 Commission Breakdown</p>
                                                      <div className="grid grid-cols-4 gap-2 text-xs">
                                                        <div>
                                                          <p className="text-slate-400">Driver (79%)</p>
                                                          <p className="text-green-300 font-semibold">₹{(txn.driver_share || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-slate-400">Dispatcher (18%)</p>
                                                          <p className="text-purple-300 font-semibold">₹{(txn.dispatcher_share || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-slate-400">Admin (2%)</p>
                                                          <p className="text-orange-300 font-semibold">₹{(txn.admin_share || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-slate-400">Super Admin (1%)</p>
                                                          <p className="text-red-300 font-semibold">₹{(txn.super_admin_share || 0).toLocaleString()}</p>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Payment Information */}
                                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                                      <p className="text-xs font-semibold text-slate-300 mb-2">💳 Payment Details</p>
                                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                          <p className="text-slate-400">Total Amount</p>
                                                          <p className="text-white font-semibold">₹{(txn.total_amount || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-slate-400">Paid Amount</p>
                                                          <p className="text-green-300 font-semibold">₹{(txn.paid_amount || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                          <p className="text-slate-400">Payment Method</p>
                                                          <p className="text-blue-300 font-semibold">{txn.payment_method || 'N/A'}</p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {(!driver.transactions || driver.transactions.length === 0) && (
                                        <div className="text-center py-4 text-slate-400 text-sm">
                                          No transactions found for this driver
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Driver Revenue Breakdown Modal/Section */}
                      {selectedDriverForBreakdown && driverRevenueBreakdown && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-auto">
                            <div className="p-6 border-b border-slate-800">
                              <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold text-white">
                                  💰 Revenue Breakdown - {driverRevenueBreakdown.driver_name}
                                </h3>
                                <button
                                  onClick={() => {
                                    setSelectedDriverForBreakdown(null);
                                    setDriverRevenueBreakdown(null);
                                  }}
                                  className="text-slate-400 hover:text-white transition"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-6">
                              {/* Total Revenue */}
                              <div className="bg-slate-800/50 rounded-xl p-4">
                                <h4 className="text-lg font-semibold text-white mb-2">Total Revenue</h4>
                                <p className="text-3xl font-bold text-emerald-400">
                                  ₹{driverRevenueBreakdown.total_revenue.toLocaleString()}
                                </p>
                                <p className="text-sm text-slate-400 mt-1">
                                  From {driverRevenueBreakdown.transaction_count} transactions
                                </p>
                              </div>

                              {/* Revenue Breakdown Grid */}
                              <div className="grid md:grid-cols-2 gap-6">
                                {/* Driver Share */}
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                  <h5 className="text-sm font-semibold text-white mb-3">Driver Share</h5>
                                  <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-green-400">
                                      ₹{driverRevenueBreakdown.breakdown.driver_share.amount.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-slate-400">
                                      {driverRevenueBreakdown.breakdown.driver_share.percentage}
                                    </span>
                                  </div>
                                </div>

                                {/* Net Take Home */}
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                  <h5 className="text-sm font-semibold text-white mb-3">Net Take Home</h5>
                                  <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-blue-400">
                                      ₹{driverRevenueBreakdown.breakdown.net_take_home.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-slate-400">
                                      After expenses
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Expenses Section */}
                              <div className="bg-slate-800/50 rounded-xl p-4">
                                <h5 className="text-sm font-semibold text-white mb-3">Expenses</h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Food Bill:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.food_bill.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Outstation Bill:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.outstation_bill.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Toll Fees:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.toll_fees.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Accommodation Bill:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.accommodation_bill.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Late Fine:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.late_fine.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Pickup Location Fare:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.expenses.pickup_location_fare.toLocaleString()}
                                    </span>
                                  </div>
                                  {driverRevenueBreakdown.breakdown.expenses.accommodation_included && (
                                    <div className="flex justify-between text-green-400">
                                      <span>Accommodation:</span>
                                      <span className="font-medium">Included</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Registration Fee Section */}
                              <div className="bg-slate-800/50 rounded-xl p-4">
                                <h5 className="text-sm font-semibold text-white mb-3">Registration Fee</h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Registration Fee:</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.registration_fee.amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Status:</span>
                                    <span className={`font-medium ${driverRevenueBreakdown.breakdown.registration_fee.paid ? 'text-green-400' : 'text-red-400'}`}>
                                      {driverRevenueBreakdown.breakdown.registration_fee.paid ? 'Paid' : 'Unpaid'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Deducted:</span>
                                    <span className={`font-medium ${driverRevenueBreakdown.breakdown.registration_fee.deducted ? 'text-green-400' : 'text-orange-400'}`}>
                                      {driverRevenueBreakdown.breakdown.registration_fee.deducted ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  {driverRevenueBreakdown.breakdown.registration_fee.paid && driverRevenueBreakdown.breakdown.registration_fee.paid_at && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-300">Paid On:</span>
                                      <span className="text-white font-medium">
                                        {new Date(driverRevenueBreakdown.breakdown.registration_fee.paid_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  {!driverRevenueBreakdown.breakdown.registration_fee.deducted && (
                                    <div className="flex justify-between text-yellow-400">
                                      <span>One-time Deduction:</span>
                                      <span className="font-medium">
                                        ₹{driverRevenueBreakdown.breakdown.registration_fee.deduction.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {!driverRevenueBreakdown.breakdown.registration_fee.paid && user?.role === 'admin' && (
                                  <button
                                    onClick={() => {
                                      // Handle registration fee payment
                                      if (confirm(`Mark registration fee of ₹${driverRevenueBreakdown.breakdown.registration_fee.amount} as paid for ${driverRevenueBreakdown.driver_name}?`)) {
                                        api.post(`/api/drivers/${driverRevenueBreakdown.driver_id}/pay-registration-fee`, {
                                          payment_id: `manual_${Date.now()}`
                                        }).then(() => {
                                          alert('Registration fee marked as paid!');
                                          // Refresh the breakdown
                                          fetchDriverRevenueBreakdown(driverRevenueBreakdown.driver_id);
                                        }).catch(err => {
                                          alert('Failed to mark registration fee as paid: ' + (err.response?.data?.detail || err.message));
                                        });
                                      }
                                    }}
                                    className="mt-3 w-full px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition text-sm font-medium"
                                  >
                                    Mark Registration Fee as Paid
                                  </button>
                                )}
                              </div>

                              {/* Commission Breakdown */}
                              <div className="bg-slate-800/50 rounded-xl p-4">
                                <h5 className="text-sm font-semibold text-white mb-3">Platform Commissions</h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Super Admin (1%):</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.commissions.super_admin.amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Dispatcher (18%):</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.commissions.dispatcher.amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-300">Admin (2%):</span>
                                    <span className="text-white font-medium">
                                      ₹{driverRevenueBreakdown.breakdown.commissions.admin.amount.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Generic data display for other report types */}
                      {selectedAnalyticsReport !== 'driver' && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                          <pre className="text-sm text-slate-300 overflow-auto max-h-[600px]">
                            {JSON.stringify(analyticsData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Data State - Only show for driver analytics when drivers array is empty and no error */}
                  {!analyticsLoading && analyticsData && selectedAnalyticsReport === 'driver' && analyticsData.drivers && analyticsData.drivers.length === 0 && !analyticsData.error && (
                    <div className="text-center py-12 rounded-xl border border-amber-500/30 bg-amber-500/10 p-8">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-xl font-semibold text-amber-300 mb-2">No Data Available</h3>
                      <p className="text-slate-400 mb-4">
                        {analyticsData.message || 'No records found for the selected time period.'}
                      </p>
                      <div className="text-sm text-slate-500 space-y-2">
                        <p>💡 <strong>Tip:</strong> Try the following:</p>
                        <ul className="list-disc list-inside text-left max-w-md mx-auto">
                          <li>Create some bookings first using "New Booking"</li>
                          <li>Try selecting "All Time" as the time period</li>
                          <li>Check if you have the necessary permissions</li>
                          <li>Verify that transactions exist in the system</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {!analyticsLoading && analyticsData && analyticsData.error && (
                    <div className="text-center py-12 rounded-xl border border-red-500/30 bg-red-500/10 p-8">
                      <div className="text-6xl mb-4">⚠️</div>
                      <h3 className="text-xl font-semibold text-red-300 mb-2">Error Loading Analytics</h3>
                      <p className="text-slate-400 mb-4">{analyticsData.message}</p>
                      <button 
                        onClick={() => fetchAnalyticsData(selectedAnalyticsReport, analyticsTimeFilter)}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {!analyticsLoading && !analyticsData && (
                    <div className="text-center py-12 rounded-xl border border-red-500/30 bg-red-500/10 p-8">
                      <div className="text-6xl mb-4">⚠️</div>
                      <h3 className="text-xl font-semibold text-red-300 mb-2">Error Loading Data</h3>
                      <p className="text-slate-400">
                        Failed to fetch analytics data. Please check the console for details.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'summary' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold text-white">Filters</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Dispatcher</span>
                  <select
                    value={filters.dispatcher_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, dispatcher_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="">All Dispatchers</option>
                    {dispatchers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Driver</span>
                  <select
                    value={filters.driver_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, driver_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="">All Drivers</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Customer</span>
                  <select
                    value={filters.customer_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="">All Customers</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Transaction #</span>
                  <input
                    type="text"
                    value={filters.transaction_number}
                    onChange={(e) => setFilters(prev => ({ ...prev, transaction_number: e.target.value }))}
                    placeholder="TXN-00001"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">Date Preset</span>
                  <select
                    value={filters.date_preset}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_preset: e.target.value, date_from: '', date_to: '' }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="1year">Last 1 Year</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">From Date</span>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value, date_preset: '' }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-400">To Date</span>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value, date_preset: '' }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    onClick={fetchSummaryData}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setFilters({ dispatcher_id: '', driver_id: '', customer_id: '', transaction_number: '', date_preset: '', date_from: '', date_to: '' });
                      setTimeout(fetchSummaryData, 100);
                    }}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-400">Loading summary...</p>
            ) : (
              <>
                {summaryData && (
                  <div className="rounded-3xl border border-amber-800 bg-slate-900/80 p-6 shadow-xl shadow-amber-500/10">
                    <h2 className="mb-4 text-2xl font-semibold text-white">Transaction Overview</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-slate-400">Total Transactions</p>
                        <p className="text-3xl font-bold text-white">{summaryData.total_transactions}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-slate-400">Completed</p>
                        <p className="text-3xl font-bold text-emerald-400">{summaryData.completed_transactions}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-slate-400">Paid</p>
                        <p className="text-3xl font-bold text-blue-400">{summaryData.paid_transactions}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-slate-400">Pending</p>
                        <p className="text-3xl font-bold text-amber-400">{summaryData.pending_transactions}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-emerald-400">Total Amount</p>
                        <p className="text-2xl font-bold text-emerald-300">₹{summaryData.total_amount?.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-blue-800 bg-blue-950/30 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-blue-400">Paid Amount</p>
                        <p className="text-2xl font-bold text-blue-300">₹{summaryData.paid_amount?.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-red-800 bg-red-950/30 p-4 text-center">
                        <p className="text-xs uppercase tracking-wider text-red-400">Due Amount</p>
                        <p className="text-2xl font-bold text-red-300">₹{summaryData.due_amount?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-purple-800 bg-purple-950/30 p-4">
                      <p className="text-xs uppercase tracking-wider text-purple-400 mb-3 text-center">Commission Breakdown</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-purple-300">75%</p>
                          <p className="text-xs text-purple-400">Driver</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-purple-300">20%</p>
                          <p className="text-xs text-purple-400">Admin</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-purple-300">2%</p>
                          <p className="text-xs text-purple-400">Dispatcher</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-purple-300">3%</p>
                          <p className="text-xs text-purple-400">Super Admin</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Commission Breakdown Cards - Click to see details */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <button
                    onClick={() => setSelectedBreakdown('customer')}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-amber-300 font-semibold">Customer</span>
                      <span className="text-xs bg-amber-500/30 text-amber-200 px-2 py-1 rounded-lg">100%</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">₹{commissionBreakdown?.customer?.total?.toLocaleString() || 0}</p>
                    <p className="text-xs text-amber-400 mt-1">Click for details</p>
                  </button>

                  <button
                    onClick={() => setSelectedBreakdown('driver')}
                    className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/20 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-300 font-semibold">Driver</span>
                      <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-1 rounded-lg">75%</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">₹{commissionBreakdown?.driver?.total || 0}</p>
                    <p className="text-xs text-emerald-400 mt-1">Click for details</p>
                  </button>

                  <button
                    onClick={() => setSelectedBreakdown('admin')}
                    className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-left hover:bg-blue-500/20 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300 font-semibold">Admin</span>
                      <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-lg">20%</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">₹{commissionBreakdown?.admin?.total || 0}</p>
                    <p className="text-xs text-blue-400 mt-1">Click for details</p>
                  </button>

                  <button
                    onClick={() => setSelectedBreakdown('dispatcher')}
                    className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-left hover:bg-purple-500/20 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300 font-semibold">Dispatcher</span>
                      <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-lg">2%</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">₹{commissionBreakdown?.dispatcher?.total || 0}</p>
                    <p className="text-xs text-purple-400 mt-1">Click for details</p>
                  </button>

                  <button
                    onClick={() => setSelectedBreakdown('super_admin')}
                    className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 text-left hover:bg-pink-500/20 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-pink-300 font-semibold">Super Admin</span>
                      <span className="text-xs bg-pink-500/30 text-pink-200 px-2 py-1 rounded-lg">3%</span>
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">₹{commissionBreakdown?.super_admin?.total || 0}</p>
                    <p className="text-xs text-pink-400 mt-1">Click for details</p>
                  </button>
                </div>

                {/* Detailed Breakdown Modal */}
                {selectedBreakdown && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedBreakdown(null)}>
                    <div className="bg-slate-900 rounded-3xl p-6 max-w-4xl w-full mx-4 border border-slate-700 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">
                          {selectedBreakdown === 'customer' && '👤 Customer Bifurcation (100%)'}
                          {selectedBreakdown === 'driver' && '🚗 Driver Bifurcation (75%)'}
                          {selectedBreakdown === 'admin' && '🏢 Admin Bifurcation (20%)'}
                          {selectedBreakdown === 'dispatcher' && '📞 Dispatcher Bifurcation (2%)'}
                          {selectedBreakdown === 'super_admin' && '👑 Super Admin Bifurcation (3%)'}
                          {selectedBreakdown === 'transaction' && '📋 Transaction Breakdown (All)'}
                          {selectedBreakdown === 'payment' && '💳 Payment Settlements'}
                        </h2>
                        <button onClick={() => setSelectedBreakdown(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                      </div>

                      {/* Customer Breakdown */}
                      {selectedBreakdown === 'customer' && (
                        <div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <p className="text-amber-400 text-sm">Total Revenue (100%)</p>
                              <p className="text-2xl font-bold text-white">₹{commissionBreakdown?.customer?.total?.toLocaleString() || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-sm">Paid Amount</p>
                              <p className="text-2xl font-bold text-emerald-300">₹{commissionBreakdown?.customer?.paid?.toLocaleString() || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-sm">Due Amount</p>
                              <p className="text-2xl font-bold text-red-300">₹{commissionBreakdown?.customer?.due?.toLocaleString() || 0}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-white mb-3">Grouped by Customer - Amount Split</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {customerSummary.filter(c => c.total_trips > 0).map((c) => {
                              const total = parseFloat(c.total_amount) || 0;
                              const driverShare = (total * 0.75).toFixed(2);
                              const adminShare = (total * 0.20).toFixed(2);
                              const dispatcherShare = (total * 0.02).toFixed(2);
                              const superAdminShare = (total * 0.03).toFixed(2);
                              
                              return (
                              <div key={c.customer_id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-lg text-white">{c.name}</p>
                                    <p className="text-xs text-slate-400">{c.email} • ID: {c.customer_id}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-amber-300">₹{c.total_amount}</p>
                                    <p className="text-xs text-slate-400">{c.total_trips} trips</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400">Driver 75%</p>
                                    <p className="text-sm font-bold text-emerald-300">₹{driverShare}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-xs text-blue-400">Admin 20%</p>
                                    <p className="text-sm font-bold text-blue-300">₹{adminShare}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-400">Dispatcher 2%</p>
                                    <p className="text-sm font-bold text-purple-300">₹{dispatcherShare}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                                    <p className="text-xs text-pink-400">Super Admin 3%</p>
                                    <p className="text-sm font-bold text-pink-300">₹{superAdminShare}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-between text-xs">
                                  <span className="text-emerald-400">Paid: ₹{c.paid_amount}</span>
                                  <span className="text-red-400">Due: ₹{c.due_amount}</span>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Driver Breakdown */}
                      {selectedBreakdown === 'driver' && (
                        <div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-sm">Total Earnings (75%)</p>
                              <p className="text-2xl font-bold text-white">₹{commissionBreakdown?.driver?.total || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                              <p className="text-blue-400 text-sm">Paid to Drivers</p>
                              <p className="text-2xl font-bold text-blue-300">₹{commissionBreakdown?.driver?.paid || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-sm">Due to Drivers</p>
                              <p className="text-2xl font-bold text-red-300">₹{commissionBreakdown?.driver?.due || 0}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-white mb-3">Grouped by Driver - 75% Share Details</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {driverSummary.filter(d => d.total_trips > 0).map((d) => {
                              const driverEarnings = parseFloat(d.total_earnings) || 0;
                              const tripRevenue = (driverEarnings / 0.75).toFixed(2); // Calculate original amount
                              
                              return (
                              <div key={d.driver_id} className="rounded-xl border border-emerald-700/50 bg-slate-800/50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-lg text-white">{d.name}</p>
                                    <p className="text-xs text-slate-400">{d.contact_number} • ID: {d.driver_id}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-emerald-300">₹{d.total_earnings}</p>
                                    <p className="text-xs text-slate-400">75% of ₹{tripRevenue}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                                    <p className="text-xs text-amber-400">Total Trips</p>
                                    <p className="text-lg font-bold text-amber-300">{d.total_trips}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                                    <p className="text-xs text-blue-400">Paid</p>
                                    <p className="text-lg font-bold text-blue-300">₹{d.paid_earnings}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                                    <p className="text-xs text-red-400">Due</p>
                                    <p className="text-lg font-bold text-red-300">₹{d.due_earnings}</p>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Admin Breakdown */}
                      {selectedBreakdown === 'admin' && (
                        <div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                              <p className="text-blue-400 text-sm">Total Admin Share (20%)</p>
                              <p className="text-2xl font-bold text-white">₹{commissionBreakdown?.admin?.total || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-sm">Paid</p>
                              <p className="text-2xl font-bold text-emerald-300">₹{commissionBreakdown?.admin?.paid || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-sm">Due</p>
                              <p className="text-2xl font-bold text-red-300">₹{commissionBreakdown?.admin?.due || 0}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-white mb-3">Grouped by Transaction - Admin 20% Share</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {transactionSummary.map((t) => {
                              const total = parseFloat(t.total_amount) || 0;
                              const adminShare = (total * 0.20).toFixed(2);
                              const driverShare = (total * 0.75).toFixed(2);
                              const dispatcherShare = (total * 0.02).toFixed(2);
                              const superAdminShare = (total * 0.03).toFixed(2);
                              
                              return (
                              <div key={t.id} className="rounded-xl border border-blue-700/50 bg-slate-800/50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-lg text-white font-mono">{t.transaction_number}</p>
                                    <p className="text-xs text-slate-400">{t.customer_name} • {t.driver_name}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                      {t.status}
                                    </span>
                                    <p className="text-lg font-bold text-blue-300 mt-1">₹{adminShare}</p>
                                    <p className="text-xs text-slate-400">20% of ₹{total}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                  <div className="p-1 rounded bg-emerald-500/10">
                                    <span className="text-emerald-400">Driver: ₹{driverShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-blue-500/20 border border-blue-400/50">
                                    <span className="text-blue-300 font-bold">Admin: ₹{adminShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-purple-500/10">
                                    <span className="text-purple-400">Dispatcher: ₹{dispatcherShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-pink-500/10">
                                    <span className="text-pink-400">Super: ₹{superAdminShare}</span>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dispatcher Breakdown */}
                      {selectedBreakdown === 'dispatcher' && (
                        <div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                              <p className="text-purple-400 text-sm">Total Commission (2%)</p>
                              <p className="text-2xl font-bold text-white">₹{commissionBreakdown?.dispatcher?.total || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                              <p className="text-blue-400 text-sm">Paid</p>
                              <p className="text-2xl font-bold text-blue-300">₹{commissionBreakdown?.dispatcher?.paid || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-sm">Due</p>
                              <p className="text-2xl font-bold text-red-300">₹{commissionBreakdown?.dispatcher?.due || 0}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-white mb-3">Grouped by Dispatcher - 2% Commission Details</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {dispatcherSummary.filter(d => d.total_bookings > 0).map((d) => {
                              const dispatcherEarnings = parseFloat(d.total_commission) || 0;
                              const bookingRevenue = (dispatcherEarnings / 0.02).toFixed(2); // Calculate original amount
                              
                              return (
                              <div key={d.dispatcher_id} className="rounded-xl border border-purple-700/50 bg-slate-800/50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-lg text-white">{d.name}</p>
                                    <p className="text-xs text-slate-400">{d.email} • ID: {d.dispatcher_id}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-purple-300">₹{d.total_commission}</p>
                                    <p className="text-xs text-slate-400">2% of ₹{bookingRevenue}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                                    <p className="text-xs text-amber-400">Total Bookings</p>
                                    <p className="text-lg font-bold text-amber-300">{d.total_bookings}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                                    <p className="text-xs text-blue-400">Paid</p>
                                    <p className="text-lg font-bold text-blue-300">₹{d.paid_commission}</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                                    <p className="text-xs text-red-400">Due</p>
                                    <p className="text-lg font-bold text-red-300">₹{d.due_commission}</p>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Super Admin Breakdown */}
                      {selectedBreakdown === 'super_admin' && (
                        <div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30">
                              <p className="text-pink-400 text-sm">Total Super Admin Share (3%)</p>
                              <p className="text-2xl font-bold text-white">₹{commissionBreakdown?.super_admin?.total || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-sm">Paid</p>
                              <p className="text-2xl font-bold text-emerald-300">₹{commissionBreakdown?.super_admin?.paid || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-sm">Due</p>
                              <p className="text-2xl font-bold text-red-300">₹{commissionBreakdown?.super_admin?.due || 0}</p>
                            </div>
                          </div>
                          <h3 className="font-semibold text-white mb-3">Grouped by Transaction - Super Admin 3% Share</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {transactionSummary.map((t) => {
                              const total = parseFloat(t.total_amount) || 0;
                              const superAdminShare = (total * 0.03).toFixed(2);
                              const driverShare = (total * 0.75).toFixed(2);
                              const adminShare = (total * 0.20).toFixed(2);
                              const dispatcherShare = (total * 0.02).toFixed(2);
                              
                              return (
                              <div key={t.id} className="rounded-xl border border-pink-700/50 bg-slate-800/50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-lg text-white font-mono">{t.transaction_number}</p>
                                    <p className="text-xs text-slate-400">{t.customer_name} • {t.driver_name}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                      {t.status}
                                    </span>
                                    <p className="text-lg font-bold text-pink-300 mt-1">₹{superAdminShare}</p>
                                    <p className="text-xs text-slate-400">3% of ₹{total}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                  <div className="p-1 rounded bg-emerald-500/10">
                                    <span className="text-emerald-400">Driver: ₹{driverShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-blue-500/10">
                                    <span className="text-blue-400">Admin: ₹{adminShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-purple-500/10">
                                    <span className="text-purple-400">Dispatcher: ₹{dispatcherShare}</span>
                                  </div>
                                  <div className="p-1 rounded bg-pink-500/20 border border-pink-400/50">
                                    <span className="text-pink-300 font-bold">Super: ₹{superAdminShare}</span>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Transaction Breakdown - Deep Dive */}
                      {selectedBreakdown === 'transaction' && (
                        <div>
                          {/* Summary Stats */}
                          <div className="grid grid-cols-4 gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                              <p className="text-cyan-400 text-xs">Total Bookings</p>
                              <p className="text-xl font-bold text-white">{transactionSummary.length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-xs">Completed</p>
                              <p className="text-xl font-bold text-emerald-300">{transactionSummary.filter(t => t.status === 'COMPLETED').length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <p className="text-amber-400 text-xs">In Progress</p>
                              <p className="text-xl font-bold text-amber-300">{transactionSummary.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-xs">Cancelled</p>
                              <p className="text-xl font-bold text-red-300">{transactionSummary.filter(t => t.status === 'CANCELLED').length}</p>
                            </div>
                          </div>

                          {/* Financial Overview */}
                          <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                              <p className="text-cyan-400 text-sm">Total Revenue</p>
                              <p className="text-2xl font-bold text-white">₹{transactionSummary.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                              <p className="text-emerald-400 text-sm">Total Collected</p>
                              <p className="text-2xl font-bold text-emerald-300">₹{transactionSummary.reduce((sum, t) => sum + (parseFloat(t.paid_amount) || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                              <p className="text-red-400 text-sm">Total Pending</p>
                              <p className="text-2xl font-bold text-red-300">₹{transactionSummary.reduce((sum, t) => sum + (parseFloat(t.due_amount) || 0), 0).toLocaleString()}</p>
                            </div>
                          </div>

                          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <span>📋</span> All Bookings - Deep Dive Breakdown
                          </h3>
                          
                          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                            {transactionSummary.map((t) => {
                              const total = parseFloat(t.total_amount) || 0;
                              const paid = parseFloat(t.paid_amount) || 0;
                              const due = parseFloat(t.due_amount) || 0;
                              const driverShare = (total * 0.75).toFixed(2);
                              const adminShare = (total * 0.20).toFixed(2);
                              const dispatcherShare = (total * 0.02).toFixed(2);
                              const superAdminShare = (total * 0.03).toFixed(2);
                              const driverPaid = (paid * 0.75).toFixed(2);
                              const adminPaid = (paid * 0.20).toFixed(2);
                              const dispatcherPaid = (paid * 0.02).toFixed(2);
                              const superAdminPaid = (paid * 0.03).toFixed(2);
                              
                              return (
                              <div key={t.id} className="rounded-2xl border-2 border-cyan-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 hover:border-cyan-500/70 transition-all">
                                {/* Header with TXN ID and Status */}
                                <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-700">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-cyan-400 text-xs">BOOKING ID:</span>
                                      <p className="font-bold text-xl text-white font-mono tracking-wider">{t.transaction_number}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Created: {t.created_at ? new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      t.status === 'COMPLETED' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 
                                      t.status === 'CANCELLED' ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 
                                      t.status === 'DRIVER_ACCEPTED' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' :
                                      t.status === 'ENROUTE_TO_PICKUP' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' :
                                      'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                    }`}>
                                      {t.status?.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                </div>

                                {/* Parties Involved */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-amber-400 text-xs mb-1">👤 CUSTOMER</p>
                                    <p className="font-semibold text-white text-sm">{t.customer_name || 'N/A'}</p>
                                    <p className="text-xs text-slate-400">ID: {t.customer_id || '-'}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-emerald-400 text-xs mb-1">🚗 DRIVER</p>
                                    <p className="font-semibold text-white text-sm">{t.driver_name || 'N/A'}</p>
                                    <p className="text-xs text-slate-400">ID: {t.driver_id || '-'}</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-purple-400 text-xs mb-1">📞 DISPATCHER</p>
                                    <p className="font-semibold text-white text-sm">{t.dispatcher_name || 'N/A'}</p>
                                    <p className="text-xs text-slate-400">ID: {t.dispatcher_id || '-'}</p>
                                  </div>
                                </div>

                                {/* Route & Duration Info */}
                                <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600 mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <p className="text-slate-400 text-xs">📍 PICKUP</p>
                                      <p className="text-white text-sm font-medium">{t.pickup_location || t.pickup_address || 'Location not specified'}</p>
                                    </div>
                                    <div className="text-slate-500">→</div>
                                    <div className="flex-1">
                                      <p className="text-slate-400 text-xs">📍 DROP</p>
                                      <p className="text-white text-sm font-medium">{t.dropoff_location || t.dropoff_address || 'Location not specified'}</p>
                                    </div>
                                    <div className="text-center px-4 border-l border-slate-600">
                                      <p className="text-slate-400 text-xs">⏱️ DURATION</p>
                                      <p className="text-cyan-300 font-bold">{t.duration_hours || t.hours || '-'} hrs</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Total Amount Highlight */}
                                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 mb-4">
                                  <p className="text-cyan-400 text-sm">TOTAL BOOKING AMOUNT</p>
                                  <p className="text-4xl font-bold text-white">₹{total.toLocaleString()}</p>
                                  <div className="flex justify-center gap-6 mt-2 text-sm">
                                    <span className="text-emerald-400">✓ Paid: ₹{paid.toLocaleString()}</span>
                                    <span className="text-red-400">⏳ Due: ₹{due.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Commission Breakdown - Detailed */}
                                <div className="mb-3">
                                  <p className="text-slate-400 text-xs mb-2 font-semibold">💰 COMMISSION SPLIT BREAKDOWN</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                      <p className="text-emerald-400 text-xs font-semibold">🚗 DRIVER (75%)</p>
                                      <p className="text-lg font-bold text-emerald-300">₹{driverShare}</p>
                                      <div className="mt-1 pt-1 border-t border-emerald-500/30 text-xs">
                                        <span className="text-emerald-400">Paid: ₹{driverPaid}</span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                      <p className="text-blue-400 text-xs font-semibold">🏢 ADMIN (20%)</p>
                                      <p className="text-lg font-bold text-blue-300">₹{adminShare}</p>
                                      <div className="mt-1 pt-1 border-t border-blue-500/30 text-xs">
                                        <span className="text-blue-400">Paid: ₹{adminPaid}</span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                      <p className="text-purple-400 text-xs font-semibold">📞 DISPATCHER (2%)</p>
                                      <p className="text-lg font-bold text-purple-300">₹{dispatcherShare}</p>
                                      <div className="mt-1 pt-1 border-t border-purple-500/30 text-xs">
                                        <span className="text-purple-400">Paid: ₹{dispatcherPaid}</span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30">
                                      <p className="text-pink-400 text-xs font-semibold">👑 SUPER ADMIN (3%)</p>
                                      <p className="text-lg font-bold text-pink-300">₹{superAdminShare}</p>
                                      <div className="mt-1 pt-1 border-t border-pink-500/30 text-xs">
                                        <span className="text-pink-400">Paid: ₹{superAdminPaid}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Status Bar */}
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">Payment Progress</span>
                                    <span className="text-slate-400">{total > 0 ? ((paid / total) * 100).toFixed(0) : 0}% Collected</span>
                                  </div>
                                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                                      style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Payment Breakdown */}
                      {selectedBreakdown === 'payment' && paymentSummary && (
                        <div>
                          {/* Summary Stats */}
                          <div className="grid grid-cols-4 gap-3 mb-6">
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                              <p className="text-rose-400 text-xs">Total Settlements</p>
                              <p className="text-2xl font-bold text-white">{paymentSummary.total_payments}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                              <p className="text-emerald-400 text-xs">Success</p>
                              <p className="text-2xl font-bold text-emerald-300">{paymentSummary.success_count}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              <p className="text-amber-400 text-xs">Pending</p>
                              <p className="text-2xl font-bold text-amber-300">{paymentSummary.pending_count}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-red-400 text-xs">Failed</p>
                              <p className="text-2xl font-bold text-red-300">{paymentSummary.failed_count}</p>
                            </div>
                          </div>

                          {/* Total Amount */}
                          <div className="text-center p-4 rounded-xl bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-purple-500/20 border border-rose-500/30 mb-6">
                            <p className="text-rose-400 text-sm">TOTAL SETTLEMENT AMOUNT</p>
                            <p className="text-4xl font-bold text-white">₹{paymentSummary.total_amount.toLocaleString()}</p>
                          </div>

                          {/* By Payment Method */}
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">By Payment Method</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {paymentSummary.by_method?.map((m, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${
                                  m.method === 'RAZORPAY' ? 'bg-blue-500/10 border-blue-500/30' :
                                  m.method === 'CASH' ? 'bg-green-500/10 border-green-500/30' :
                                  'bg-purple-500/10 border-purple-500/30'
                                }`}>
                                  <p className={`text-xs mb-1 ${
                                    m.method === 'RAZORPAY' ? 'text-blue-400' :
                                    m.method === 'CASH' ? 'text-green-400' :
                                    'text-purple-400'
                                  }`}>{m.method === 'RAZORPAY' ? '💳 RAZORPAY' : m.method === 'CASH' ? '💵 CASH' : '📱 PHONEPE'}</p>
                                  <p className="text-xl font-bold text-white">{m.count} payments</p>
                                  <p className="text-sm text-slate-300">₹{m.success_amount.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* By Payer Type */}
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">By Payer Type</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {paymentSummary.by_payer?.map((p, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${
                                  p.payer_type === 'CUSTOMER' ? 'bg-amber-500/10 border-amber-500/30' :
                                  p.payer_type === 'DRIVER' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                  p.payer_type === 'ADMIN' ? 'bg-blue-500/10 border-blue-500/30' :
                                  'bg-pink-500/10 border-pink-500/30'
                                }`}>
                                  <p className={`text-xs mb-1 ${
                                    p.payer_type === 'CUSTOMER' ? 'text-amber-400' :
                                    p.payer_type === 'DRIVER' ? 'text-emerald-400' :
                                    p.payer_type === 'ADMIN' ? 'text-blue-400' :
                                    'text-pink-400'
                                  }`}>{p.payer_type}</p>
                                  <p className="text-xl font-bold text-white">{p.count} payments</p>
                                  <p className="text-sm text-slate-300">₹{p.success_amount.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Detailed Payment List */}
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">Settlement Details</h4>
                            <div className="max-h-[40vh] overflow-y-auto space-y-3">
                              {paymentSummary.payments?.map((payment) => (
                                <div key={payment.id} className="p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <p className="font-semibold text-white">
                                        Settlement #{payment.id}
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                          payment.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' :
                                          payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                                          'bg-red-500/20 text-red-300'
                                        }`}>{payment.status}</span>
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {payment.created_at ? new Date(payment.created_at).toLocaleString() : '-'}
                                      </p>
                                    </div>
                                    <p className="text-xl font-bold text-rose-300">₹{payment.amount.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs">Transaction</p>
                                      <p className="text-cyan-300 font-mono">{payment.transaction_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Customer</p>
                                      <p className="text-amber-300">{payment.customer_name || 'N/A'} (ID: {payment.customer_id || '-'})</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Method</p>
                                      <p className={`${
                                        payment.payment_method === 'RAZORPAY' ? 'text-blue-300' :
                                        payment.payment_method === 'CASH' ? 'text-green-300' :
                                        'text-purple-300'
                                      }`}>{payment.payment_method === 'RAZORPAY' ? '💳' : payment.payment_method === 'CASH' ? '💵' : '📱'} {payment.payment_method}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Payer Type</p>
                                      <p className="text-slate-300">{payment.payer_type}</p>
                                    </div>
                                  </div>

                                  {payment.razorpay_payment_id && (
                                    <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                      <p className="text-blue-400 text-xs">Razorpay Details</p>
                                      <p className="text-xs text-slate-300 font-mono">Order: {payment.razorpay_order_id}</p>
                                      <p className="text-xs text-slate-300 font-mono">Payment: {payment.razorpay_payment_id}</p>
                                    </div>
                                  )}

                                  {payment.notes && (
                                    <div className="mt-2 text-xs text-slate-400">
                                      <span className="text-slate-500">Notes:</span> {payment.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {(!paymentSummary.payments || paymentSummary.payments.length === 0) && (
                                <p className="text-center text-slate-400 py-6">No payment settlements found.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedBreakdown(null)}
                        className="mt-6 w-full py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                  <div 
                    onClick={() => setSelectedBreakdown('customer')}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">By Customer</h3>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">100%</span>
                    </div>
                    <p className="text-xs text-amber-400 mb-3">Click for detailed report →</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customerSummary.filter(c => c.total_trips > 0).slice(0, 5).map((c) => (
                        <div key={c.customer_id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.total_trips} trips</p>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-emerald-300">₹{c.total_amount}</span>
                            <span className="text-red-300">Due: ₹{c.due_amount}</span>
                          </div>
                        </div>
                      ))}
                      {customerSummary.filter(c => c.total_trips > 0).length > 5 && (
                        <p className="text-xs text-center text-amber-400 py-2">+{customerSummary.filter(c => c.total_trips > 0).length - 5} more...</p>
                      )}
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedBreakdown('driver')}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">By Driver</h3>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg">75%</span>
                    </div>
                    <p className="text-xs text-emerald-400 mb-3">Click for detailed report →</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {driverSummary.filter(d => d.total_trips > 0).slice(0, 5).map((d) => (
                        <div key={d.driver_id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="font-medium text-white">{d.name}</p>
                          <p className="text-xs text-slate-400">{d.total_trips} trips</p>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-emerald-300">₹{d.total_earnings}</span>
                            <span className="text-red-300">Due: ₹{d.due_earnings}</span>
                          </div>
                        </div>
                      ))}
                      {driverSummary.filter(d => d.total_trips > 0).length > 5 && (
                        <p className="text-xs text-center text-emerald-400 py-2">+{driverSummary.filter(d => d.total_trips > 0).length - 5} more...</p>
                      )}
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedBreakdown('dispatcher')}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-purple-500/50 hover:shadow-purple-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">By Dispatcher</h3>
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">2%</span>
                    </div>
                    <p className="text-xs text-purple-400 mb-3">Click for detailed report →</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dispatcherSummary.filter(d => d.total_bookings > 0).slice(0, 5).map((d) => (
                        <div key={d.dispatcher_id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <p className="font-medium text-white">{d.name}</p>
                          <p className="text-xs text-slate-400">{d.total_bookings} bookings</p>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-emerald-300">₹{d.total_commission}</span>
                            <span className="text-red-300">Due: ₹{d.due_commission}</span>
                          </div>
                        </div>
                      ))}
                      {dispatcherSummary.filter(d => d.total_bookings > 0).length > 5 && (
                        <p className="text-xs text-center text-purple-400 py-2">+{dispatcherSummary.filter(d => d.total_bookings > 0).length - 5} more...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Group By Cards - Admin & Super Admin */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div 
                    onClick={() => setSelectedBreakdown('admin')}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">By Admin</h3>
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg">20%</span>
                    </div>
                    <p className="text-xs text-blue-400 mb-3">Click for detailed report →</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-400">Total</p>
                        <p className="text-lg font-bold text-blue-300">₹{commissionBreakdown?.admin?.total || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-emerald-400">Paid</p>
                        <p className="text-lg font-bold text-emerald-300">₹{commissionBreakdown?.admin?.paid || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">Due</p>
                        <p className="text-lg font-bold text-red-300">₹{commissionBreakdown?.admin?.due || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedBreakdown('super_admin')}
                    className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-pink-500/50 hover:shadow-pink-500/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">By Super Admin</h3>
                      <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-lg">3%</span>
                    </div>
                    <p className="text-xs text-pink-400 mb-3">Click for detailed report →</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                        <p className="text-xs text-pink-400">Total</p>
                        <p className="text-lg font-bold text-pink-300">₹{commissionBreakdown?.super_admin?.total || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-emerald-400">Paid</p>
                        <p className="text-lg font-bold text-emerald-300">₹{commissionBreakdown?.super_admin?.paid || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">Due</p>
                        <p className="text-lg font-bold text-red-300">₹{commissionBreakdown?.super_admin?.due || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedBreakdown('transaction')}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">By Transaction</h3>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg">{transactionSummary.length} TXNs</span>
                  </div>
                  <p className="text-xs text-cyan-400 mb-3">Click for detailed report →</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">TXN #</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2">Driver</th>
                          <th className="px-3 py-2">Dispatcher</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Paid</th>
                          <th className="px-3 py-2">Due</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionSummary.slice(0, 5).map((t) => (
                          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-white font-mono text-xs">{t.transaction_number}</td>
                            <td className="px-3 py-2 text-slate-300">{t.customer_name}</td>
                            <td className="px-3 py-2 text-slate-300">{t.driver_name}</td>
                            <td className="px-3 py-2 text-slate-300">{t.dispatcher_name}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                                t.status === 'REQUESTED' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-emerald-300">₹{t.total_amount}</td>
                            <td className="px-3 py-2 text-blue-300">₹{t.paid_amount}</td>
                            <td className="px-3 py-2 text-red-300">₹{t.due_amount}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {transactionSummary.length > 5 && (
                      <p className="text-center text-cyan-400 py-2 text-xs">+{transactionSummary.length - 5} more transactions...</p>
                    )}
                    {transactionSummary.length === 0 && (
                      <p className="text-center text-slate-400 py-4">No transactions found matching filters.</p>
                    )}
                  </div>
                </div>

                {/* By Payment Card */}
                <div 
                  onClick={() => setSelectedBreakdown('payment')}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl cursor-pointer hover:border-rose-500/50 hover:shadow-rose-500/10 transition-all"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">By Payment</h3>
                    <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-1 rounded-lg">
                      {paymentSummary?.total_payments || 0} Settlements
                    </span>
                  </div>
                  <p className="text-xs text-rose-400 mb-3">Click for settlement details →</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <p className="text-emerald-400 text-xs">Success</p>
                      <p className="text-xl font-bold text-emerald-300">{paymentSummary?.success_count || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-amber-400 text-xs">Pending</p>
                      <p className="text-xl font-bold text-amber-300">{paymentSummary?.pending_count || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-xs">Failed</p>
                      <p className="text-xl font-bold text-red-300">{paymentSummary?.failed_count || 0}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">Total Amount:</span> 
                      <span className="text-white font-semibold ml-2">₹{(paymentSummary?.total_amount || 0).toFixed(2)}</span>
                    </p>
                    {paymentSummary?.by_method?.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className={`px-2 py-1 rounded-lg ${
                          m.method === 'RAZORPAY' ? 'bg-blue-500/20 text-blue-300' :
                          m.method === 'CASH' ? 'bg-green-500/20 text-green-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>{m.method}</span>
                        <span className="text-slate-300">{m.count} × ₹{m.success_amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {selectedTrip && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTrip(null)}>
            <div className="bg-slate-900 rounded-3xl p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-white mb-2">Trip {selectedTrip.transaction_number}</h2>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-slate-400">Customer</p>
                  <p className="text-white">{selectedTrip.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Driver</p>
                  <p className="text-white">{selectedTrip.driver?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Pickup</p>
                  <p className="text-white text-xs">{selectedTrip.pickup_location}</p>
                </div>
                <div>
                  <p className="text-slate-400">Destination</p>
                  <p className="text-white text-xs">{selectedTrip.destination_location}</p>
                </div>
              </div>
              
              <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <p className="text-slate-400 text-sm mb-3">Driver Flow Status</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedTrip.status === 'CANCELLED' ? (
                    <div className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                      🚫 CANCELLED
                    </div>
                  ) : (
                    ['REQUESTED', 'DRIVER_ACCEPTED', 'ENROUTE_TO_PICKUP', 'CUSTOMER_PICKED', 'AT_DESTINATION', 'COMPLETED'].map((status, idx) => {
                    const statusOrder = ['REQUESTED', 'DRIVER_ACCEPTED', 'ENROUTE_TO_PICKUP', 'CUSTOMER_PICKED', 'AT_DESTINATION', 'COMPLETED'];
                    const currentIdx = statusOrder.indexOf(selectedTrip.status);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = status === selectedTrip.status;
                    return (
                      <div key={status} className="flex items-center">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          isCurrent ? 'bg-amber-500 text-black' :
                          isCompleted ? 'bg-emerald-500/20 text-emerald-300' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {status.replace(/_/g, ' ')}
                        </div>
                        {idx < 5 && <span className="text-slate-600 mx-1">→</span>}
                      </div>
                    );
                    })
                  )}
                </div>
                
                <p className="text-slate-400 text-sm mb-2">Next Action:</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Cancel Trip button - available for all non-completed/non-cancelled trips */}
                  {!['COMPLETED', 'CANCELLED'].includes(selectedTrip.status) && (
                    <button
                      onClick={async () => {
                        const reason = prompt('Reason for cancellation:');
                        if (reason !== null) {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=CANCELLED&description=Cancelled: ${reason || 'No reason provided'}`);
                          const res = await api.get('/api/transactions/');
                          setTrips(res.data);
                          setSelectedTrip(null);
                          alert('Trip cancelled successfully');
                        }
                      }}
                      className="col-span-2 py-2 rounded-xl bg-red-600/80 text-white hover:bg-red-500 text-sm mb-2"
                    >
                      ❌ Cancel Trip
                    </button>
                  )}
                  {selectedTrip.status === 'CANCELLED' && (
                    <div className="col-span-2 py-3 rounded-xl bg-red-500/20 text-red-300 text-center text-sm">
                      🚫 This trip was cancelled
                      <button
                        onClick={async () => {
                          if (confirm('Restore this trip to REQUESTED status?')) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/status?status=REQUESTED&description=Restored from cancelled`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                            if (updatedTrip) setSelectedTrip(updatedTrip);
                          }
                        }}
                        className="ml-3 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                      >
                        ↩ Restore Trip
                      </button>
                    </div>
                  )}
                  {selectedTrip.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=DRIVER_ACCEPTED&description=Driver accepted the ride`);
                          const res = await api.get('/api/transactions/');
                          setTrips(res.data);
                          const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                          if (updatedTrip) setSelectedTrip(updatedTrip);
                        }}
                        className="py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-sm"
                      >
                        ✓ Accept Ride
                      </button>
                      <button
                        onClick={() => setSelectedTrip(null)}
                        className="py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 text-sm"
                      >
                        ✗ Reject Ride
                      </button>
                    </>
                  )}
                  {selectedTrip.status === 'DRIVER_ACCEPTED' && (
                    <>
                    <button
                      onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=ENROUTE_TO_PICKUP&description=Driver enroute to pickup location`);
                          const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                        if (updatedTrip) setSelectedTrip(updatedTrip);
                      }}
                        className="py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm"
                    >
                      🚗 Start - Enroute to Pickup
                    </button>
                      <button
                        onClick={async () => {
                          if (confirm('Revert to REQUESTED status?')) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/status?status=REQUESTED&description=Reverted - Driver unassigned`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                            if (updatedTrip) setSelectedTrip(updatedTrip);
                          }
                        }}
                        className="py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 text-sm"
                      >
                        ↩ Go Back
                      </button>
                    </>
                  )}
                  {selectedTrip.status === 'ENROUTE_TO_PICKUP' && (
                    <>
                    <button
                      onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=CUSTOMER_PICKED&description=Customer picked up`);
                          const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                        if (updatedTrip) setSelectedTrip(updatedTrip);
                      }}
                        className="py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-sm"
                    >
                      👤 Customer Picked Up
                    </button>
                      <button
                        onClick={async () => {
                          if (confirm('Revert to DRIVER_ACCEPTED status?')) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/status?status=DRIVER_ACCEPTED&description=Reverted - Back to accepted`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                            if (updatedTrip) setSelectedTrip(updatedTrip);
                          }
                        }}
                        className="py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 text-sm"
                      >
                        ↩ Go Back
                      </button>
                    </>
                  )}
                  {selectedTrip.status === 'CUSTOMER_PICKED' && (
                    <>
                    <button
                      onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=AT_DESTINATION&description=Arrived at destination`);
                          const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                        if (updatedTrip) setSelectedTrip(updatedTrip);
                      }}
                        className="py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm"
                    >
                      📍 Arrived at Destination
                    </button>
                      <button
                        onClick={async () => {
                          if (confirm('Revert to ENROUTE_TO_PICKUP status?')) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/status?status=ENROUTE_TO_PICKUP&description=Reverted - Back to enroute`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                            if (updatedTrip) setSelectedTrip(updatedTrip);
                          }
                        }}
                        className="py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 text-sm"
                      >
                        ↩ Go Back
                      </button>
                    </>
                  )}
                  {selectedTrip.status === 'AT_DESTINATION' && (
                    <>
                    <button
                      onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/status?status=COMPLETED&description=Trip completed`);
                          const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                        if (updatedTrip) setSelectedTrip(updatedTrip);
                      }}
                        className="py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-sm"
                    >
                      ✅ Complete Trip
                    </button>
                      <button
                        onClick={async () => {
                          if (confirm('Revert to CUSTOMER_PICKED status?')) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/status?status=CUSTOMER_PICKED&description=Reverted - Back to picked up`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            const updatedTrip = res.data.find(t => t.id === selectedTrip.id);
                            if (updatedTrip) setSelectedTrip(updatedTrip);
                          }
                        }}
                        className="py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 text-sm"
                      >
                        ↩ Go Back
                      </button>
                    </>
                  )}
                  {selectedTrip.status === 'COMPLETED' && !selectedTrip.is_paid && (
                    <div className="col-span-2 space-y-2">
                      <button
                        disabled={paymentLoading}
                        onClick={async () => {
                          // Create Razorpay order
                          setPaymentLoading(true);
                          try {
                            // First load Razorpay SDK
                            await loadRazorpayScript();
                            
                            const orderRes = await api.post('/api/payments/create-order', {
                              transaction_id: selectedTrip.id,
                              amount: selectedTrip.total_amount
                            });
                            
                            const { order_id, key_id, payment_id } = orderRes.data;
                            
                            // Use the key from response or env
                            const razorpayKey = key_id || RAZORPAY_KEY_ID;
                            
                            if (!razorpayKey || razorpayKey.includes('YOUR_KEY')) {
                              alert('Razorpay is not configured. Please add your Razorpay API keys.\n\n1. Get keys from https://dashboard.razorpay.com\n2. Add RAZORPAY_KEY_ID to backend .env\n3. Add VITE_RAZORPAY_KEY_ID to frontend .env');
                              return;
                            }
                            
                              const options = {
                              key: razorpayKey,
                                amount: selectedTrip.total_amount * 100,
                                currency: 'INR',
                              name: 'RideFlow',
                                description: `Payment for trip ${selectedTrip.transaction_number}`,
                              image: 'https://razorpay.com/favicon.ico',
                                order_id: order_id,
                                handler: async function (response) {
                                  try {
                                    // Verify payment
                                  await api.post('/api/payments/verify', {
                                      payment_id: response.razorpay_payment_id,
                                      order_id: response.razorpay_order_id,
                                      signature: response.razorpay_signature,
                                      db_payment_id: payment_id
                                    });
                                    
                                  alert('✅ Payment successful!');
                                  const res = await api.get('/api/transactions/');
                                    setTrips(res.data);
                                    setSelectedTrip(null);
                                  } catch (error) {
                                  alert('Payment verification failed: ' + (error.response?.data?.detail || error.message));
                                  }
                                },
                                prefill: {
                                name: selectedTrip.customer_name || '',
                                  contact: '',
                                  email: ''
                                },
                              notes: {
                                transaction_id: selectedTrip.id,
                                transaction_number: selectedTrip.transaction_number
                              },
                                theme: {
                                color: '#10b981',
                                backdrop_color: 'rgba(0,0,0,0.8)'
                              },
                              modal: {
                                confirm_close: true,
                                escape: true,
                                animation: true,
                                backdropclose: false,
                                ondismiss: function() {
                                  console.log('Payment modal closed');
                                  // Refresh the page state when modal is dismissed
                                  window.location.reload();
                                }
                              },
                              retry: {
                                enabled: true,
                                max_count: 3
                              },
                              timeout: 300, // 5 minutes timeout
                              remember_customer: true
                              };
                              
                              const rzp = new window.Razorpay(options);
                            
                            // Handle payment failures
                            rzp.on('payment.failed', function (response) {
                              console.error('Payment failed:', response.error);
                              alert('❌ Payment failed: ' + response.error.description + '\n\nReason: ' + response.error.reason);
                            });
                            
                            // Open Razorpay checkout
                              rzp.open();
                            
                            // Handle window blur/focus for external app redirects (Airtel/HDFC etc)
                            const handleVisibilityChange = () => {
                              if (document.visibilityState === 'visible') {
                                // Page is visible again, might have returned from bank app
                                console.log('Returned to page, checking payment status...');
                              }
                            };
                            document.addEventListener('visibilitychange', handleVisibilityChange);
                          } catch (error) {
                            console.error('Payment error:', error);
                            alert('Failed to create payment order: ' + (error.response?.data?.detail || error.message));
                          } finally {
                            setPaymentLoading(false);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paymentLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Pay with Razorpay (₹{selectedTrip.total_amount})
                          </>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=CASH`);
                          const res = await api.get('/api/transactions/');
                          setTrips(res.data);
                          setSelectedTrip(null);
                        }}
                        className="w-full py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500 text-sm"
                      >
                        💰 Record Cash Payment (₹{selectedTrip.total_amount})
                      </button>
                    </div>
                  )}
                  {selectedTrip.status === 'COMPLETED' && selectedTrip.is_paid && (
                    <div className="col-span-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-center text-sm font-semibold">
                      ✓ Payment Received - Trip Complete
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-lg font-bold text-white">₹{selectedTrip.total_amount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Driver (75%)</p>
                  <p className="text-lg font-bold text-purple-300">₹{selectedTrip.driver_share}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className={`text-sm font-bold ${selectedTrip.is_paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedTrip.is_paid ? 'PAID' : 'UNPAID'}
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedTrip(null)} className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            </div>
          </div>
        )}

        {selectedDriver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedDriver(null); setEditMode(null); }}>
            <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-white mb-4">{editMode === 'driver' ? 'Edit Driver' : 'Driver Details'}</h2>
              {editMode === 'driver' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await api.put(`/api/drivers/${selectedDriver.id}`, { name: selectedDriver.name });
                  setSelectedDriver(null);
                  setEditMode(null);
                  const res = await api.get('/api/drivers/');
                  setDrivers(res.data);
                }} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-slate-300">Name</span>
                    <input type="text" value={selectedDriver.name} onChange={e => setSelectedDriver({...selectedDriver, name: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <button type="submit" className="w-full py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500">Save Changes</button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-300"><strong>ID:</strong> {selectedDriver.id}</p>
                  <p className="text-slate-300"><strong>Name:</strong> {selectedDriver.name}</p>
                  <p className="text-slate-300"><strong>Status:</strong> {selectedDriver.is_archived ? <span className="text-red-400">Archived</span> : <span className="text-emerald-400">Active</span>}</p>
                  <p className="text-slate-300"><strong>Created:</strong> {selectedDriver.created_at ? new Date(selectedDriver.created_at).toLocaleString() : '-'}</p>
                  {selectedDriver.addresses?.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-semibold mb-1">Addresses:</p>
                      {selectedDriver.addresses.map(a => (
                        <p key={a.id} className="text-sm text-slate-300 ml-2">{a.address_line}, {a.city}, {a.state} {a.postal_code}</p>
                      ))}
                    </div>
                  )}
                  {selectedDriver.contact_numbers?.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-semibold mb-1">Contacts:</p>
                      {selectedDriver.contact_numbers.map(c => (
                        <p key={c.id} className="text-sm text-slate-300 ml-2">{c.label}: {c.phone_number}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => { setSelectedDriver(null); setEditMode(null); }} className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-300">Close</button>
            </div>
          </div>
        )}

        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedCustomer(null); setEditMode(null); }}>
            <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-white mb-4">{editMode === 'customer' ? 'Edit Customer' : 'Customer Details'}</h2>
              {editMode === 'customer' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await api.put(`/api/customers/${selectedCustomer.id}`, { name: selectedCustomer.name, email: selectedCustomer.email });
                  setSelectedCustomer(null);
                  setEditMode(null);
                  const res = await api.get('/api/customers/');
                  setCustomers(res.data);
                }} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-slate-300">Name</span>
                    <input type="text" value={selectedCustomer.name} onChange={e => setSelectedCustomer({...selectedCustomer, name: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-slate-300">Email</span>
                    <input type="email" value={selectedCustomer.email} onChange={e => setSelectedCustomer({...selectedCustomer, email: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <button type="submit" className="w-full py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500">Save Changes</button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-300"><strong>ID:</strong> {selectedCustomer.id}</p>
                  <p className="text-slate-300"><strong>Name:</strong> {selectedCustomer.name}</p>
                  <p className="text-slate-300"><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p className="text-slate-300"><strong>Status:</strong> {selectedCustomer.is_archived ? <span className="text-red-400">Archived</span> : <span className="text-emerald-400">Active</span>}</p>
                  <p className="text-slate-300"><strong>Created:</strong> {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString() : '-'}</p>
                  {selectedCustomer.addresses?.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-semibold mb-1">Addresses:</p>
                      {selectedCustomer.addresses.map(a => (
                        <p key={a.id} className="text-sm text-slate-300 ml-2">{a.address_line}, {a.city}, {a.state} {a.postal_code}</p>
                      ))}
                    </div>
                  )}
                  {selectedCustomer.contact_numbers?.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-semibold mb-1">Contacts:</p>
                      {selectedCustomer.contact_numbers.map(c => (
                        <p key={c.id} className="text-sm text-slate-300 ml-2">{c.label}: {c.phone_number}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => { setSelectedCustomer(null); setEditMode(null); }} className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-300">Close</button>
            </div>
          </div>
        )}

        
        {/* Tenant Management View - Super Admin Only */}
        {view === 'tenants' && currentUser?.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">🏢 Tenant Management</h2>
                <button
                  onClick={() => setEditMode('create-tenant')}
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition"
                >
                  + Add New Tenant
                </button>
              </div>

              {/* Create New Tenant Form */}
              {editMode === 'create-tenant' && (
                <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Create New Tenant</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    try {
                      await api.post('/api/tenants/', {
                        name: formData.get('name'),
                        code: formData.get('code').toUpperCase(),
                        description: formData.get('description')
                      });
                      setEditMode(null);
                      fetchTenants();
                      alert('Tenant created successfully!');
                    } catch (error) {
                      alert('Error creating tenant: ' + (error.response?.data?.detail || error.message));
                    }
                  }} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-slate-300">Tenant Name *</span>
                        <input 
                          type="text" 
                          name="name"
                          placeholder="e.g., Mumbai Operations"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" 
                          required 
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-slate-300">Tenant Code * (unique)</span>
                        <input 
                          type="text" 
                          name="code"
                          placeholder="e.g., MUM"
                          maxLength={10}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white uppercase" 
                          required 
                        />
                      </label>
                    </div>
                    <label className="block space-y-2">
                      <span className="text-slate-300">Description</span>
                      <textarea 
                        name="description"
                        placeholder="Description of this tenant/company"
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" 
                      />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-2 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600">Create Tenant</button>
                      <button type="button" onClick={() => setEditMode(null)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tenant List */}
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-white">{tenant.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">{tenant.code}</span>
                        {tenant.code === 'DEMO' && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{tenant.description || 'No description'}</p>
                      <p className="text-xs text-slate-500 mt-1">Created: {new Date(tenant.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.code !== 'DEMO' && tenant.code !== 'DGDS' && (
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${tenant.name}"?`)) {
                              try {
                                await api.delete(`/api/tenants/${tenant.id}`);
                                fetchTenants();
                                alert('Tenant deleted successfully!');
                              } catch (error) {
                                alert('Error deleting tenant: ' + (error.response?.data?.detail || error.message));
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-sm hover:bg-red-500/20 transition"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => handleTenantSelect(tenant)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                          selectedTenant?.id === tenant.id
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {selectedTenant?.id === tenant.id ? '✓ Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {tenants.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No tenants found. Click "Add New Tenant" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Database Seeding Progress Modal */}
        {showSeedingModal && seedingStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full mx-4 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">🌱 Database Seeding</h2>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{seedingStatus.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${seedingStatus.progress}%` }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-300">{seedingStatus.message}</p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 mb-4">
                {seedingStatus.is_running && (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                    <span className="text-sm text-slate-400">Seeding in progress...</span>
                  </>
                )}
                {seedingStatus.completed && (
                  <>
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-400">Seeding completed!</span>
                  </>
                )}
                {seedingStatus.error && (
                  <>
                    <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="text-sm text-red-400">Error occurred</span>
                  </>
                )}
              </div>

              {/* Error Details */}
              {seedingStatus.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-300">{seedingStatus.error}</p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={closeSeedingModal}
                disabled={seedingStatus.is_running}
                className={`w-full py-2 rounded-xl text-sm font-medium transition ${
                  seedingStatus.is_running
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {seedingStatus.is_running ? 'Please wait...' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Share Modal */}
      {shareBooking && (
        <BookingShareModal
          booking={shareBooking}
          onClose={() => setShareBooking(null)}
          driver={shareBooking.driver}
          customer={shareBooking.customer}
          vehicle={shareBooking.vehicle}
        />
      )}
    </div>
  );
}

export default App;
