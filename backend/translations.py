"""
Backend translations for error messages and responses
Supports English (en), Hindi (hi), and Sanskrit (sa)
"""

translations = {
    "en": {
        "auth": {
            "invalid_credentials": "Invalid email or password",
            "inactive_user": "User account is inactive",
            "unauthorized": "You are not authorized to perform this action",
            "forbidden": "Access denied",
            "session_expired": "Session has expired",
            "login_required": "Login required"
        },
        "validation": {
            "required": "This field is required",
            "invalid_email": "Please enter a valid email address",
            "invalid_phone": "Please enter a valid phone number",
            "password_mismatch": "Passwords do not match",
            "weak_password": "Password is too weak",
            "duplicate_email": "Email already exists",
            "duplicate_phone": "Phone number already exists",
            "min_length": "Must be at least {min} characters",
            "max_length": "Must be less than {max} characters"
        },
        "success": {
            "login_successful": "Login successful",
            "logout_successful": "Logout successful",
            "registered_successfully": "Registered successfully",
            "saved_successfully": "Saved successfully",
            "updated_successfully": "Updated successfully",
            "deleted_successfully": "Deleted successfully"
        },
        "error": {
            "server_error": "Internal server error",
            "database_error": "Database error occurred",
            "network_error": "Network error. Please try again",
            "not_found": "Resource not found",
            "page_not_found": "Page not found",
            "method_not_allowed": "Method not allowed",
            "rate_limit_exceeded": "Rate limit exceeded. Please try again later",
            "maintenance_mode": "System under maintenance. Please try again later"
        },
        "user": {
            "not_found": "User not found",
            "already_exists": "User already exists",
            "created": "User created successfully",
            "updated": "User updated successfully",
            "deleted": "User deleted successfully"
        },
        "customer": {
            "not_found": "Customer not found",
            "created": "Customer registered successfully",
            "updated": "Customer updated successfully",
            "deleted": "Customer deleted successfully"
        },
        "driver": {
            "not_found": "Driver not found",
            "created": "Driver added successfully",
            "updated": "Driver updated successfully",
            "deleted": "Driver deleted successfully",
            "already_exists": "Driver already exists"
        },
        "dispatcher": {
            "not_found": "Dispatcher not found",
            "created": "Dispatcher added successfully",
            "updated": "Dispatcher updated successfully",
            "deleted": "Dispatcher deleted successfully"
        },
        "vehicle": {
            "not_found": "Vehicle not found",
            "created": "Vehicle added successfully",
            "updated": "Vehicle updated successfully",
            "deleted": "Vehicle deleted successfully"
        },
        "trip": {
            "not_found": "Trip not found",
            "created": "Trip created successfully",
            "updated": "Trip updated successfully",
            "cancelled": "Trip cancelled successfully",
            "completed": "Trip completed successfully"
        },
        "tenant": {
            "not_found": "Tenant not found",
            "created": "Tenant created successfully",
            "updated": "Tenant updated successfully",
            "deleted": "Tenant deleted successfully",
            "cannot_delete": "Cannot delete tenant with existing data"
        },
        "payment": {
            "failed": "Payment failed",
            "success": "Payment successful",
            "pending": "Payment pending",
            "refunded": "Payment refunded"
        },
        "general": {
            "ok": "OK",
            "success": "Success",
            "error": "Error",
            "warning": "Warning",
            "info": "Information",
            "loading": "Loading...",
            "processing": "Processing...",
            "no_data": "No data available"
        }
    },
    "hi": {
        "auth": {
            "invalid_credentials": "अमान्य ईमेल या पासवर्ड",
            "inactive_user": "उपयोगकर्ता खाता निष्क्रिय है",
            "unauthorized": "आप इस कार्रवाई को करने के लिए अधिकृत नहीं हैं",
            "forbidden": "पहुंच अस्वीकृत",
            "session_expired": "सत्र समाप्त हो गया है",
            "login_required": "लॉगिन आवश्यक है"
        },
        "validation": {
            "required": "यह फ़ील्ड आवश्यक है",
            "invalid_email": "कृपया एक वैध ईमेल पता दर्ज करें",
            "invalid_phone": "कृपया एक वैध फोन नंबर दर्ज करें",
            "password_mismatch": "पासवर्ड मेल नहीं खाते",
            "weak_password": "पासवर्ड बहुत कमजोर है",
            "duplicate_email": "ईमेल पहले से मौजूद है",
            "duplicate_phone": "फोन नंबर पहले से मौजूद है",
            "min_length": "कम से कम {min} अक्षर होने चाहिए",
            "max_length": "{max} अक्षर से कम होना चाहिए"
        },
        "success": {
            "login_successful": "लॉगिन सफल",
            "logout_successful": "लॉगआउट सफल",
            "registered_successfully": "सफलतापूर्वक पंजीकृत",
            "saved_successfully": "सफलतापूर्वक सहेजा गया",
            "updated_successfully": "सफलतापूर्वक अपडेट किया गया",
            "deleted_successfully": "सफलतापूर्वक हटाया गया"
        },
        "error": {
            "server_error": "आंतरिक सर्वर त्रुटि",
            "database_error": "डेटाबेस त्रुटि हुई",
            "network_error": "नेटवर्क त्रुटि। कृपया फिर से कोशिश करें",
            "not_found": "संसाधन नहीं मिला",
            "page_not_found": "पृष्ठ नहीं मिला",
            "method_not_allowed": "विधि की अनुमति नहीं",
            "rate_limit_exceeded": "दर सीमा पार हो गई। कृपया बाद में फिर से कोशिश करें",
            "maintenance_mode": "सिस्टम रखरखाव में है। कृपया बाद में फिर से कोशिश करें"
        },
        "user": {
            "not_found": "उपयोगकर्ता नहीं मिला",
            "already_exists": "उपयोगकर्ता पहले से मौजूद है",
            "created": "उपयोगकर्ता सफलतापूर्वक बनाया गया",
            "updated": "उपयोगकर्ता सफलतापूर्वक अपडेट किया गया",
            "deleted": "उपयोगकर्ता सफलतापूर्वक हटाया गया"
        },
        "customer": {
            "not_found": "ग्राहक नहीं मिला",
            "created": "ग्राहक सफलतापूर्वक पंजीकृत हुआ",
            "updated": "ग्राहक सफलतापूर्वक अपडेट किया गया",
            "deleted": "ग्राहक सफलतापूर्वक हटाया गया"
        },
        "driver": {
            "not_found": "चालक नहीं मिला",
            "created": "चालक सफलतापूर्वक जोड़ा गया",
            "updated": "चालक सफलतापूर्वक अपडेट किया गया",
            "deleted": "चालक सफलतापूर्वक हटाया गया",
            "already_exists": "चालक पहले से मौजूद है"
        },
        "dispatcher": {
            "not_found": "प्रेषक नहीं मिला",
            "created": "प्रेषक सफलतापूर्वक जोड़ा गया",
            "updated": "प्रेषक सफलतापूर्वक अपडेट किया गया",
            "deleted": "प्रेषक सफलतापूर्वक हटाया गया"
        },
        "vehicle": {
            "not_found": "वाहन नहीं मिला",
            "created": "वाहन सफलतापूर्वक जोड़ा गया",
            "updated": "वाहन सफलतापूर्वक अपडेट किया गया",
            "deleted": "वाहन सफलतापूर्वक हटाया गया"
        },
        "trip": {
            "not_found": "यात्रा नहीं मिली",
            "created": "यात्रा सफलतापूर्वक बनाई गई",
            "updated": "यात्रा सफलतापूर्वक अपडेट की गई",
            "cancelled": "यात्रा सफलतापूर्वक रद्द की गई",
            "completed": "यात्रा सफलतापूर्वक पूर्ण हुई"
        },
        "tenant": {
            "not_found": "किरायेदार नहीं मिला",
            "created": "किरायेदार सफलतापूर्वक बनाया गया",
            "updated": "किरायेदार सफलतापूर्वक अपडेट किया गया",
            "deleted": "किरायेदार सफलतापूर्वक हटाया गया",
            "cannot_delete": "मौजूदा डेटा के साथ किरायेदार को हटा नहीं सकते"
        },
        "payment": {
            "failed": "भुगतान विफल",
            "success": "भुगतान सफल",
            "pending": "भुगतान लंबित",
            "refunded": "भुगतान वापस किया गया"
        },
        "general": {
            "ok": "ठीक है",
            "success": "सफलता",
            "error": "त्रुटि",
            "warning": "चेतावनी",
            "info": "जानकारी",
            "loading": "लोड हो रहा है...",
            "processing": "प्रोसेस हो रहा है...",
            "no_data": "कोई डेटा उपलब्ध नहीं"
        }
    },
    "sa": {
        "auth": {
            "invalid_credentials": "अमान्यं विद्युत्पत्रं वा गुप्तशब्दः",
            "inactive_user": "उपयोक्तृलेखा निष्क्रिया अस्ति",
            "unauthorized": "भवान् एतत् कर्तुं अधिकृतः नास्ति",
            "forbidden": "प्रवेशः निषिद्धः",
            "session_expired": "सत्रं समाप्तम् अभवत्",
            "login_required": "प्रवेशः आवश्यकः"
        },
        "validation": {
            "required": "एषः क्षेत्रः आवश्यकः",
            "invalid_email": "कृपया एकं वैधं विद्युत्पत्रं निवेशयतु",
            "invalid_phone": "कृपया एकं वैधं दूरभाषसंख्यां निवेशयतु",
            "password_mismatch": "गुप्तशब्दाः न मेलन्ति",
            "weak_password": "गुप्तशब्दः अत्यन्तः दुर्बलः",
            "duplicate_email": "विद्युत्पत्रं पूर्वमेव अस्ति",
            "duplicate_phone": "दूरभाषसंख्या पूर्वमेव अस्ति",
            "min_length": "न्यूनतम् {min} अक्षराः भवितव्याः",
            "max_length": "{max} अक्षरात् कम् भवितव्यम्"
        },
        "success": {
            "login_successful": "प्रवेशः सफलः",
            "logout_successful": "निर्गमनं सफलम्",
            "registered_successfully": "सफलतया पञ्जीकृतम्",
            "saved_successfully": "सफलतया रक्षितम्",
            "updated_successfully": "सफलतया अद्यतनितम्",
            "deleted_successfully": "सफलतया लोपितम्"
        },
        "error": {
            "server_error": "आन्तरिकसर्वरत्रुटिः",
            "database_error": "दत्तांशाधारत्रुटिः अभवत्",
            "network_error": "नेटवर्कत्रुटिः। कृपया पुनः प्रयत्नं कुरुतु",
            "not_found": "संसाधनं न प्राप्तम्",
            "page_not_found": "पृष्ठं न प्राप्तम्",
            "method_not_allowed": "पद्धिः अनुमतः न",
            "rate_limit_exceeded": "दरसीमा अतिक्रान्ता। कृपया पश्चात् पुनः प्रयत्नं कुरुतु",
            "maintenance_mode": "व्यवस्था रखरखावे अस्ति। कृपया पश्चात् पुनः प्रयत्नं कुरुतु"
        },
        "user": {
            "not_found": "उपयोक्ता न प्राप्तः",
            "already_exists": "उपयोक्ता पूर्वमेव अस्ति",
            "created": "उपयोक्ता सफलतया सृष्टः",
            "updated": "उपयोक्ता सफलतया अद्यतनितः",
            "deleted": "उपयोक्ता सफलतया लोपितः"
        },
        "customer": {
            "not_found": "ग्राहकः न प्राप्तः",
            "created": "ग्राहकः सफलतया पञ्जीकृतः",
            "updated": "ग्राहकः सफलतया अद्यतनितः",
            "deleted": "ग्राहकः सफलतया लोपितः"
        },
        "driver": {
            "not_found": "चालकः न प्राप्तः",
            "created": "चालकः सफलतया योजितः",
            "updated": "चालकः सफलतया अद्यतनितः",
            "deleted": "चालकः सफलतया लोपितः",
            "already_exists": "चालकः पूर्वमेव अस्ति"
        },
        "dispatcher": {
            "not_found": "प्रेषकः न प्राप्तः",
            "created": "प्रेषकः सफलतया योजितः",
            "updated": "प्रेषकः सफलतया अद्यतनितः",
            "deleted": "प्रेषकः सफलतया लोपितः"
        },
        "vehicle": {
            "not_found": "वाहनं न प्राप्तम्",
            "created": "वाहनं सफलतया योजितम्",
            "updated": "वाहनं सफलतया अद्यतनितम्",
            "deleted": "वाहनं सफलतया लोपितम्"
        },
        "trip": {
            "not_found": "यात्रा न प्राप्ता",
            "created": "यात्रा सफलतया सृष्टा",
            "updated": "यात्रा सफलतया अद्यतनिता",
            "cancelled": "यात्रा सफलतया निरस्ता",
            "completed": "यात्रा सफलतया समाप्ता"
        },
        "tenant": {
            "not_found": "किरायेदारः न प्राप्तः",
            "created": "किरायेदारः सफलतया सृष्टः",
            "updated": "किरायेदारः सफलतया अद्यतनितः",
            "deleted": "किरायेदारः सफलतया लोपितः",
            "cannot_delete": "विद्यमानेन दत्तांशेन सह किरायेदारं लोपयितुं न शक्यते"
        },
        "payment": {
            "failed": "भुगतानं विफलम्",
            "success": "भुगतानं सफलम्",
            "pending": "भुगतानं प्रलम्बितम्",
            "refunded": "भुगतानं प्रत्यर्पितम्"
        },
        "general": {
            "ok": "अस्तु",
            "success": "सफलता",
            "error": "त्रुटिः",
            "warning": "चेतावनी",
            "info": "सूचना",
            "loading": "लोड् भवति...",
            "processing": "प्रक्रिया भवति...",
            "no_data": "कोऽपि दत्तांशः न लब्धः"
        }
    }
}

def get_translation(lang: str, key: str, **kwargs):
    """
    Get translation for a given language and key
    Supports nested keys with dot notation (e.g., 'auth.invalid_credentials')
    """
    if lang not in translations:
        lang = "en"
    
    keys = key.split('.')
    value = translations[lang]
    
    try:
        for k in keys:
            value = value[k]
        
        # Format with kwargs if provided
        if kwargs and isinstance(value, str):
            return value.format(**kwargs)
        
        return value
    except (KeyError, TypeError):
        # Fallback to English if key not found
        try:
            value = translations["en"]
            for k in keys:
                value = value[k]
            if kwargs and isinstance(value, str):
                return value.format(**kwargs)
            return value
        except (KeyError, TypeError):
            return key  # Return key if translation not found
