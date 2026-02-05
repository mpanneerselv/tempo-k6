import * as tracing from 'k6/x/tracing;;
import { sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Helpers
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom(items, weights) {
  let total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return items[i];
  }
  return items[items.length - 1];
}

// Tracing client configuration
const client = new tracing.Client({
  endpoint: 'localhost:4317',           // ← change to your Tempo OTLP/gRPC endpoint
  exporter: tracing.EXPORTER_OTLP,
  insecure: true,                       // change to false + add TLS config in production
  // authentication: { user: 'tenant', password: 'key' }, // if needed
});

// Service names (used only in attributes / resource — not for topology)
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
];

// HTTP method & status distribution
function getRandomMethod() {
  const r = Math.random();
  if (r < 0.6) return 'GET';
  if (r < 0.8) return 'POST';
  if (r < 0.9) return 'PUT';
  return 'DELETE';
}

function getRandomStatus() {
  const r = Math.random();
  if (r < 0.9) return 200 + Math.floor(Math.random() * 10);
  if (r < 0.95) return 400 + Math.floor(Math.random() * 100);
  return 500 + Math.floor(Math.random() * 100);
}

const semantics = [
  tracing.SEMANTICS_HTTP,
  tracing.SEMANTICS_DB,
  tracing.SEMANTICS_RPC,
  tracing.SEMANTICS_MESSAGING,
];

// Span factory
function createSpan(service, name, parentIdx, semantic, method, urlPath, extra = {}) {
  const status = getRandomStatus();
  const span = {
    service,
    name,
    parentIdx,
    duration: { min: 10, max: 200 },
    attributeSemantics: semantic,
    attributes: {
      'http.method': method,
      'http.status_code': status,
      'http.url': `https://api.ecommerce.com/${service.replace(/-service$/, '')}/${urlPath}`,
      ...extra,
    },
    resource: {
      attributes: { 'deployment.environment': 'prod', 'service.version': '1.2.3' },
    },
  };

  if (semantic === tracing.SEMANTICS_HTTP) {
    span.attributes['http.request.header.user-agent'] = 'Mozilla/5.0 (compatible; LoadTest/1.0)';
    span.attributes['http.response.header.content-type'] = 'application/json';
  } else if (semantic === tracing.SEMANTICS_DB) {
    span.attributes['db.system'] = randomItem(['postgresql', 'mysql', 'mongodb', 'redis']);
    span.attributes['db.statement'] = `SELECT * FROM ${service.replace(/-service$/, '')} LIMIT 25`;
    span.attributes['db.user'] = 'app_ro';
  } else if (semantic === tracing.SEMANTICS_RPC) {
    span.attributes['rpc.system'] = 'grpc';
    span.attributes['rpc.method'] = 'Execute';
  } else if (semantic === tracing.SEMANTICS_MESSAGING) {
    span.attributes['messaging.system'] = randomItem(['kafka', 'rabbitmq', 'sqs']);
    span.attributes['messaging.destination'] = `${service.replace(/-service$/, '')}-queue`;
    span.attributes['messaging.message_id'] = `msg-${randomIntBetween(100000, 999999)}`;
  }

  // Large attribute ~1–5 kB
  span.attributes['payload'] = 'x'.repeat(randomIntBetween(1000, 5000));

  if (status >= 400) {
    span.attributes['error'] = true;
    span.attributes['error.message'] = status < 500 ? 'Client error' : 'Internal server error';
  }

  return span;
}

