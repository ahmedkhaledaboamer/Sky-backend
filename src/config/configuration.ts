// Typed view of the environment. Variable names are unchanged from the Express app.
export default () => ({
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.PORT) || 8000,
  baseUrl: process.env.BASE_URL,
  db: {
    uri: process.env.DB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET_KEY,
    expiresIn: process.env.JWT_EXPIRE_TIME,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || undefined,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },
  stripe: {
    secret: process.env.STRIPE_SECRET,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  shop: {
    frontendUrl: process.env.FRONTEND_URL,
    currency: (process.env.CURRENCY || 'aed').toLowerCase(),
    taxPrice: Number(process.env.TAX_PRICE) || 0,
    shippingPrice: Number(process.env.SHIPPING_PRICE) || 0,
  },
});
