import React from 'react';

const SummaryView = ({ 
  filters, setFilters, fetchSummaryData, dispatchers, drivers, customers, loading, summaryData 
}) => {
  return (
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
            {/* Commission Breakdown Cards */}
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
                              const tripRevenue = (driverEarnings / 0.75).toFixed(2);
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
                              const bookingRevenue = (dispatcherEarnings / 0.02).toFixed(2);
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SummaryView;
