import * as tracing from 'k6/x/tracing/client';
import { sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Helper function for random item selection
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weighted random selection function
function weightedRandom(items, weights) {
  let total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return items[i];
  }
  return items[items.length - 1]; // Fallback
}

// Configuration for the tracing client (assuming local Tempo OTLP/gRPC endpoint)
// Adjust endpoint, authentication, etc., as needed for your Tempo instance
const client = new tracing.Client({
  endpoint: 'localhost:4317', // Replace with your Tempo OTLP/gRPC endpoint (e.g., tempo:4317)
  exporter: tracing.EXPORTER_OTLP,
  insecure: true, // Set to false for production; configure TLS if needed
  // authentication: { user: 'tenant-id', password: 'api-token' }, // For Grafana Cloud Tempo
});

// Expanded list of unique e-commerce microservice names (100+ for large enterprise realism)
const services = [
  'frontend-service', 'api-gateway-service', 'auth-service', 'user-service', 'product-service',
  'catalog-service', 'search-service', 'cart-service', 'order-service', 'payment-service',
  'inventory-service', 'shipping-service', 'recommendation-service', 'notification-service',
  'review-service', 'wishlist-service', 'coupon-service', 'billing-service', 'customer-support-service',
  'analytics-service', 'logging-service', 'monitoring-service', 'email-service', 'sms-service',
  'checkout-service', 'fraud-detection-service', 'tax-calculation-service', 'currency-conversion-service',
  'image-processing-service', 'content-delivery-service', 'seo-optimization-service', 'ab-testing-service',
  'personalization-service', 'subscription-service', 'loyalty-service', 'gift-card-service',
  'returns-service', 'refunds-service', 'warehouse-service', 'supplier-service', 'vendor-service',
  'promotion-service', 'discount-service', 'flash-sale-service', 'inventory-sync-service',
  'order-fulfillment-service', 'tracking-service', 'delivery-service', 'partner-integration-service',
  'database-service', 'cache-service', 'queue-service', 'message-broker-service', 'event-processor-service',
  'batch-job-service', 'config-service', 'discovery-service', 'gateway-admin-service', 'user-profile-service',
  'address-service', 'payment-gateway-service', 'stock-management-service', 'price-service',
  'category-service', 'tag-service', 'filter-service', 'sort-service', 'pagination-service',
  'session-service', 'token-service', 'oauth-service', 'sso-service', 'audit-service',
  'compliance-service', 'data-privacy-service', 'backup-service', 'restore-service', 'disaster-recovery-service',
  'ci-cd-service', 'deployment-service', 'scaling-service', 'load-balancer-service', 'proxy-service',
  'firewall-service', 'vpn-service', 'encryption-service', 'key-management-service', 'secret-service',
  'metric-service', 'trace-service', 'alert-service', 'dashboard-service', 'report-service',
  'bi-service', 'data-warehouse-service', 'etl-service', 'ml-model-service', 'ai-recommendation-service',
  'chatbot-service', 'voice-assistant-service', 'ar-tryon-service', 'vr-showroom-service', 'social-integration-service',
  'facebook-auth-service', 'google-auth-service', 'apple-auth-service', 'marketplace-service', 'seller-service',
  'buyer-service', 'dispute-resolution-service', 'feedback-service', 'rating-service', 'moderation-service',
  'content-filter-service', 'spam-detection-service', 'abuse-report-service', 'legal-service', 'terms-service',
  // Add more if needed to exceed 100; this is ~100
];

// Available HTTP methods with weighted distribution (60% GET, 20% POST, 10% PUT, 10% DELETE)
function getRandomMethod() {
  const rand = Math.random();
  if (rand < 0.6) return 'GET';
  if (rand < 0.8) return 'POST';
  if (rand < 0.9) return 'PUT';
  return 'DELETE';
}

// Status codes with distribution (90% 2xx success, 5% 4xx client error, 5% 5xx server error)
function getRandomStatus() {
  const rand = Math.random();
  if (rand < 0.9) {
    return 200 + Math.floor(Math.random() * 10); // 200-209
  } else if (rand < 0.95) {
    return 400 + Math.floor(Math.random() * 100); // 400-499
  }
  return 500 + Math.floor(Math.random() * 100); // 500-599
}

