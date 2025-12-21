import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Car,
  Truck,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import axios from 'axios';

const AnalyticsDashboard = ({ api }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('analytics');
  const [dateRange, setDateRange] = useState('7days');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const dateRangeOptions = [
    { value: '1day', label: t('dateRanges.1day') },
    { value: '3days', label: t('dateRanges.3days') },
    { value: '7days', label: t('dateRanges.7days') },
    { value: '14days', label: t('dateRanges.14days') },
    { value: '1month', label: t('dateRanges.1month') },
    { value: '3months', label: t('dateRanges.3months') },
    { value: '6months', label: t('dateRanges.6months') },
    { value: '1year', label: t('dateRanges.1year') },
    { value: '2years', label: t('dateRanges.2years') },
    { value: '3years', label: t('dateRanges.3years') },
    { value: '4years', label: t('dateRanges.4years') },
    { value: '5years', label: t('dateRanges.5years') },
    { value: '7years', label: t('dateRanges.7years') },
    { value: '8years', label: t('dateRanges.8years') },
    { value: 'custom', label: t('dateRanges.custom') },
  ];

  const reportTypes = [
    { value: 'analytics', label: t('reports.analytics'), icon: BarChart3 },
    { value: 'by-customer', label: t('reports.byCustomer'), icon: Users },
    { value: 'by-driver', label: t('reports.byDriver'), icon: Truck },
    { value: 'by-vehicle', label: t('reports.byVehicle'), icon: Car },
    { value: 'payment-release', label: t('reports.paymentRelease'), icon: DollarSign },
  ];

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        date_range: {
          range_type: dateRange,
          start_date: dateRange === 'custom' ? customDates.start : null,
          end_date: dateRange === 'custom' ? customDates.end : null,
        },
      };

      const response = await api.post(`/api/reports/${reportType}`, filters);
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange]);

  const renderAnalyticsSummary = () => {
    if (!reportData || reportType !== 'analytics') return null;

    const { summary, revenue, averages } = reportData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">{t('reports.totalRevenue')}</p>
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{revenue.total_revenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1">
            Paid: ₹{revenue.paid_amount.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">{t('reports.totalTrips')}</p>
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.total_trips}</p>
          <p className="text-xs text-blue-400 mt-1">
            Completed: {summary.completed_trips}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">{t('reports.activeCustomers')}</p>
            <Users className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.active_customers}</p>
          <p className="text-xs text-purple-400 mt-1">
            Unique customers
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">{t('reports.activeDrivers')}</p>
            <Truck className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.active_drivers}</p>
          <p className="text-xs text-amber-400 mt-1">
            Unique drivers
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Avg Trip Amount</p>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{averages.avg_trip_amount.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Avg Duration</p>
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{averages.avg_trip_duration_hours.toFixed(1)}h</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Unpaid Amount</p>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{revenue.unpaid_amount.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Cancelled Trips</p>
            <AlertCircle className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary.cancelled_trips}</p>
        </div>
      </div>
    );
  };

  const renderCustomerReport = () => {
    if (!reportData || reportType !== 'by-customer') return null;

    const [expandedCustomer, setExpandedCustomer] = useState(null);

    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Customer</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Total Rides</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Completed</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Active</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Pending</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Total Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Paid</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Dues</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Last 3 Rides</th>
                </tr>
              </thead>
              <tbody>
                {reportData.customers.map((customer, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-b border-slate-800 hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-sm text-white font-medium">{customer.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-300">{customer.total_rides}</td>
                      <td className="py-3 px-4 text-sm text-right text-emerald-400">{customer.completed_rides}</td>
                      <td className="py-3 px-4 text-sm text-right text-blue-400">{customer.active_rides}</td>
                      <td className="py-3 px-4 text-sm text-right text-amber-400">{customer.pending_rides}</td>
                      <td className="py-3 px-4 text-sm text-right text-white font-medium">₹{customer.total_spent.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right text-emerald-400">₹{customer.paid_amount.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${customer.dues > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ₹{customer.dues.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedCustomer(expandedCustomer === index ? null : index)}
                          className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                        >
                          {expandedCustomer === index ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedCustomer === index && (
                      <tr>
                        <td colSpan="9" className="px-4 py-0">
                          <div className="bg-slate-900/50 rounded-xl p-4 mb-2">
                            <h4 className="text-sm font-semibold text-white mb-3">Last 3 Rides</h4>
                            <div className="space-y-2">
                              {customer.last_three_rides.map((ride, rideIndex) => (
                                <div key={rideIndex} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-blue-400">{ride.transaction_number}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          ride.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                                          ride.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300' :
                                          ride.status === 'REQUESTED' ? 'bg-amber-500/20 text-amber-300' :
                                          'bg-blue-500/20 text-blue-300'
                                        }`}>
                                          {ride.status}
                                        </span>
                                        {ride.is_paid ? (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
                                            PAID
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                                            UNPAID
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 space-y-1">
                                        <p><span className="text-slate-500">Driver:</span> {ride.driver_name || 'N/A'}</p>
                                        <p><span className="text-slate-500">Route:</span> {ride.pickup_location} → {ride.destination_location}</p>
                                        <p><span className="text-slate-500">Date:</span> {ride.created_at ? new Date(ride.created_at).toLocaleString() : 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-lg font-bold text-white">₹{ride.amount.toLocaleString()}</p>
                                      {!ride.is_paid && (
                                        <p className="text-xs text-red-400 mt-1">Payment Due</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Customers</p>
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{reportData.customers.length}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-emerald-300">Total Revenue</p>
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              ₹{reportData.customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-300">Total Dues</p>
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              ₹{reportData.customers.reduce((sum, c) => sum + c.dues, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-300">Total Rides</p>
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {reportData.customers.reduce((sum, c) => sum + c.total_rides, 0)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderDriverReport = () => {
    if (!reportData || reportType !== 'by-driver') return null;

    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Driver Performance Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Driver</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Total Trips</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Completed</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Completion Rate</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {reportData.drivers.map((driver, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-sm text-white">{driver.driver_name}</td>
                  <td className="py-3 px-4 text-sm text-right text-slate-300">{driver.trip_count}</td>
                  <td className="py-3 px-4 text-sm text-right text-emerald-400">{driver.completed_trips}</td>
                  <td className="py-3 px-4 text-sm text-right text-blue-400">{driver.completion_rate}%</td>
                  <td className="py-3 px-4 text-sm text-right text-white">₹{driver.total_earnings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPaymentReleaseReport = () => {
    if (!reportData || reportType !== 'payment-release') return null;

    const { summary, pending_payments } = reportData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-emerald-300">Amount Paid</p>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">₹{summary.amount_paid.toLocaleString()}</p>
            <p className="text-xs text-emerald-400 mt-1">{summary.paid_trips_count} trips</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-300">Amount Pending</p>
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">₹{summary.amount_pending.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">{summary.unpaid_trips_count} trips</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-300">Total Due</p>
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">₹{summary.total_amount_due.toLocaleString()}</p>
            <p className="text-xs text-blue-400 mt-1">{summary.total_completed_trips} trips</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pending Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Trip #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Driver</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Days Pending</th>
                </tr>
              </thead>
              <tbody>
                {pending_payments.map((payment, index) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm text-blue-400">{payment.transaction_number}</td>
                    <td className="py-3 px-4 text-sm text-white">{payment.customer_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-300">{payment.driver_name}</td>
                    <td className="py-3 px-4 text-sm text-right text-white">₹{payment.amount.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      payment.days_pending > 7 ? 'text-red-400' : 
                      payment.days_pending > 3 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {payment.days_pending} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">{t('reports.title')}</h2>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? 'Loading...' : t('reports.generate')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                      reportType === type.value
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('reports.dateRange')}</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-purple-500"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="date"
                  value={customDates.start}
                  onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder={t('reports.from')}
                />
                <input
                  type="date"
                  value={customDates.end}
                  onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder={t('reports.to')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {renderAnalyticsSummary()}
          {renderCustomerReport()}
          {renderDriverReport()}
          {renderPaymentReleaseReport()}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
