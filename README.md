# GodwitCare

## Stripe payment configuration

The payment workflow uses Stripe Payment Intents. The backend keeps the Stripe secret key server-side and the frontend loads Stripe.js with a publishable key so raw card data is handled only by Stripe.

Set these environment variables per environment:

```bash
STRIPE_ENVIRONMENT=test
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

For production, switch to live keys and set `STRIPE_ENVIRONMENT=live`. Never expose `STRIPE_SECRET_KEY` in frontend builds or browser-visible configuration. Backend API calls must use a secret key that starts with `sk_test` or `sk_live`; publishable keys that start with `pk_` only belong in `STRIPE_PUBLISHABLE_KEY`.