// Available semantic conventions for span kinds
const semantics = [
  tracing.SEMANTICS_HTTP,
  tracing.SEMANTICS_DB,
  tracing.SEMANTICS_RPC,
  tracing.SEMANTICS_MESSAGING,
];

// Function to create a span object with realistic attributes
function createSpan(service, name, parentIdx, semantic, method, urlPath, additionalAttrs = {}) {
  const status = getRandomStatus();
  const span = {
    service: service,
    name: name,
    parentIdx: parentIdx,
    duration: { min: 10, max: 200 }, // Random duration in ms
    attributeSemantics: semantic,
    attributes: {
      'http.method': method,
      'http.status_code': status,
      'http.url': `https://api.ecommerce.com/${service.replace('-service', '')}/${urlPath}`,
      ...additionalAttrs,
    },
    resource: {
      attributes: { 'deployment.environment': 'prod', 'service.version': '1.0.0' },
    },
  };

  // Add semantic-specific attributes
  if (semantic === tracing.SEMANTICS_HTTP) {
    span.attributes['http.request.header.user-agent'] = 'Mozilla/5.0 (compatible; LoadTest)';
    span.attributes['http.response.header.content-type'] = 'application/json';
  } else if (semantic === tracing.SEMANTICS_DB) {
    span.attributes['db.system'] = randomItem(['mysql', 'postgres', 'mongodb', 'redis']);
    span.attributes['db.statement'] = `SELECT * FROM ${service.replace('-service', '')} WHERE id = ?`;
    span.attributes['db.user'] = 'app_user';
  } else if (semantic === tracing.SEMANTICS_RPC) {
    span.attributes['rpc.system'] = 'grpc';
    span.attributes['rpc.method'] = 'ProcessRequest';
  } else if (semantic === tracing.SEMANTICS_MESSAGING) {
    span.attributes['messaging.system'] = randomItem(['kafka', 'rabbitmq']);
    span.attributes['messaging.destination'] = `${service.replace('-service', '')}-topic`;
    span.attributes['messaging.message_id'] = `msg-${randomIntBetween(1000, 9999)}`;
  }

  // Add large attribute for 1-5 kB size (approx.)
  const payloadSize = randomIntBetween(1000, 5000);
  span.attributes['custom.payload'] = 'x'.repeat(payloadSize);

  // Error attributes if applicable
  if (status >= 400) {
    span.attributes['error'] = true;
    span.attributes['error.message'] = 'Simulated error in service call';
  }

  return span;
}

