# Stripe Payment Integration Setup Guide

This guide explains how to set up and use the Stripe payment integration with Link, "Pay without Link", and UPI payment methods (PhonePe, Google Pay, Paytm).

## Features

✅ **Stripe Link** - One-click payment for returning customers  
✅ **Pay without Link** - Traditional card payment option  
✅ **UPI Support** - PhonePe, Google Pay, Paytm integration  
✅ **Automatic Payment Methods** - Stripe automatically enables relevant payment methods based on customer location  
✅ **Webhook Support** - Real-time payment status updates  
✅ **Beautiful UI** - Dark-themed payment modal with modern design

## Prerequisites

1. **Stripe Account**: Sign up at https://stripe.com
2. **API Keys**: Get your keys from https://dashboard.stripe.com/apikeys
3. **Webhook Secret**: Set up webhooks at https://dashboard.stripe.com/webhooks

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `stripe==7.8.0` - Stripe Python SDK

### 2. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Stripe Payment Gateway
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

**Getting your keys:**
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

**Setting up webhooks:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/payments/stripe/webhook`
4. Select events: `payment_intent.succeeded` and `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 3. Run Database Migration

```bash
cd backend
python migrations/add_stripe_payment_fields.py
```

Or if using Alembic:
```bash
alembic upgrade head
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- `@stripe/stripe-js` - Stripe.js library
- `@stripe/react-stripe-js` - React components for Stripe

### 2. Configure Environment Variables

Add the following to your `frontend/.env` file:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

**Note:** Only use the **publishable key** in the frontend. Never expose your secret key!

### 3. Start Development Server

```bash
npm run dev
```

## Usage

### For Customers

1. Complete a ride and wait for the trip status to be "COMPLETED"
2. In the trip details modal, you'll see two payment options:
   - **Pay with Razorpay** (existing option)
   - **Pay with Stripe** (new option)
3. Click "Pay with Stripe" to open the payment modal
4. Choose your payment method:
   - **Link** - If you've used Stripe Link before, enter your email for one-click payment
   - **Card** - Enter card details manually
   - **UPI** - Select PhonePe, Google Pay, or Paytm (automatically shown for Indian customers)
5. Complete the payment
6. Payment status updates automatically via webhook

### Payment Flow

```
Customer clicks "Pay with Stripe"
    ↓
Frontend creates Payment Intent via API
    ↓
Stripe Payment Modal opens with payment options
    ↓
Customer selects payment method (Link/Card/UPI)
    ↓
Customer completes payment
    ↓
Stripe sends webhook to backend
    ↓
Backend updates transaction status
    ↓
Frontend refreshes and shows success
```

## Payment Methods Supported

### 1. Stripe Link
- One-click payment for returning customers
- Saves payment details securely with Stripe
- Fastest checkout experience

### 2. Card Payments
- Visa, Mastercard, American Express, Discover
- 3D Secure authentication when required
- Supports international cards

### 3. UPI (India)
- PhonePe
- Google Pay
- Paytm
- Other UPI apps

### 4. Digital Wallets
- Apple Pay (on Safari/iOS)
- Google Pay (on Chrome/Android)

## Testing

### Test Cards

Use these test cards in **test mode**:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Declined card |

**Test UPI:**
- Use any UPI ID in test mode (e.g., `test@paytm`)
- All test UPI payments will succeed

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:2060/api/payments/stripe/webhook

# Copy the webhook signing secret and add to .env
# whsec_xxxxxxxxxxxxx
```

## API Endpoints

### Create Payment Intent
```http
POST /api/payments/stripe/create-payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "transaction_id": 123,
  "amount": 932.29,
  "payment_method_types": ["card", "link"]
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "payment_id": 456,
  "publishable_key": "pk_test_xxx"
}
```

### Webhook Handler
```http
POST /api/payments/stripe/webhook
Stripe-Signature: <signature>

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": { ... }
  }
}
```

## Database Schema

### PaymentTransaction Model

New fields added:
- `stripe_payment_intent_id` - Stripe Payment Intent ID
- `stripe_payment_method_id` - Payment method used (card, upi, etc.)
- `stripe_charge_id` - Charge ID for the transaction

### PaymentMethod Enum

New values:
- `STRIPE` - Stripe payments
- `PAYTM` - Paytm UPI payments

## Security Best Practices

1. **Never expose secret keys** - Only use publishable keys in frontend
2. **Verify webhooks** - Always verify webhook signatures
3. **Use HTTPS** - Required for production Stripe integration
4. **PCI Compliance** - Stripe handles card data, you never touch it
5. **Test mode** - Use test keys during development

## Troubleshooting

### Payment Modal Not Opening
- Check if `VITE_STRIPE_PUBLISHABLE_KEY` is set in frontend `.env`
- Verify the key starts with `pk_test_` or `pk_live_`
- Check browser console for errors

### Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check webhook signing secret matches in `.env`
- Use Stripe CLI for local testing
- Check webhook logs in Stripe Dashboard

### Payment Fails Immediately
- Verify `STRIPE_SECRET_KEY` is set in backend `.env`
- Check if the key is valid and not expired
- Review Stripe Dashboard for error details

### UPI Not Showing
- UPI is automatically shown for Indian customers
- Ensure Stripe account is enabled for India
- Check if payment methods are enabled in Stripe Dashboard

## Production Deployment

### 1. Switch to Live Keys

Replace test keys with live keys:
```env
# Backend .env
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY

# Frontend .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

### 2. Update Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Add production webhook URL
3. Update `STRIPE_WEBHOOK_SECRET` with new signing secret

### 3. Enable Payment Methods

1. Go to https://dashboard.stripe.com/settings/payment_methods
2. Enable desired payment methods:
   - Cards
   - Link
   - UPI (for India)
   - Digital Wallets

### 4. Test in Production

- Make a small test payment
- Verify webhook receives events
- Check transaction updates correctly

## Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **API Reference**: https://stripe.com/docs/api

## License

This integration is part of the DGDS Clone project.
