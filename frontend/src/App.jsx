import React, { useMemo, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Car,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Compass,
  Plus,
  Camera,
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
  Database,
  X,
  Info,
} from 'lucide-react';

// API Configuration - uses environment variables with smart fallbacks
const resolveApiBaseUrl = () => {
  const primary = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (primary) return primary;

  const localFallback = (import.meta.env.VITE_API_BASE_URL_LOCAL || '').trim();
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  if (isLocalhost) {
    return localFallback || 'http://localhost:2060';
  }

  // Deployed fallback (Render backend URL)
  return 'https://dgds-test.onrender.com';
};

const API_BASE_URL = resolveApiBaseUrl();
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// Axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and tenant context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Super Admin can switch tenant context
    const activeTenantId = localStorage.getItem('active_tenant_id');
    if (activeTenantId) {
      config.headers['X-Tenant-Id'] = activeTenantId;
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

const statCards = [
  { label: 'Customers', value: '10+' },
  { label: 'Drivers', value: '15+' },
  { label: 'Dispatchers', value: '3' },
  { label: 'Transactions', value: '5 seed' },
];

const getBackendHost = (url) => {
  try {
    return new URL(url).host;
  } catch (error) {
    return url;
  }
};

function App() {
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
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '', role: 'CUSTOMER' });
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
  const [apiStatus, setApiStatus] = useState({
    state: 'checking',
    label: 'Checking',
    message: 'Attempting connection...',
    target: getBackendHost(API_BASE_URL),
    timestamp: Date.now(),
  });
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
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ upiId: '', mobileNumber: '', qrImage: null, qrCodeData: null });
  const [showResetModal, setShowResetModal] = useState(false);
  const [tenantName, setTenantName] = useState('DGDS Clone');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Tenant management state
  const [tenants, setTenants] = useState([]);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', code: '', description: '' });
  const [showTenantResetModal, setShowTenantResetModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTenant, setActiveTenant] = useState(() => {
    const stored = localStorage.getItem('active_tenant');
    return stored ? JSON.parse(stored) : null;
  });
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  
  // Landing page state
  const [showLanding, setShowLanding] = useState(!isAuthenticated);
  const [isDbSeeded, setIsDbSeeded] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedTenantName, setSeedTenantName] = useState('DGDS Clone');
  const [dialog, setDialog] = useState(null);

  const closeDialog = () => setDialog(null);

  const openDialog = ({
    title,
    message,
    variant = 'info',
    actions,
  }) => {
    setDialog({
      title,
      message,
      variant,
      actions:
        actions && actions.length
          ? actions
          : [
              {
                label: 'OK',
                onClick: closeDialog,
                variant: 'primary',
              },
            ],
    });
  };

  const renderDialog = () => {
    if (!dialog) return null;
    const variant = dialog.variant || 'info';
    const variantStyles = {
      success: {
        header: 'text-emerald-300',
        badge: 'bg-emerald-500/10 border-emerald-500/30',
      },
      error: {
        header: 'text-red-300',
        badge: 'bg-red-500/10 border-red-500/30',
      },
      warning: {
        header: 'text-amber-300',
        badge: 'bg-amber-500/10 border-amber-500/30',
      },
      info: {
        header: 'text-blue-300',
        badge: 'bg-blue-500/10 border-blue-500/30',
      },
    };
    const variantIcons = {
      success: CheckCircle2,
      error: AlertCircle,
      warning: AlertCircle,
      info: Info,
    };
    const actionClassMap = {
      primary: 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600',
      secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-500',
      ghost: 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800',
    };
    const IconComponent = variantIcons[variant] || Info;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className={`flex items-center justify-between ${variantStyles[variant]?.header || 'text-slate-200'}`}>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
              <IconComponent className="h-5 w-5" />
              {dialog.title}
            </div>
            <button
              onClick={closeDialog}
              className="rounded-full border border-slate-800 p-1 text-slate-400 hover:text-white hover:border-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed ${variantStyles[variant]?.badge || 'border-slate-800 text-slate-300'}`}
          >
            <p className="text-slate-200 whitespace-pre-line">{dialog.message}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            {dialog.actions.map((action, index) => (
              <button
                key={`dialog-action-${index}`}
                onClick={() => action.onClick ? action.onClick() : closeDialog()}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${actionClassMap[action.variant || 'primary']}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const dialogOverlay = renderDialog();

  // Check if database is seeded on mount
  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        // Try to fetch users to check if database is seeded
        await api.post('/api/auth/quick-login/SUPER_ADMIN');
        setIsDbSeeded(true);
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 500) {
          setIsDbSeeded(false);
        }
      }
    };
    if (!isAuthenticated) {
      checkDatabaseStatus();
    }
  }, []);

  // Handle database seeding
  const handleSeedDatabase = async () => {
    setSeedLoading(true);
    try {
      const response = await api.post('/api/seed-database', null, {
        params: { tenant_name: seedTenantName }
      });
      openDialog({
        title: 'Database Ready',
        message: `${response.data.message}\n\nYou can now log in with the quick login buttons.`,
        variant: 'success',
        actions: [
          {
            label: 'Enter App',
            variant: 'primary',
            onClick: () => {
              closeDialog();
              setShowLanding(false);
              window.location.reload();
            },
          },
        ],
      });
    } catch (error) {
      openDialog({
        title: 'Seeding failed',
        message: error.response?.data?.detail || 'Failed to seed database',
        variant: 'error',
      });
    } finally {
      setSeedLoading(false);
    }
  };

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
      setRegisterForm({ email: '', password: '', confirmPassword: '', role: 'CUSTOMER' });
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
          errorMessage = `Cannot connect to server. Please ensure the backend is reachable at ${API_BASE_URL}`;
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

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setShowLogin(true);
    window.location.reload();
  };

  const handleQuickLogin = async (role) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await api.post(`/api/auth/quick-login/${role.toLowerCase()}`);
      const { access_token, user } = response.data;
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setCurrentUser(user);
      setShowLogin(false);
      window.location.reload();
    } catch (error) {
      let errorMessage = 'Quick login failed. Please ensure seed data is loaded.';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      }
      setAuthError(errorMessage);
      console.error('Quick login error:', error.response?.data || error);
    } finally {
      setAuthLoading(false);
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

  const backendHost = useMemo(() => getBackendHost(API_BASE_URL), []);

  useEffect(() => {
    let isMounted = true;

    const checkApiAvailability = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
        if (!isMounted) return;
        setApiStatus({
          state: 'online',
          label: 'Online',
          message: response.data?.message || 'Backend reachable',
          target: backendHost,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (!isMounted) return;
        const detail = error.response?.data?.detail || error.message || 'Unavailable';
        setApiStatus({
          state: 'offline',
          label: 'Offline',
          message: detail,
          target: backendHost,
          timestamp: Date.now(),
        });
      }
    };

    checkApiAvailability();
    const intervalId = setInterval(checkApiAvailability, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [backendHost]);

  // Fetch saved payment methods when trip is selected
  useEffect(() => {
    if (selectedTrip && selectedTrip.customer?.id) {
      api.get(`/api/customers/${selectedTrip.customer.id}/payment-methods`)
        .then(response => {
          setSavedPaymentMethods(response.data);
        })
        .catch(error => {
          console.error('Error fetching saved payment methods:', error);
        });
    }
  }, [selectedTrip]);

  // Fetch tenants if user is Super Admin
  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'SUPER_ADMIN') {
      api.get('/api/super-admin/tenants')
        .then(response => {
          setTenants(response.data);
        })
        .catch(error => {
          console.error('Error fetching tenants:', error);
        });
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (view === 'customers') {
      setLoading(true);
      api.get('/api/customers/')
        .then(res => setCustomers(res.data))
        .catch(err => console.error('Failed to fetch customers:', err))
        .finally(() => setLoading(false));
    } else if (view === 'trips') {
      setLoading(true);
      Promise.all([
        api.get('/api/transactions/'),
        api.get('/api/customers/'),
        api.get('/api/drivers/'),
      ])
        .then(([tripsRes, customersRes, driversRes]) => {
          setTrips(tripsRes.data);
          setCustomers(customersRes.data);
          setDrivers(driversRes.data);
        })
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
  }, [view]);

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

  // Login/Register UI - Show if not authenticated
  if (!isAuthenticated) {
    const apiStatusStyles = {
      online: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      offline: 'bg-red-500/10 border-red-500/30 text-red-300',
      checking: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8 justify-center">
              <Car className="h-8 w-8 text-purple-300" />
              <span className="text-xl uppercase tracking-[0.2em] font-semibold text-purple-300">DGDS CLONE</span>
            </div>

            <div
              className={`mb-6 flex flex-col items-center gap-1 rounded-xl border px-4 py-3 text-xs font-medium text-center ${apiStatusStyles[apiStatus.state]}`}
            >
              <div className="flex items-center gap-2 uppercase tracking-widest">
                <span>API Status</span>
                {apiStatus.state === 'online' && <CheckCircle2 className="h-4 w-4" />}
                {apiStatus.state === 'offline' && <AlertCircle className="h-4 w-4" />}
                {apiStatus.state === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
              </div>
              <div className="text-[11px] text-slate-400">
                {apiStatus.label}: {apiStatus.message}
              </div>
              <div className="text-[11px] text-slate-500">
                Target: {apiStatus.target} · Last checked {new Date(apiStatus.timestamp).toLocaleTimeString()}
              </div>
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
                Login
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition ${
                  !showLogin
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Register
              </button>
            </div>

            {/* Quick Login Section */}
            <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-3 text-center">Quick Login (Test Accounts)</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLogin('CUSTOMER')}
                  disabled={authLoading}
                  className="py-2 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
                >
                  👤 Customer
                </button>
                <button
                  onClick={() => handleQuickLogin('DRIVER')}
                  disabled={authLoading}
                  className="py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30"
                >
                  🚗 Driver
                </button>
                <button
                  onClick={() => handleQuickLogin('DISPATCHER')}
                  disabled={authLoading}
                  className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/30"
                >
                  📞 Dispatcher
                </button>
                <button
                  onClick={() => handleQuickLogin('ADMIN')}
                  disabled={authLoading}
                  className="py-2 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30"
                >
                  ⚙️ Admin
                </button>
                <button
                  onClick={() => handleQuickLogin('SUPER_ADMIN')}
                  disabled={authLoading}
                  className="py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 col-span-2"
                >
                  👑 Super Admin
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">One-click login with seed accounts</p>
            </div>

            {showLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
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
                  <label className="block text-sm text-slate-400 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder="••••••••"
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
                  {authLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
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
                  <label className="block text-sm text-slate-400 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder="Min 8 chars: A-Z, a-z, 0-9, @$!%*?&"
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
                  <label className="block text-sm text-slate-400 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      placeholder="Re-enter password"
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
                  <label className="block text-sm text-slate-400 mb-2">Role</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="DRIVER">Driver</option>
                    <option value="DISPATCHER">Dispatcher</option>
                    <option value="ADMIN">Admin</option>
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
                  {authLoading ? 'Registering...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        </div>
        {dialogOverlay}
      </div>
    );
  }

  // Landing Page Component
  if (showLanding) {
    const apiStatusStyles = {
      online: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      offline: 'bg-red-500/10 border-red-500/30 text-red-300',
      checking: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <header className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Car className="h-8 w-8 text-purple-300" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white">DGDS Clone</h1>
                <p className="text-slate-400">Fleet-ready ride operations for Dispatchers, Drivers, and Customers</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div
                className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-xs font-medium text-center ${apiStatusStyles[apiStatus.state]}`}
              >
                <div className="flex items-center justify-center gap-2 uppercase tracking-widest">
                  <span>API</span>
                  {apiStatus.state === 'online' && <CheckCircle2 className="h-4 w-4" />}
                  {apiStatus.state === 'offline' && <AlertCircle className="h-4 w-4" />}
                  {apiStatus.state === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                <span className="text-[11px] text-slate-300">{apiStatus.label}: {apiStatus.message}</span>
                <span className="text-[11px] text-slate-500">{apiStatus.target}</span>
              </div>
              <button
                onClick={() => setShowLanding(false)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition"
              >
                Enter App
              </button>
              <button
                onClick={() => {
                  setShowLanding(false);
                  setShowLogin(true);
                }}
                className="px-5 py-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-200 hover:bg-slate-900 transition"
              >
                Login / Demo
              </button>
            </div>
          </header>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 shadow-xl shadow-purple-500/10">
              <h2 className="text-2xl font-semibold text-white">All-in-one ride management</h2>
              <p className="mt-2 text-slate-400">
                Multi-tenant, role-based operations: customer onboarding, driver/dispatcher management, bookings, payments, and reporting.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    Booking workflow
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Create trips, assign driver + vehicle, track statuses end-to-end.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2 text-blue-300 font-semibold">
                    <Users className="h-5 w-5" />
                    Customer CRM
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Addresses, contact numbers, vehicles per customer, and quick onboarding.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2 text-purple-300 font-semibold">
                    <Car className="h-5 w-5" />
                    Driver ops
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Driver directory, phone, addresses, availability and reporting.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <CreditCard className="h-5 w-5" />
                    Payments + reports
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Commission splits, paid/unpaid tracking, summary by driver/customer/dispatcher.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 shadow-xl shadow-cyan-500/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Quick setup</h3>
                  <p className="mt-1 text-sm text-slate-400">Seed a tenant + sample data to explore all features instantly.</p>
                </div>
                <div className={`px-3 py-1 rounded-xl text-xs font-semibold border ${isDbSeeded ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                  {isDbSeeded ? 'DB READY' : 'DB NOT SEEDED'}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={seedTenantName}
                    onChange={(e) => setSeedTenantName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950/50 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g., DGDS Clone, Acme Transport"
                  />
                </div>

                <button
                  onClick={handleSeedDatabase}
                  disabled={seedLoading || !seedTenantName.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {seedLoading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Seeding Database...
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5" />
                      Seed Database
                    </>
                  )}
                </button>

                <div className="rounded-2xl bg-slate-950/40 border border-slate-800 p-4">
                  <p className="text-xs text-slate-400">
                    Default password for seeded users: <span className="text-purple-300 font-semibold">password123</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-10 text-center text-xs text-slate-500">
            <p>Responsive UI for mobile, tablet, laptop, and desktop.</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Left Sidebar */}
      <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-purple-300 mb-6 px-2">
          <Car className="h-7 w-7" />
          <span className="text-sm uppercase tracking-[0.2em] font-semibold">DGDS CLONE</span>
        </div>
        
        {/* Quick Actions */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">Quick Actions</p>
          <button
            onClick={() => setView('booking')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'booking'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            <Plus className="h-4 w-4" />
            New Booking
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
            Add Driver
          </button>
          <button
            onClick={() => {
              setSelectedDispatcher({ name: '', email: '', contact_number: '' });
              setEditMode('create-dispatcher');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition mt-1 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Dispatcher
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
            Add Customer
          </button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">Navigation</p>
          <button
            onClick={() => setView('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              view === 'customers'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Customers
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
            Trips
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
            Drivers
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
            Dispatchers
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
            Vehicles
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
            Summary
          </button>
        </div>
        
        {/* Tenant Management - Only for Super Admin */}
        {currentUser && currentUser.role === 'SUPER_ADMIN' && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 px-2 mb-2">Tenant Management</p>
            <button
              onClick={() => setShowTenantModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
            >
              <Plus className="h-4 w-4" />
              Create Tenant
            </button>
            <button
              onClick={() => setView('tenants')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                view === 'tenants'
                  ? 'bg-purple-500 text-white'
                  : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Manage Tenants ({tenants.length})
            </button>
          </div>
        )}
        
        {/* User Info & Logout */}
        {currentUser && (
          <div className="border-t border-slate-800 pt-4 mt-auto">
            {/* Active Tenant Display */}
            <div className="rounded-xl bg-slate-800/50 p-3 mb-3">
              <p className="text-xs text-slate-400 mb-1">Active Tenant</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-emerald-300 truncate">
                  {activeTenant?.name || currentUser?.tenant?.name || 'DGDS Clone'}
                </p>
                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => setShowTenantPicker(true)}
                    className="text-xs text-purple-300 hover:text-purple-200 underline"
                  >
                    Switch
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                ID: {activeTenant?.id || currentUser?.tenant?.id || currentUser?.tenant_id || 'N/A'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3 mb-3">
              <p className="text-xs text-slate-400 mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-white truncate">{currentUser.email}</p>
              <p className="text-xs text-purple-300 mt-1">{currentUser.role}</p>
            </div>
            {currentUser.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setShowResetModal(true)}
                className="w-full py-2 px-3 rounded-xl text-sm font-medium transition bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 flex items-center justify-center gap-2 mb-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Database
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-xl text-sm font-medium transition bg-red-500/10 text-red-300 hover:bg-red-500/20 flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
        
        {/* Stats at bottom */}
        <div className="border-t border-slate-800 pt-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            {statCards.slice(0, 2).map((stat) => (
              <div key={stat.label} className="rounded-xl bg-slate-800/50 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className="text-sm font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-white">
            {view === 'register' && 'Customer Registration'}
            {view === 'customers' && 'All Customers'}
            {view === 'trips' && 'All Trips'}
            {view === 'drivers' && 'All Drivers'}
            {view === 'dispatchers' && 'All Dispatchers'}
            {view === 'booking' && 'New Booking'}
            {view === 'addDriver' && 'Add New Driver'}
            {view === 'vehicles' && 'All Vehicles'}
            {view === 'summary' && 'Financial Summary'}
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            {view === 'register' && 'Capture customer master data before dispatchers start live bookings.'}
            {view === 'customers' && 'View and manage all registered customers.'}
            {view === 'trips' && 'Track all trips and their statuses.'}
            {view === 'drivers' && 'Manage driver information and availability.'}
            {view === 'dispatchers' && 'Manage dispatcher accounts and assignments.'}
            {view === 'booking' && 'Create a new booking for a customer.'}
            {view === 'addDriver' && 'Register a new driver in the system.'}
            {view === 'vehicles' && 'Manage customer vehicles for bookings.'}
            {view === 'summary' && 'View financial reports and commission breakdowns.'}
          </p>
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
                  <h2 className="text-xl font-semibold text-white">Customer Details</h2>
                  <p className="text-sm text-slate-400">Identity and primary communication channel.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <UserPlus className="h-4 w-4 text-purple-300" />
                    Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleCustomerChange}
                    placeholder="Enter customer name"
                    className={`w-full rounded-2xl border bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.name && <span className="text-xs text-red-400">{errors.name}</span>}
                </label>

                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mail className="h-4 w-4 text-purple-300" />
                    Email
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleCustomerChange}
                    placeholder="Enter customer email"
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
                    <h2 className="text-xl font-semibold text-white">Addresses</h2>
                    <p className="text-sm text-slate-400">Every customer needs one primary location.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAddress}
                  className="flex items-center gap-2 rounded-2xl border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
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
                        Address #{index + 1}
                      </span>
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        Address Line
                        <input
                          type="text"
                          value={address.addressLine}
                          onChange={(e) => handleAddressChange(index, 'addressLine', e.target.value)}
                          placeholder="Street, building, etc."
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        City
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        State
                        <input
                          type="text"
                          value={address.state}
                          onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Postal Code
                        <input
                          type="text"
                          value={address.postalCode}
                          onChange={(e) => handleAddressChange(index, 'postalCode', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300 md:col-span-2">
                        Country
                        <input
                          type="text"
                          value={address.country}
                          onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
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
                      Primary Address
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
                    <h2 className="text-xl font-semibold text-white">Contact Numbers</h2>
                    <p className="text-sm text-slate-400">Label every channel and pick one primary.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
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
                        Contact #{index + 1}
                      </span>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        Label
                        <input
                          type="text"
                          value={contact.label}
                          onChange={(e) => handleContactChange(index, 'label', e.target.value)}
                          placeholder="e.g., Mobile, Home"
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Phone Number
                        <input
                          type="tel"
                          value={contact.phoneNumber}
                          onChange={(e) => handleContactChange(index, 'phoneNumber', e.target.value)}
                          placeholder="Enter phone number"
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
                      Primary Contact
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
                  Registering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Register Customer
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
              <h2 className="text-xl font-semibold text-white">Live Summary</h2>
              <p className="text-sm text-slate-400">Snapshot of what the dispatcher sees.</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Customer</p>
                <div className="mt-3 space-y-1">
                  <p className="text-lg font-semibold text-white">
                    {customerInfo.name || 'Waiting for name'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {customerInfo.email || 'Email will appear here'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Primary Address</p>
                {summary.primaryAddress ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>{summary.primaryAddress.addressLine}</p>
                    <p>
                      {summary.primaryAddress.city}, {summary.primaryAddress.state}
                    </p>
                    <p>
                      {summary.primaryAddress.country} - {summary.primaryAddress.postalCode}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Assign a primary address to preview.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Primary Contact</p>
                {summary.primaryContact ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p className="font-semibold">{summary.primaryContact.label}</p>
                    <p>{summary.primaryContact.phoneNumber}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Assign a primary contact to preview.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Seeded Journeys</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>TXN-SEED-001 · City Loop · 4h</li>
                  <li>TXN-SEED-002 · Corporate Shuttle · 8h</li>
                  <li>TXN-SEED-003 · Airport Run · 6h</li>
                  <li>TXN-SEED-004/005 variations</li>
                </ul>
              </div>
            </div>
          </aside>
          </div>
          </>
        )}

        {view === 'customers' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">All Customers</h2>
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
                          View
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/customers/${customer.id}`);
                            setSelectedCustomer(res.data);
                            setEditMode('customer');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          Edit
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
                          Archive
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

        {view === 'tenants' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-purple-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">Manage Tenants</h2>
            <p className="text-sm text-slate-400 mb-6">Create and manage tenant organizations. Each tenant has isolated data.</p>
            {tenants.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 mb-4">No tenants created yet</p>
                <button
                  onClick={() => setShowTenantModal(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                >
                  Create First Tenant
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            tenant.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {tenant.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300">
                            {tenant.code}
                          </span>
                        </div>
                        {tenant.description && (
                          <p className="text-sm text-slate-400 mt-2">{tenant.description}</p>
                        )}
                        <div className="mt-3 grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Customers:</span>
                            <span className="ml-2 text-slate-300 font-medium">{tenant.customer_count}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Drivers:</span>
                            <span className="ml-2 text-slate-300 font-medium">{tenant.driver_count}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Dispatchers:</span>
                            <span className="ml-2 text-slate-300 font-medium">{tenant.dispatcher_count}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Transactions:</span>
                            <span className="ml-2 text-slate-300 font-medium">{tenant.transaction_count}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Created: {new Date(tenant.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setShowTenantResetModal(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition text-sm"
                        >
                          Reset Data
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'trips' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">All Trips</h2>
            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : trips.length === 0 ? (
              <p className="text-slate-400">No trips found.</p>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => {
                  const resolvedCustomer = trip.customer || customers.find(c => c.id === trip.customer_id);
                  const resolvedDriver = trip.driver || drivers.find(d => d.id === trip.driver_id);

                  // Get customer primary phone
                  const customerPhone = resolvedCustomer?.contact_numbers?.find(c => c.is_primary)?.phone_number ||
                                       resolvedCustomer?.contact_numbers?.[0]?.phone_number;
                  // Get driver phone
                  const driverPhone = resolvedDriver?.contact_numbers?.find(c => c.is_primary)?.phone_number ||
                                     resolvedDriver?.contact_numbers?.[0]?.phone_number;
                  
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
                          {/* Payment Status Badges */}
                          {trip.is_paid ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300">✓ PAID</span>
                          ) : trip.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300">UNPAID</span>
                          ) : trip.status === 'CANCELLED' ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300">CANCELLED</span>
                          ) : trip.payments && trip.payments.some(p => p.status === 'PENDING') ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300">PENDING</span>
                          ) : null}
                          {trip.payments && trip.payments.some(p => p.status === 'FAILED') && !trip.is_paid && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400">PAYMENT FAILED</span>
                          )}
                        </div>
                        
                        {/* Customer & Driver Info with Phone */}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Customer:</span>
                            <span className="text-white">{trip.customer_name || resolvedCustomer?.name || 'N/A'}</span>
                            {customerPhone && (
                              <a href={`tel:${customerPhone}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30">
                                <Phone className="w-3 h-3" />
                                {customerPhone}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Driver:</span>
                            <span className="text-white">{trip.driver_name || resolvedDriver?.name || 'N/A'}</span>
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
                            {trip.created_at ? new Date(trip.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
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
            <h2 className="mb-6 text-2xl font-semibold text-white">Register New Driver</h2>
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
                  <span className="text-slate-300">Country</span>
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

        {view === 'drivers' && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-blue-500/10">
            <h2 className="mb-6 text-2xl font-semibold text-white">All Drivers</h2>
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
                          View
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/drivers/${driver.id}`);
                            setSelectedDriver(res.data);
                            setEditMode('driver');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          Edit
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
                          Archive
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
              <h2 className="text-2xl font-semibold text-white">All Dispatchers</h2>
              <button
                onClick={() => {
                  setSelectedDispatcher({ name: '', email: '', contact_number: '' });
                  setEditMode('create-dispatcher');
                }}
                className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600"
              >
                <Plus className="inline h-4 w-4 mr-2" />
                Add Dispatcher
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
                          View
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await api.get(`/api/dispatchers/${dispatcher.id}`);
                            setSelectedDispatcher(res.data);
                            setEditMode('dispatcher');
                          }}
                          className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm text-amber-300 transition hover:bg-amber-500/20"
                        >
                          Edit
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
                          Archive
                        </button>
                        <button 
                          onClick={() => {
                            setBookingForm(prev => ({ ...prev, dispatcher_id: dispatcher.id }));
                            setView('booking');
                          }}
                          className="rounded-xl bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Create Booking
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
              <h2 className="mb-6 text-2xl font-semibold text-white">Add New Vehicle</h2>
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
                  <span className="text-slate-300">Type</span>
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
            <h2 className="mb-6 text-2xl font-semibold text-white">Create New Booking</h2>
            {loading ? (
              <p className="text-slate-400">Loading data...</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  setSubmitStatus('');
                  try {
                    const response = await api.post('/api/bookings/', {
                      dispatcher_id: parseInt(bookingForm.dispatcher_id),
                      customer_id: parseInt(bookingForm.customer_id),
                      driver_id: parseInt(bookingForm.driver_id),
                      vehicle_id: parseInt(bookingForm.vehicle_id),
                      pickup_location: bookingForm.pickup_location,
                      destination_location: bookingForm.destination_location,
                      return_location: bookingForm.return_location || null,
                      ride_duration_hours: parseInt(bookingForm.ride_duration_hours),
                      payment_method: bookingForm.payment_method,
                    });
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
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-300">Dispatcher</span>
                    <select
                      value={bookingForm.dispatcher_id}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, dispatcher_id: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white"
                      required
                    >
                      <option value="">Select Dispatcher</option>
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
                        <option key={v.id} value={v.id}>{v.nickname} - {v.registration_number} ({v.make} {v.model})</option>
                      ))}
                    </select>
                  </label>
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
                      {/* Saved Payment Methods */}
                      {savedPaymentMethods.length > 0 && (
                        <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-emerald-300 text-xs mb-2 font-semibold">⚡ Quick Pay (Saved Methods)</p>
                          <div className="space-y-2">
                            {savedPaymentMethods.map((method) => (
                              <button
                                key={method.id}
                                onClick={async () => {
                                  if (confirm(`Pay ₹${selectedTrip.total_amount} using ${method.nickname || method.payment_method}?`)) {
                                    if (method.payment_method === 'UPI' && method.upi_id) {
                                      const upiUrl = `upi://pay?pa=${method.upi_id}&pn=DGDS&am=${selectedTrip.total_amount}&cu=INR&tn=Payment for ${selectedTrip.transaction_number}`;
                                      window.location.href = upiUrl;
                                      setTimeout(async () => {
                                        if (confirm('Payment completed?')) {
                                          await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=UPI`);
                                          const res = await api.get('/api/transactions/');
                                          setTrips(res.data);
                                          setSelectedTrip(null);
                                        }
                                      }, 3000);
                                    }
                                  }
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm flex items-center justify-between"
                              >
                                <span>💳 {method.nickname || method.payment_method}</span>
                                {method.is_default && <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded">Default</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setShowPaymentModal(true);
                          setPaymentMethod('');
                          setPaymentDetails({ upiId: '', mobileNumber: '', qrImage: null });
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now (₹{selectedTrip.total_amount})
                      </button>
                      <p className="text-slate-400 text-xs mb-2 hidden">Choose Payment Method:</p>
                      <div className="grid grid-cols-2 gap-2 hidden">
                        {/* UPI Payment */}
                        <button
                          onClick={async () => {
                            const upiId = prompt('Enter UPI ID (e.g., name@paytm):');
                            if (upiId) {
                              const saveForFuture = confirm('Save this UPI ID for future payments?');
                              const upiUrl = `upi://pay?pa=${upiId}&pn=DGDS&am=${selectedTrip.total_amount}&cu=INR&tn=Payment for ${selectedTrip.transaction_number}`;
                              window.location.href = upiUrl;
                              setTimeout(async () => {
                                if (confirm('Payment completed?')) {
                                  await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=UPI`);
                                  
                                  // Save payment method if requested
                                  if (saveForFuture && selectedTrip.customer?.id) {
                                    try {
                                      await api.post(`/api/customers/${selectedTrip.customer.id}/payment-methods`, {
                                        payment_method: 'UPI',
                                        upi_id: upiId,
                                        nickname: `UPI - ${upiId}`,
                                        is_default: false
                                      });
                                    } catch (err) {
                                      console.error('Failed to save payment method:', err);
                                    }
                                  }
                                  
                                  const res = await api.get('/api/transactions/');
                                  setTrips(res.data);
                                  setSelectedTrip(null);
                                }
                              }, 3000);
                            }
                          }}
                          className="py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-sm flex items-center justify-center gap-1"
                        >
                          💳 UPI
                        </button>
                        {/* PhonePe */}
                        <button
                          onClick={async () => {
                            const phonepeUrl = `phonepe://pay?am=${selectedTrip.total_amount}&cu=INR&tn=Trip ${selectedTrip.transaction_number}`;
                            window.location.href = phonepeUrl;
                            setTimeout(async () => {
                              if (confirm('Payment completed via PhonePe?')) {
                                await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=PHONEPE`);
                                const res = await api.get('/api/transactions/');
                                setTrips(res.data);
                                setSelectedTrip(null);
                              }
                            }, 3000);
                          }}
                          className="py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm flex items-center justify-center gap-1"
                        >
                          📱 PhonePe
                        </button>
                        {/* Google Pay */}
                        <button
                          onClick={async () => {
                            const gpayUrl = `tez://upi/pay?pa=merchant@upi&pn=DGDS&am=${selectedTrip.total_amount}&cu=INR&tn=Trip ${selectedTrip.transaction_number}`;
                            window.location.href = gpayUrl;
                            setTimeout(async () => {
                              if (confirm('Payment completed via Google Pay?')) {
                                await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=GOOGLEPAY`);
                                const res = await api.get('/api/transactions/');
                                setTrips(res.data);
                                setSelectedTrip(null);
                              }
                            }, 3000);
                          }}
                          className="py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm flex items-center justify-center gap-1"
                        >
                          🔵 Google Pay
                        </button>
                        {/* QR Code */}
                        <button
                          onClick={async () => {
                            alert(`Show QR Code for ₹${selectedTrip.total_amount}\n\nScan to pay for trip ${selectedTrip.transaction_number}`);
                            if (confirm('Payment completed via QR Code?')) {
                              await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=QR_CODE`);
                              const res = await api.get('/api/transactions/');
                              setTrips(res.data);
                              setSelectedTrip(null);
                            }
                          }}
                          className="py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 text-sm flex items-center justify-center gap-1"
                        >
                          📷 QR Code
                        </button>
                      </div>
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
                          if (confirm(`Record cash payment of ₹${selectedTrip.total_amount}?`)) {
                            await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=CASH`);
                            const res = await api.get('/api/transactions/');
                            setTrips(res.data);
                            setSelectedTrip(null);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500 text-sm"
                      >
                        💰 Cash Payment
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

              {/* Commission Breakdown */}
              <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <p className="text-slate-400 text-sm mb-3 font-semibold">💰 Commission Breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700">
                    <p className="text-xs text-slate-400">Total Amount</p>
                    <p className="text-lg font-bold text-white">₹{selectedTrip.total_amount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700">
                    <p className="text-xs text-slate-400">Payment Status</p>
                    <p className={`text-sm font-bold ${selectedTrip.is_paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedTrip.is_paid ? '✓ PAID' : '⏳ UNPAID'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <span className="text-sm text-purple-300">🚗 Driver Share (75%)</span>
                    <span className="text-sm font-bold text-purple-300">₹{selectedTrip.driver_share}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-sm text-blue-300">⚙️ Admin Share (20%)</span>
                    <span className="text-sm font-bold text-blue-300">₹{selectedTrip.admin_share}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-sm text-amber-300">📞 Dispatcher Share (2%)</span>
                    <span className="text-sm font-bold text-amber-300">₹{selectedTrip.dispatcher_share}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-sm text-red-300">👑 Super Admin Share (3%)</span>
                    <span className="text-sm font-bold text-red-300">₹{selectedTrip.super_admin_share || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedTrip.payments && selectedTrip.payments.length > 0 && (
                <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-slate-400 text-sm mb-3 font-semibold">💳 Payment History</p>
                  <div className="space-y-2">
                    {selectedTrip.payments.map((payment, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              payment.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' :
                              payment.status === 'FAILED' ? 'bg-red-500/20 text-red-300' :
                              payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {payment.status === 'SUCCESS' ? '✓ SUCCESS' :
                               payment.status === 'FAILED' ? '✗ FAILED' :
                               payment.status === 'PENDING' ? '⏳ PENDING' :
                               payment.status}
                            </span>
                            <span className="text-xs text-slate-400">{payment.payment_method}</span>
                          </div>
                          <span className="text-sm font-bold text-white">₹{payment.amount}</span>
                        </div>
                        {payment.razorpay_payment_id && (
                          <p className="text-xs text-slate-500">ID: {payment.razorpay_payment_id}</p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-slate-400 mt-1">{payment.notes}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(payment.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              {selectedTrip.events && selectedTrip.events.length > 0 && (
                <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <p className="text-slate-400 text-sm mb-3 font-semibold">📋 Event Timeline</p>
                  <div className="space-y-2">
                    {selectedTrip.events.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-700">
                        <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{event.event.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-400">{event.description}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(event.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

        {selectedDispatcher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedDispatcher(null); setEditMode(null); }}>
            <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full mx-4 border border-slate-700" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-white mb-4">
                {editMode === 'create-dispatcher' ? 'Create Dispatcher' : 
                 editMode === 'dispatcher' ? 'Edit Dispatcher' : 'Dispatcher Details'}
              </h2>
              {editMode === 'create-dispatcher' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await api.post('/api/dispatchers/', selectedDispatcher);
                  setSelectedDispatcher(null);
                  setEditMode(null);
                  const res = await api.get('/api/dispatchers/');
                  setDispatchers(res.data);
                }} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-slate-300">Name</span>
                    <input 
                      type="text" 
                      value={selectedDispatcher.name} 
                      onChange={e => setSelectedDispatcher({...selectedDispatcher, name: e.target.value})} 
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" 
                      required 
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-slate-300">Email</span>
                    <input 
                      type="email" 
                      value={selectedDispatcher.email} 
                      onChange={e => setSelectedDispatcher({...selectedDispatcher, email: e.target.value})} 
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" 
                      required 
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-slate-300">Contact Number</span>
                    <input 
                      type="tel" 
                      value={selectedDispatcher.contact_number} 
                      onChange={e => setSelectedDispatcher({...selectedDispatcher, contact_number: e.target.value})} 
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" 
                      required 
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 rounded-xl bg-purple-500 text-white font-semibold">Create</button>
                    <button type="button" onClick={() => { setSelectedDispatcher(null); setEditMode(null); }} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                  </div>
                </form>
              ) : editMode === 'dispatcher' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await api.put(`/api/dispatchers/${selectedDispatcher.id}`, { name: selectedDispatcher.name, email: selectedDispatcher.email, contact_number: selectedDispatcher.contact_number });
                  setSelectedDispatcher(null);
                  setEditMode(null);
                  const res = await api.get('/api/dispatchers/');
                  setDispatchers(res.data);
                }} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-slate-300">Name</span>
                    <input type="text" value={selectedDispatcher.name} onChange={e => setSelectedDispatcher({...selectedDispatcher, name: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-slate-300">Email</span>
                    <input type="email" value={selectedDispatcher.email} onChange={e => setSelectedDispatcher({...selectedDispatcher, email: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-slate-300">Phone</span>
                    <input type="tel" value={selectedDispatcher.contact_number} onChange={e => setSelectedDispatcher({...selectedDispatcher, contact_number: e.target.value})} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white" />
                  </label>
                  <button type="submit" className="w-full py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500">Save Changes</button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-300"><strong>ID:</strong> {selectedDispatcher.id}</p>
                  <p className="text-slate-300"><strong>Name:</strong> {selectedDispatcher.name}</p>
                  <p className="text-slate-300"><strong>Email:</strong> {selectedDispatcher.email}</p>
                  <p className="text-slate-300"><strong>Phone:</strong> {selectedDispatcher.contact_number}</p>
                  <p className="text-slate-300"><strong>Status:</strong> {selectedDispatcher.is_archived ? <span className="text-red-400">Archived</span> : <span className="text-emerald-400">Active</span>}</p>
                  <p className="text-slate-300"><strong>Created:</strong> {selectedDispatcher.created_at ? new Date(selectedDispatcher.created_at).toLocaleString() : '-'}</p>
                </div>
              )}
              <button onClick={() => { setSelectedDispatcher(null); setEditMode(null); }} className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-300">Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Database Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-orange-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-orange-400">⚠️ Reset Database</h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-orange-500/10 border border-orange-500/20 p-4">
              <p className="text-sm text-orange-300 font-semibold mb-2">⚠️ Warning: This action cannot be undone!</p>
              <p className="text-xs text-slate-400">
                This will delete all existing data including customers, drivers, trips, and payments. 
                The database will be reseeded with fresh sample data.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">Tenant/Company Name</span>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">This name will be used throughout the application</p>
              </label>

              <div className="rounded-lg bg-slate-950 border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-2">Default credentials after reset:</p>
                <div className="space-y-1 text-xs text-slate-300 font-mono">
                  <p>• Super Admin: superadmin@dgds.com</p>
                  <p>• Admin: admin@dgds.com</p>
                  <p>• Dispatcher: priya@dgds.com</p>
                  <p>• Driver: rajesh@dgds.com</p>
                  <p>• Customer: john@example.com</p>
                  <p className="text-orange-300 mt-2">Password for all: password123</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm(`Are you absolutely sure you want to reset the database for "${tenantName}"?\n\nThis will DELETE ALL existing data!`)) {
                      return;
                    }
                    
                    setResetLoading(true);
                    try {
                      const response = await api.post(`/api/admin/reset-database?tenant_name=${encodeURIComponent(tenantName)}`);
                      alert(`✅ Database reset successfully!\n\nTenant: ${response.data.tenant_name}\n\nYou will be logged out. Please login again with the default credentials.`);
                      
                      // Logout user
                      localStorage.removeItem('auth_token');
                      localStorage.removeItem('auth_user');
                      setIsAuthenticated(false);
                      setCurrentUser(null);
                      setShowResetModal(false);
                      setShowLogin(true);
                    } catch (error) {
                      alert(`❌ Failed to reset database:\n${error.response?.data?.detail || error.message}`);
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={resetLoading || !tenantName.trim()}
                  className="flex-1 py-3 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Reset Database
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetLoading}
                  className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Payment Modal */}
      {showPaymentModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Pay ₹{selectedTrip.total_amount}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4 space-y-2">
              <p className="text-sm text-slate-400">Select Payment Method:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    setPaymentMethod('QR_CODE');
                    try {
                      const response = await api.get(`/api/payments/generate-qr/${selectedTrip.id}`);
                      setPaymentDetails({ ...paymentDetails, qrCodeData: response.data });
                    } catch (error) {
                      console.error('Error generating QR code:', error);
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'QR_CODE' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📷 Scan QR
                </button>
                <button
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'UPI' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  💳 UPI ID
                </button>
                <button
                  onClick={() => setPaymentMethod('PHONEPE')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'PHONEPE' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  📱 PhonePe
                </button>
                <button
                  onClick={() => setPaymentMethod('GOOGLEPAY')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'GOOGLEPAY' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🔵 Google Pay
                </button>
                <button
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'RAZORPAY' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  💰 Razorpay
                </button>
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === 'CASH' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  💵 Cash
                </button>
              </div>
            </div>

            {/* Payment Details Form */}
            {paymentMethod === 'UPI' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-slate-400">Enter UPI ID</span>
                  <input
                    type="text"
                    placeholder="username@paytm"
                    value={paymentDetails.upiId}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveUpi"
                    className="rounded border-slate-700 bg-slate-950"
                  />
                  <label htmlFor="saveUpi" className="text-sm text-slate-400">Save for future payments</label>
                </div>
                <button
                  onClick={async () => {
                    if (!paymentDetails.upiId) {
                      alert('Please enter UPI ID');
                      return;
                    }
                    const upiUrl = `upi://pay?pa=${paymentDetails.upiId}&pn=DGDS&am=${selectedTrip.total_amount}&cu=INR&tn=Payment for ${selectedTrip.transaction_number}`;
                    window.location.href = upiUrl;
                    setTimeout(async () => {
                      if (confirm('Payment completed?')) {
                        await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=UPI`);
                        if (document.getElementById('saveUpi').checked && selectedTrip.customer?.id) {
                          await api.post(`/api/customers/${selectedTrip.customer.id}/payment-methods`, {
                            payment_method: 'UPI',
                            upi_id: paymentDetails.upiId,
                            nickname: `UPI - ${paymentDetails.upiId}`,
                            is_default: false
                          });
                        }
                        const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        setSelectedTrip(null);
                        setShowPaymentModal(false);
                      }
                    }, 3000);
                  }}
                  className="w-full py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-500"
                >
                  Pay with UPI
                </button>
              </div>
            )}

            {(paymentMethod === 'PHONEPE' || paymentMethod === 'GOOGLEPAY') && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-slate-400">Enter Mobile Number</span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={paymentDetails.mobileNumber}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, mobileNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder-slate-500"
                  />
                </label>
                <button
                  onClick={async () => {
                    if (!paymentDetails.mobileNumber) {
                      alert('Please enter mobile number');
                      return;
                    }
                    const appUrl = paymentMethod === 'PHONEPE' 
                      ? `phonepe://pay?am=${selectedTrip.total_amount}&cu=INR&tn=Trip ${selectedTrip.transaction_number}&pa=${paymentDetails.mobileNumber}@ybl`
                      : `tez://upi/pay?pa=${paymentDetails.mobileNumber}@okaxis&pn=DGDS&am=${selectedTrip.total_amount}&cu=INR&tn=Trip ${selectedTrip.transaction_number}`;
                    window.location.href = appUrl;
                    setTimeout(async () => {
                      if (confirm(`Payment completed via ${paymentMethod === 'PHONEPE' ? 'PhonePe' : 'Google Pay'}?`)) {
                        await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=${paymentMethod}`);
                        const res = await api.get('/api/transactions/');
                        setTrips(res.data);
                        setSelectedTrip(null);
                        setShowPaymentModal(false);
                      }
                    }, 3000);
                  }}
                  className={`w-full py-3 rounded-lg font-semibold text-white ${
                    paymentMethod === 'PHONEPE' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  Pay with {paymentMethod === 'PHONEPE' ? 'PhonePe' : 'Google Pay'}
                </button>
              </div>
            )}

            {paymentMethod === 'QR_CODE' && (
              <div className="space-y-3">
                {paymentDetails.qrCodeData ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                    <div className="text-center space-y-3">
                      <img 
                        src={paymentDetails.qrCodeData.qr_code} 
                        alt="Payment QR Code" 
                        className="mx-auto w-64 h-64 rounded-lg border-4 border-white"
                      />
                      <div className="space-y-1">
                        <p className="text-sm text-emerald-400 font-semibold">Scan with any UPI app</p>
                        <p className="text-xs text-slate-400">Pay to: {paymentDetails.qrCodeData.merchant_name}</p>
                        <p className="text-xs text-slate-500">{paymentDetails.qrCodeData.merchant_upi_id}</p>
                        <p className="text-lg text-white font-bold">₹{paymentDetails.qrCodeData.amount}</p>
                      </div>
                      <button
                        onClick={() => {
                          window.location.href = paymentDetails.qrCodeData.upi_url;
                          setTimeout(async () => {
                            if (confirm('Payment completed?')) {
                              await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=QR_CODE`);
                              const res = await api.get('/api/transactions/');
                              setTrips(res.data);
                              setSelectedTrip(null);
                              setShowPaymentModal(false);
                            }
                          }, 3000);
                        }}
                        className="w-full py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500"
                      >
                        Open UPI App
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-teal-400 mb-2" />
                    <p className="text-sm text-slate-400">Generating QR Code...</p>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (confirm('I have completed the payment via QR Code')) {
                      await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=QR_CODE`);
                      const res = await api.get('/api/transactions/');
                      setTrips(res.data);
                      setSelectedTrip(null);
                      setShowPaymentModal(false);
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600"
                >
                  I've Paid - Confirm
                </button>
              </div>
            )}

            {paymentMethod === 'RAZORPAY' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                  <p className="text-sm text-blue-300 mb-2">💰 Razorpay Payment Gateway</p>
                  <p className="text-xs text-slate-400">Secure payment via Razorpay. Supports cards, UPI, wallets, and net banking.</p>
                </div>
                <button
                  onClick={async () => {
                    alert('Razorpay integration will open payment gateway here');
                    // Razorpay integration code would go here
                  }}
                  className="w-full py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-400"
                >
                  Pay with Razorpay
                </button>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <p className="text-sm text-green-300 mb-2">💵 Cash Payment</p>
                  <p className="text-xs text-slate-400">Record cash payment received from customer</p>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(`Record cash payment of ₹${selectedTrip.total_amount}?`)) {
                      await api.patch(`/api/bookings/${selectedTrip.id}/payment?paid_amount=${selectedTrip.total_amount}&payment_method=CASH`);
                      const res = await api.get('/api/transactions/');
                      setTrips(res.data);
                      setSelectedTrip(null);
                      setShowPaymentModal(false);
                      alert('Cash payment recorded successfully!');
                    }
                  }}
                  className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500"
                >
                  Record Cash Payment
                </button>
              </div>
            )}

            {!paymentMethod && (
              <p className="text-center text-sm text-slate-500 py-8">Select a payment method to continue</p>
            )}
          </div>
        </div>
      )}

      {/* Tenant Creation Modal */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Tenant</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tenant Name *</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., Acme Transport"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tenant Code *</label>
                <input
                  type="text"
                  value={tenantForm.code}
                  onChange={(e) => setTenantForm({ ...tenantForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., ACME"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Unique identifier for the tenant</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <textarea
                  value={tenantForm.description}
                  onChange={(e) => setTenantForm({ ...tenantForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Optional description of the tenant"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTenantModal(false);
                  setTenantForm({ name: '', code: '', description: '' });
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await api.post('/api/super-admin/tenants', tenantForm);
                    setTenants([...tenants, response.data]);
                    setShowTenantModal(false);
                    setTenantForm({ name: '', code: '', description: '' });
                    alert(`Tenant "${response.data.name}" created successfully!`);
                  } catch (error) {
                    alert(`Error: ${error.response?.data?.detail || 'Failed to create tenant'}`);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition"
              >
                Create Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Picker Modal for Super Admin */}
      {showTenantPicker && currentUser?.role === 'SUPER_ADMIN' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Switch Tenant Context</h3>
              <button
                onClick={() => setShowTenantPicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Select a tenant to work within. All data operations will be scoped to the selected tenant.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Option to see all data */}
              <button
                onClick={() => {
                  setActiveTenant(null);
                  localStorage.removeItem('active_tenant');
                  localStorage.removeItem('active_tenant_id');
                  setShowTenantPicker(false);
                  window.location.reload();
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                  !activeTenant
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <p className="font-semibold">All Tenants (Global View)</p>
                <p className="text-xs text-slate-500">See data across all tenants</p>
              </button>
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    setActiveTenant(tenant);
                    localStorage.setItem('active_tenant', JSON.stringify(tenant));
                    localStorage.setItem('active_tenant_id', String(tenant.id));
                    setShowTenantPicker(false);
                    window.location.reload();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    activeTenant?.id === tenant.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <p className="font-semibold">{tenant.name}</p>
                  <p className="text-xs text-slate-500">Code: {tenant.code} · ID: {tenant.id}</p>
                </button>
              ))}
            </div>
            {tenants.length === 0 && (
              <p className="text-center text-slate-500 py-4">No tenants found. Create one first.</p>
            )}
          </div>
        </div>
      )}

      {/* Tenant Reset Confirmation Modal */}
      {showTenantResetModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Reset Tenant Data</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to reset ALL data for tenant <strong>{selectedTenant.name}</strong>?
              </p>
              <p className="text-sm text-red-400 mb-6">
                This action cannot be undone. All customers, drivers, dispatchers, and transactions will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTenantResetModal(false);
                    setSelectedTenant(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/api/super-admin/tenants/${selectedTenant.id}/reset`);
                      setTenants(tenants.map(t => 
                        t.id === selectedTenant.id 
                          ? { ...t, customer_count: 0, driver_count: 0, dispatcher_count: 0, transaction_count: 0 }
                          : t
                      ));
                      setShowTenantResetModal(false);
                      setSelectedTenant(null);
                      alert(`All data for "${selectedTenant.name}" has been reset successfully!`);
                    } catch (error) {
                      alert(`Error: ${error.response?.data?.detail || 'Failed to reset tenant data'}`);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {dialogOverlay}
    </div>
  );
}

export default App;