// Define 12 realistic e-commerce scenarios/journeys with hierarchical parent-child spans
// Each scenario simulates a user flow in a large enterprise environment, with branches for parallelism (e.g., caching, logging)
const scenarios = [
  // 1. User Registration
  {
    name: 'user_registration',
    spans: [
      createSpan('frontend-service', 'http.post /register', -1, tracing.SEMANTICS_HTTP, 'POST', 'register'),
      createSpan('api-gateway-service', 'rpc.call auth', 0, tracing.SEMANTICS_RPC, 'POST', 'auth/register'),
      createSpan('auth-service', 'db.insert users', 1, tracing.SEMANTICS_DB, 'POST', 'users'),
      createSpan('user-service', 'db.insert profiles', 1, tracing.SEMANTICS_DB, 'POST', 'profiles'), // Branch
      createSpan('cache-service', 'cache.set user', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'cache/user'), // Branch
      createSpan('notification-service', 'messaging.send welcome_email', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'emails/welcome'),
      createSpan('email-service', 'http.post smtp', 5, tracing.SEMANTICS_HTTP, 'POST', 'smtp/send'),
      createSpan('logging-service', 'db.log event', 1, tracing.SEMANTICS_DB, 'POST', 'logs'), // Branch for auditing
    ],
  },
  // 2. User Login
  {
    name: 'user_login',
    spans: [
      createSpan('frontend-service', 'http.post /login', -1, tracing.SEMANTICS_HTTP, 'POST', 'login'),
      createSpan('api-gateway-service', 'rpc.call auth', 0, tracing.SEMANTICS_RPC, 'POST', 'auth/login'),
      createSpan('auth-service', 'db.query users', 1, tracing.SEMANTICS_DB, 'GET', 'users'),
      createSpan('session-service', 'cache.set session', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'sessions'),
      createSpan('analytics-service', 'messaging.track login', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/login'),
      createSpan('logging-service', 'db.log event', 1, tracing.SEMANTICS_DB, 'POST', 'logs'),
    ],
  },
  // 3. Product Search
  {
    name: 'product_search',
    spans: [
      createSpan('frontend-service', 'http.get /search', -1, tracing.SEMANTICS_HTTP, 'GET', 'search'),
      createSpan('api-gateway-service', 'rpc.call search', 0, tracing.SEMANTICS_RPC, 'GET', 'search/query'),
      createSpan('search-service', 'db.query products', 1, tracing.SEMANTICS_DB, 'GET', 'products/search'),
      createSpan('catalog-service', 'http.get categories', 1, tracing.SEMANTICS_HTTP, 'GET', 'categories'), // Branch
      createSpan('personalization-service', 'rpc.get recommendations', 1, tracing.SEMANTICS_RPC, 'GET', 'recommendations/search'),
      createSpan('cache-service', 'cache.get results', 1, tracing.SEMANTICS_MESSAGING, 'GET', 'cache/search'),
      createSpan('analytics-service', 'messaging.track search', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/search'),
    ],
  },
  // 4. View Product Details
  {
    name: 'view_product_details',
    spans: [
      createSpan('frontend-service', 'http.get /product/:id', -1, tracing.SEMANTICS_HTTP, 'GET', 'product/id'),
      createSpan('api-gateway-service', 'rpc.call product', 0, tracing.SEMANTICS_RPC, 'GET', 'product/id'),
      createSpan('product-service', 'db.query products', 1, tracing.SEMANTICS_DB, 'GET', 'products/id'),
      createSpan('inventory-service', 'http.get stock', 1, tracing.SEMANTICS_HTTP, 'GET', 'stock/id'), // Branch
      createSpan('recommendation-service', 'rpc.get similar', 1, tracing.SEMANTICS_RPC, 'GET', 'recommendations/similar'),
      createSpan('review-service', 'db.query reviews', 1, tracing.SEMANTICS_DB, 'GET', 'reviews/product_id'), // Branch
      createSpan('image-processing-service', 'http.get images', 1, tracing.SEMANTICS_HTTP, 'GET', 'images/product_id'),
      createSpan('analytics-service', 'messaging.track view', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/view'),
    ],
  },
  // 5. Add to Cart
  {
    name: 'add_to_cart',
    spans: [
      createSpan('frontend-service', 'http.post /cart/add', -1, tracing.SEMANTICS_HTTP, 'POST', 'cart/add'),
      createSpan('api-gateway-service', 'rpc.call cart', 0, tracing.SEMANTICS_RPC, 'POST', 'cart/add'),
      createSpan('cart-service', 'db.insert cart_items', 1, tracing.SEMANTICS_DB, 'POST', 'cart/items'),
      createSpan('inventory-service', 'http.put reserve_stock', 1, tracing.SEMANTICS_HTTP, 'PUT', 'stock/reserve'), // Branch
      createSpan('session-service', 'cache.update cart', 1, tracing.SEMANTICS_MESSAGING, 'PUT', 'sessions/cart'),
      createSpan('analytics-service', 'messaging.track add_to_cart', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/add_to_cart'),
      createSpan('logging-service', 'db.log event', 1, tracing.SEMANTICS_DB, 'POST', 'logs'),
    ],
  },
  // 6. Checkout
  {
    name: 'checkout',
    spans: [
      createSpan('frontend-service', 'http.post /checkout', -1, tracing.SEMANTICS_HTTP, 'POST', 'checkout'),
      createSpan('api-gateway-service', 'rpc.call checkout', 0, tracing.SEMANTICS_RPC, 'POST', 'checkout/init'),
      createSpan('checkout-service', 'db.query cart', 1, tracing.SEMANTICS_DB, 'GET', 'cart'),
      createSpan('user-service', 'http.get addresses', 1, tracing.SEMANTICS_HTTP, 'GET', 'addresses'), // Branch
      createSpan('tax-calculation-service', 'rpc.calculate tax', 1, tracing.SEMANTICS_RPC, 'POST', 'tax/calculate'),
      createSpan('shipping-service', 'http.get rates', 1, tracing.SEMANTICS_HTTP, 'GET', 'shipping/rates'), // Branch
      createSpan('coupon-service', 'db.validate coupon', 1, tracing.SEMANTICS_DB, 'GET', 'coupons/validate'),
      createSpan('analytics-service', 'messaging.track checkout', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/checkout'),
    ],
  },
  // 7. Payment Processing
  {
    name: 'payment_processing',
    spans: [
      createSpan('frontend-service', 'http.post /payment', -1, tracing.SEMANTICS_HTTP, 'POST', 'payment/process'),
      createSpan('api-gateway-service', 'rpc.call payment', 0, tracing.SEMANTICS_RPC, 'POST', 'payment/process'),
      createSpan('payment-service', 'http.post gateway', 1, tracing.SEMANTICS_HTTP, 'POST', 'gateway/charge'),
      createSpan('fraud-detection-service', 'rpc.check fraud', 1, tracing.SEMANTICS_RPC, 'POST', 'fraud/check'), // Branch
      createSpan('billing-service', 'db.insert transaction', 1, tracing.SEMANTICS_DB, 'POST', 'transactions'),
      createSpan('notification-service', 'messaging.send receipt', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'emails/receipt'),
      createSpan('email-service', 'http.post smtp', 5, tracing.SEMANTICS_HTTP, 'POST', 'smtp/send'),
      createSpan('analytics-service', 'messaging.track payment', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/payment'),
    ],
  },
  // 8. Order Fulfillment
  {
    name: 'order_fulfillment',
    spans: [
      createSpan('order-service', 'http.post /fulfill', -1, tracing.SEMANTICS_HTTP, 'POST', 'orders/fulfill'), // Triggered by event
      createSpan('warehouse-service', 'rpc.pick items', 0, tracing.SEMANTICS_RPC, 'POST', 'warehouse/pick'),
      createSpan('inventory-service', 'db.update stock', 1, tracing.SEMANTICS_DB, 'PUT', 'stock/update'),
      createSpan('shipping-service', 'http.post label', 1, tracing.SEMANTICS_HTTP, 'POST', 'shipping/label'), // Branch
      createSpan('tracking-service', 'db.insert tracking', 1, tracing.SEMANTICS_DB, 'POST', 'tracking'),
      createSpan('notification-service', 'messaging.send shipped', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'emails/shipped'),
      createSpan('email-service', 'http.post smtp', 5, tracing.SEMANTICS_HTTP, 'POST', 'smtp/send'),
      createSpan('analytics-service', 'messaging.track fulfillment', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/fulfillment'),
    ],
  },
  // 9. View Order History
  {
    name: 'view_order_history',
    spans: [
      createSpan('frontend-service', 'http.get /orders', -1, tracing.SEMANTICS_HTTP, 'GET', 'orders'),
      createSpan('api-gateway-service', 'rpc.call order', 0, tracing.SEMANTICS_RPC, 'GET', 'orders/history'),
      createSpan('order-service', 'db.query orders', 1, tracing.SEMANTICS_DB, 'GET', 'orders/user_id'),
      createSpan('user-service', 'http.get user', 1, tracing.SEMANTICS_HTTP, 'GET', 'users/id'), // Branch
      createSpan('tracking-service', 'db.query status', 1, tracing.SEMANTICS_DB, 'GET', 'tracking/order_id'),
      createSpan('cache-service', 'cache.get history', 1, tracing.SEMANTICS_MESSAGING, 'GET', 'cache/orders'),
      createSpan('analytics-service', 'messaging.track view_history', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/view_history'),
    ],
  },
  // 10. Apply Coupon
  {
    name: 'apply_coupon',
    spans: [
      createSpan('frontend-service', 'http.post /coupon/apply', -1, tracing.SEMANTICS_HTTP, 'POST', 'coupon/apply'),
      createSpan('api-gateway-service', 'rpc.call coupon', 0, tracing.SEMANTICS_RPC, 'POST', 'coupon/apply'),
      createSpan('coupon-service', 'db.validate coupon', 1, tracing.SEMANTICS_DB, 'GET', 'coupons/validate'),
      createSpan('order-service', 'http.put update_total', 1, tracing.SEMANTICS_HTTP, 'PUT', 'orders/update_total'), // Branch
      createSpan('analytics-service', 'messaging.track coupon', 1, tracing.SEMANTICS_MESSAGING, 'POST', 'events/coupon_apply'),
      createSpan('logging-service', 'db.log event', 1, tracing.SEMANTICS_DB, 'POST', 'logs'),
    ],
  },
  // 11. Send Notification (e.g., promo)
  {
    name: 'send_notification',
    spans: [
      createSpan('notification-service', 'http.post /notify', -1, tracing.SEMANTICS_HTTP, 'POST', 'notify/promo'), // Event-driven
      createSpan('user-service', 'db.query subscribers', 0, tracing.SEMANTICS_DB, 'GET', 'users/subscribers'),
      createSpan('email-service', 'http.post smtp_batch', 0, tracing.SEMANTICS_HTTP, 'POST', 'smtp/batch'), // Branch
      createSpan('sms-service', 'http.post twilio', 0, tracing.SEMANTICS_HTTP, 'POST', 'sms/send'), // Branch
      createSpan('analytics-service', 'messaging.track notify', 0, tracing.SEMANTICS_MESSAGING, 'POST', 'events/notify'),
      createSpan('logging-service', 'db.log event', 0, tracing.SEMANTICS_DB, 'POST', 'logs'),
    ],
  },
  // 12. Analytics Tracking (batch job)
  {
    name: 'analytics_tracking',
    spans: [
      createSpan('analytics-service', 'batch.process events', -1, tracing.SEMANTICS_RPC, 'POST', 'analytics/process'), // Batch job
      createSpan('logging-service', 'db.query logs', 0, tracing.SEMANTICS_DB, 'GET', 'logs/recent'),
      createSpan('data-warehouse-service', 'db.insert metrics', 0, tracing.SEMANTICS_DB, 'POST', 'metrics'),
      createSpan('report-service', 'http.generate report', 0, tracing.SEMANTICS_HTTP, 'POST', 'reports/generate'), // Branch
      createSpan('monitoring-service', 'messaging.alert anomalies', 0, tracing.SEMANTICS_MESSAGING, 'POST', 'alerts/anomalies'),
      createSpan('bi-service', 'rpc.update dashboard', 0, tracing.SEMANTICS_RPC, 'PUT', 'dashboards/update'),
    ],
  },
];

// Realistic weights for scenarios (sum to 100 for percentage-like distribution)
// Higher weights for common user actions like search and product views
// Lower for registrations, fulfillments, etc.
const weights = [
  3,  // user_registration (rare)
  10, // user_login (common but not constant)
  20, // product_search (very common)
  20, // view_product_details (very common)
  15, // add_to_cart (frequent during browsing)
  10, // checkout (less than adds)
  8,  // payment_processing (conversion rate lower)
  3,  // order_fulfillment (backend, post-purchase)
  5,  // view_order_history (occasional)
  2,  // apply_coupon (situational)
  2,  // send_notification (event-driven)
  2   // analytics_tracking (batch, infrequent)
];

export default function () {
  // Select scenario with realistic weighted distribution
  const selectedScenario = weightedRandom(scenarios, weights);

  // Build trace template from selected scenario
  const template = {
    defaults: {
      attributes: { 'environment': 'production' },
      randomAttributes: { count: 5, cardinality: 10 }, // Adds random attributes for variety
    },
    spans: selectedScenario.spans,
  };

  // Generate and push the trace
  const gen = new tracing.TemplatedGenerator(template);
  const traces = gen.traces();
  client.push(traces);

  // Optional: Simulate some delay
  sleep(0.1);
}

// k6 options using ramping-arrival-rate executor for realistic load ramp-up
export const options = {
  scenarios: {
    ecommerce_tracing: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 50,  // Initial pool of VUs
      maxVUs: 500,          // Max VUs to allocate if needed
      startRate: 0,         // Starting arrival rate (iterations per timeUnit)
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 traces/second over 2 minutes
        { duration: '5m', target: 100 },  // Sustain at 100/s for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down to 0 over 2 minutes
      ],
    },
  },
  // thresholds: { ... }, // Add performance thresholds as needed
};