// All scenarios — parentIdx always < current index
const scenarios = [
  { name: 'user_registration', spans: [
    createSpan('frontend-service',        'POST /register',             -1, tracing.SEMANTICS_HTTP,     'POST', 'register'),               // 0
    createSpan('api-gateway-service',     'forward /auth/register',      0, tracing.SEMANTICS_RPC,       'POST', 'auth/register'),           // 1
    createSpan('auth-service',            'create user',                 1, tracing.SEMANTICS_DB,        'POST', 'users'),                   // 2
    createSpan('user-service',            'create profile',              1, tracing.SEMANTICS_DB,        'POST', 'profiles'),                // 3
    createSpan('cache-service',           'set user:cache',              1, tracing.SEMANTICS_MESSAGING, 'SET',  'user'),                    // 4
    createSpan('notification-service',    'queue welcome email',         1, tracing.SEMANTICS_MESSAGING, 'PUB',  'welcome'),                 // 5
    createSpan('email-service',           'send email',                  5, tracing.SEMANTICS_HTTP,      'POST', 'send'),                    // 6
    createSpan('logging-service',         'log registration',            1, tracing.SEMANTICS_DB,        'INSERT','audit_events'),           // 7
  ]},

  { name: 'user_login', spans: [
    createSpan('frontend-service', 'POST /login', -1, tracing.SEMANTICS_HTTP, 'POST', 'login'), // 0
    createSpan('api-gateway-service', 'forward /auth/login', 0, tracing.SEMANTICS_RPC, 'POST', 'auth/login'), // 1
    createSpan('auth-service', 'validate credentials', 1, tracing.SEMANTICS_DB, 'GET', 'users/auth'), // 2
    createSpan('session-service', 'create session', 1, tracing.SEMANTICS_MESSAGING, 'SET', 'session'), // 3
    createSpan('analytics-service', 'track login', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 4
    createSpan('logging-service', 'log login', 1, tracing.SEMANTICS_DB, 'INSERT', 'audit_events'), // 5
  ]},

  { name: 'product_search', spans: [
    createSpan('frontend-service', 'GET /search', -1, tracing.SEMANTICS_HTTP, 'GET', 'search'), // 0
    createSpan('api-gateway-service', 'forward /search', 0, tracing.SEMANTICS_RPC, 'GET', 'search'), // 1
    createSpan('search-service', 'execute search', 1, tracing.SEMANTICS_DB, 'GET', 'products'), // 2
    createSpan('catalog-service', 'get categories', 1, tracing.SEMANTICS_HTTP, 'GET', 'categories'), // 3
    createSpan('personalization-service', 'get recs', 1, tracing.SEMANTICS_RPC, 'GET', 'recommendations'), // 4
    createSpan('cache-service', 'get cached results', 1, tracing.SEMANTICS_MESSAGING, 'GET', 'cache'), // 5
    createSpan('analytics-service', 'track search', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 6
  ]},

  { name: 'view_product_details', spans: [
    createSpan('frontend-service', 'GET /product/:id', -1, tracing.SEMANTICS_HTTP, 'GET', 'product'), // 0
    createSpan('api-gateway-service', 'forward /product', 0, tracing.SEMANTICS_RPC, 'GET', 'product'), // 1
    createSpan('product-service', 'get product', 1, tracing.SEMANTICS_DB, 'GET', 'products'), // 2
    createSpan('inventory-service', 'get stock', 1, tracing.SEMANTICS_HTTP, 'GET', 'stock'), // 3
    createSpan('recommendation-service', 'get similar', 1, tracing.SEMANTICS_RPC, 'GET', 'similar'), // 4
    createSpan('review-service', 'get reviews', 1, tracing.SEMANTICS_DB, 'GET', 'reviews'), // 5
    createSpan('image-processing-service', 'get images', 1, tracing.SEMANTICS_HTTP, 'GET', 'images'), // 6
    createSpan('analytics-service', 'track view', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 7
  ]},

  { name: 'add_to_cart', spans: [
    createSpan('frontend-service', 'POST /cart/add', -1, tracing.SEMANTICS_HTTP, 'POST', 'cart/add'), // 0
    createSpan('api-gateway-service', 'forward /cart', 0, tracing.SEMANTICS_RPC, 'POST', 'cart'), // 1
    createSpan('cart-service', 'add item', 1, tracing.SEMANTICS_DB, 'POST', 'cart_items'), // 2
    createSpan('inventory-service', 'reserve stock', 1, tracing.SEMANTICS_HTTP, 'PUT', 'stock/reserve'), // 3
    createSpan('session-service', 'update cart in session', 1, tracing.SEMANTICS_MESSAGING, 'SET', 'cart'), // 4
    createSpan('analytics-service', 'track add-to-cart', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 5
    createSpan('logging-service', 'log cart change', 1, tracing.SEMANTICS_DB, 'INSERT', 'audit_events'), // 6
  ]},

  { name: 'checkout', spans: [
    createSpan('frontend-service', 'POST /checkout', -1, tracing.SEMANTICS_HTTP, 'POST', 'checkout'), // 0
    createSpan('api-gateway-service', 'forward /checkout', 0, tracing.SEMANTICS_RPC, 'POST', 'checkout'), // 1
    createSpan('checkout-service', 'validate cart', 1, tracing.SEMANTICS_DB, 'GET', 'cart'), // 2
    createSpan('user-service', 'get addresses', 1, tracing.SEMANTICS_HTTP, 'GET', 'addresses'), // 3
    createSpan('tax-calculation-service', 'calculate tax', 1, tracing.SEMANTICS_RPC, 'POST', 'tax'), // 4
    createSpan('shipping-service', 'get shipping rates', 1, tracing.SEMANTICS_HTTP, 'GET', 'rates'), // 5
    createSpan('coupon-service', 'validate coupon', 1, tracing.SEMANTICS_DB, 'GET', 'coupons'), // 6
    createSpan('analytics-service', 'track checkout start', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 7
  ]},

  { name: 'payment_processing', spans: [
    createSpan('frontend-service', 'POST /payment', -1, tracing.SEMANTICS_HTTP, 'POST', 'payment'), // 0
    createSpan('api-gateway-service', 'forward /payment', 0, tracing.SEMANTICS_RPC, 'POST', 'payment'), // 1
    createSpan('payment-service', 'charge gateway', 1, tracing.SEMANTICS_HTTP, 'POST', 'charge'), // 2
    createSpan('fraud-detection-service', 'check risk', 1, tracing.SEMANTICS_RPC, 'POST', 'risk'), // 3
    createSpan('billing-service', 'record transaction', 1, tracing.SEMANTICS_DB, 'POST', 'transactions'), // 4
    createSpan('notification-service', 'queue receipt', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'receipts'), // 5
    createSpan('email-service', 'send receipt', 5, tracing.SEMANTICS_HTTP, 'POST', 'send'), // 6
    createSpan('analytics-service', 'track payment success', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 7
  ]},

  { name: 'order_fulfillment', spans: [
    createSpan('order-service', 'fulfill order', -1, tracing.SEMANTICS_HTTP, 'POST', 'fulfill'), // 0 (event triggered)
    createSpan('warehouse-service', 'pick & pack', 0, tracing.SEMANTICS_RPC, 'POST', 'pick'), // 1
    createSpan('inventory-service', 'deduct stock', 1, tracing.SEMANTICS_DB, 'PUT', 'stock'), // 2
    createSpan('shipping-service', 'create label', 1, tracing.SEMANTICS_HTTP, 'POST', 'label'), // 3
    createSpan('tracking-service', 'create tracking', 1, tracing.SEMANTICS_DB, 'POST', 'tracking'), // 4
    createSpan('notification-service', 'queue shipped email', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'shipped'), // 5
    createSpan('email-service', 'send shipped notification', 5, tracing.SEMANTICS_HTTP, 'POST', 'send'), // 6
    createSpan('analytics-service', 'track fulfillment', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 7
  ]},

  { name: 'view_order_history', spans: [
    createSpan('frontend-service', 'GET /orders', -1, tracing.SEMANTICS_HTTP, 'GET', 'orders'), // 0
    createSpan('api-gateway-service', 'forward /orders', 0, tracing.SEMANTICS_RPC, 'GET', 'orders'), // 1
    createSpan('order-service', 'list orders', 1, tracing.SEMANTICS_DB, 'GET', 'orders'), // 2
    createSpan('user-service', 'get user info', 1, tracing.SEMANTICS_HTTP, 'GET', 'user'), // 3
    createSpan('tracking-service', 'get tracking status', 1, tracing.SEMANTICS_DB, 'GET', 'tracking'), // 4
    createSpan('cache-service', 'get cached history', 1, tracing.SEMANTICS_MESSAGING, 'GET', 'cache'), // 5
    createSpan('analytics-service', 'track history view', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 6
  ]},

  { name: 'apply_coupon', spans: [
    createSpan('frontend-service', 'POST /coupon/apply', -1, tracing.SEMANTICS_HTTP, 'POST', 'coupon/apply'), // 0
    createSpan('api-gateway-service', 'forward /coupon', 0, tracing.SEMANTICS_RPC, 'POST', 'coupon'), // 1
    createSpan('coupon-service', 'validate coupon', 1, tracing.SEMANTICS_DB, 'GET', 'coupons'), // 2
    createSpan('order-service', 'update order total', 1, tracing.SEMANTICS_HTTP, 'PUT', 'order'), // 3
    createSpan('analytics-service', 'track coupon use', 1, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 4
    createSpan('logging-service', 'log coupon application', 1, tracing.SEMANTICS_DB, 'INSERT', 'audit_events'), // 5
  ]},

  { name: 'send_notification', spans: [
    createSpan('notification-service', 'send promo', -1, tracing.SEMANTICS_HTTP, 'POST', 'notify'), // 0 (event/job)
    createSpan('user-service', 'get subscribers', 0, tracing.SEMANTICS_DB, 'GET', 'users'), // 1
    createSpan('email-service', 'send batch email', 0, tracing.SEMANTICS_HTTP, 'POST', 'batch'), // 2
    createSpan('sms-service', 'send batch SMS', 0, tracing.SEMANTICS_HTTP, 'POST', 'sms'), // 3
    createSpan('analytics-service', 'track notification', 0, tracing.SEMANTICS_MESSAGING, 'PUB', 'events'), // 4
    createSpan('logging-service', 'log notification', 0, tracing.SEMANTICS_DB, 'INSERT', 'audit_events'), // 5
  ]},

  { name: 'analytics_tracking', spans: [
    createSpan('analytics-service', 'process batch', -1, tracing.SEMANTICS_RPC, 'POST', 'process'), // 0 (job)
    createSpan('logging-service', 'query recent logs', 0, tracing.SEMANTICS_DB, 'GET', 'logs'), // 1
    createSpan('data-warehouse-service', 'load metrics', 0, tracing.SEMANTICS_DB, 'INSERT', 'metrics'), // 2
    createSpan('report-service', 'generate report', 0, tracing.SEMANTICS_HTTP, 'POST', 'report'), // 3
    createSpan('monitoring-service', 'check anomalies', 0, tracing.SEMANTICS_MESSAGING, 'PUB', 'alerts'), // 4
    createSpan('bi-service', 'refresh dashboard', 0, tracing.SEMANTICS_RPC, 'PUT', 'dashboard'), // 5
  ]},
];

const weights = [3,10,20,20,15,10,8,3,5,2,2,2];

export default function () {
  const scenario = weightedRandom(scenarios, weights);

  const template = {
    defaults: {
      attributes: { environment: 'production' },
      randomAttributes: { count: 5, cardinality: 10 },
    },
    spans: scenario.spans,
  };

  const gen = new tracing.TemplatedGenerator(template);
  const traces = gen.traces();
  client.push(traces);

  sleep(0.1);
}

export const options = {
  scenarios: {
    ecommerce_tracing: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 50,
      maxVUs: 500,
      startRate: 0,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};