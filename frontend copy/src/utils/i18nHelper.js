/**
 * Utility functions to help with i18n implementation
 */

/**
 * Get translation key with fallback to original text
 * Useful during migration from hardcoded strings
 */
export const tWithFallback = (t, key, fallback) => {
  const translation = t(key);
  // If translation equals key, it means the key wasn't found
  return translation === key ? fallback : translation;
};

/**
 * Common translation keys for frequently used strings
 */
export const COMMON_KEYS = {
  // Actions
  ADD: 'buttons.add',
  EDIT: 'buttons.edit',
  DELETE: 'buttons.delete',
  SAVE: 'buttons.save',
  CANCEL: 'buttons.cancel',
  CLOSE: 'buttons.close',
  BACK: 'buttons.back',
  NEXT: 'buttons.next',
  SUBMIT: 'forms.submit',
  SEARCH: 'forms.search',
  FILTER: 'forms.filter',
  EXPORT: 'forms.export',
  IMPORT: 'forms.import',
  
  // Status
  LOADING: 'messages.loading',
  SUCCESS: 'messages.success',
  ERROR: 'messages.error',
  WARNING: 'messages.warning',
  INFO: 'messages.info',
  
  // Common labels
  NAME: 'customer.name',
  EMAIL: 'auth.email',
  PHONE: 'auth.phoneNumber',
  ADDRESS: 'auth.address',
  CITY: 'auth.city',
  STATE: 'auth.state',
  POSTAL_CODE: 'auth.postalCode',
  COUNTRY: 'auth.country',
  
  // Placeholders
  ENTER_NAME: 'placeholders.enterName',
  ENTER_EMAIL: 'placeholders.enterEmail',
  ENTER_PHONE: 'placeholders.enterPhone',
  ENTER_ADDRESS: 'placeholders.enterAddress',
  ENTER_CITY: 'placeholders.enterCity',
  ENTER_STATE: 'placeholders.enterState',
  ENTER_POSTAL_CODE: 'placeholders.enterPostalCode',
  ENTER_COUNTRY: 'placeholders.enterCountry',
  ENTER_PASSWORD: 'placeholders.enterPassword',
  
  // Status values
  ACTIVE: 'status.active',
  INACTIVE: 'status.inactive',
  PENDING: 'status.pending',
  COMPLETED: 'status.completed',
  CANCELLED: 'status.cancelled',
  PAID: 'trip.paid',
  UNPAID: 'trip.unpaid',
  
  // Common messages
  NO_DATA: 'table.noData',
  NO_CUSTOMERS: 'customer.noCustomers',
  NO_DRIVERS: 'driver.noDrivers',
  NO_TRIPS: 'trip.noTrips',
  NO_VEHICLES: 'vehicle.noVehicles',
  NO_DISPATCHERS: 'dispatcher.noDispatchers'
};

/**
 * Map of common hardcoded strings to translation keys
 * Helps in batch replacement
 */
export const STRING_TO_KEY_MAP = {
  // Actions
  'Add': COMMON_KEYS.ADD,
  'Edit': COMMON_KEYS.EDIT,
  'Delete': COMMON_KEYS.DELETE,
  'Save': COMMON_KEYS.SAVE,
  'Cancel': COMMON_KEYS.CANCEL,
  'Close': COMMON_KEYS.CLOSE,
  'Back': COMMON_KEYS.BACK,
  'Next': COMMON_KEYS.NEXT,
  'Submit': COMMON_KEYS.SUBMIT,
  'Search': COMMON_KEYS.SEARCH,
  'Filter': COMMON_KEYS.FILTER,
  'Export': COMMON_KEYS.EXPORT,
  'Import': COMMON_KEYS.IMPORT,
  
  // Status
  'Loading...': COMMON_KEYS.LOADING,
  'Success': COMMON_KEYS.SUCCESS,
  'Error': COMMON_KEYS.ERROR,
  'Warning': COMMON_KEYS.WARNING,
  'Info': COMMON_KEYS.INFO,
  
  // Labels
  'Name': COMMON_KEYS.NAME,
  'Email': COMMON_KEYS.EMAIL,
  'Phone Number': COMMON_KEYS.PHONE,
  'Address': COMMON_KEYS.ADDRESS,
  'City': COMMON_KEYS.CITY,
  'State': COMMON_KEYS.STATE,
  'Postal Code': COMMON_KEYS.POSTAL_CODE,
  'Country': COMMON_KEYS.COUNTRY,
  
  // Placeholders
  'John Doe': COMMON_KEYS.ENTER_NAME,
  'your@email.com': COMMON_KEYS.ENTER_EMAIL,
  '+919876543210': COMMON_KEYS.ENTER_PHONE,
  '123 Main Street': COMMON_KEYS.ENTER_ADDRESS,
  'Mumbai': COMMON_KEYS.ENTER_CITY,
  'Maharashtra': COMMON_KEYS.ENTER_STATE,
  '400001': COMMON_KEYS.ENTER_POSTAL_CODE,
  'India': COMMON_KEYS.ENTER_COUNTRY,
  '••••••••': COMMON_KEYS.ENTER_PASSWORD,
  
  // Status values
  'Active': COMMON_KEYS.ACTIVE,
  'Inactive': COMMON_KEYS.INACTIVE,
  'Pending': COMMON_KEYS.PENDING,
  'Completed': COMMON_KEYS.COMPLETED,
  'Cancelled': COMMON_KEYS.CANCELLED,
  'PAID': COMMON_KEYS.PAID,
  'UNPAID': COMMON_KEYS.UNPAID,
  
  // Messages
  'No data available': COMMON_KEYS.NO_DATA,
  'No customers found': COMMON_KEYS.NO_CUSTOMERS,
  'No drivers found': COMMON_KEYS.NO_DRIVERS,
  'No trips found': COMMON_KEYS.NO_TRIPS,
  'No vehicles found': COMMON_KEYS.NO_VEHICLES,
  'No dispatchers found': COMMON_KEYS.NO_DISPATCHERS
};

/**
 * Function to create dynamic translations with interpolation
 * Example: t('trip.tripNumber', {number: 123}) returns "Trip #123"
 */
export const createDynamicTranslation = (t, key, params = {}) => {
  return t(key, params);
};

/**
 * Check if a translation key exists
 */
export const hasTranslation = (t, key) => {
  const translation = t(key);
  return translation !== key;
};

/**
 * Get all missing translation keys in a component
 * Useful for debugging
 */
export const findMissingTranslations = (t, keys) => {
  return keys.filter(key => !hasTranslation(t, key));
};
