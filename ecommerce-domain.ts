import tracing from 'k6/x/tracing';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/* ======================================================================
   CONFIGURATION
   1. RATE: Base Request Per Second (RPS) target for this single pod.
   2. DURATION_SEC: Total duration of the test in seconds.
   
   Usage: k6 run -e RATE=500 -e DURATION_SEC=1800 realistic_mesh_100_services.js
   ====================================================================== */

const ENDPOINT = __ENV.TEMPO_ENDPOINT || 'tempo-distributor.tempo.svc.cluster.local:4317';

// Default: 200 RPS per pod, 20 minutes duration
const BASE_RATE = parseInt(__ENV.RATE) || 200; 
const TOTAL_DURATION_SEC = parseInt(__ENV.DURATION_SEC) || 1200;

// Dynamic Stage Calculation (10% Ramp Up, 80% Sustain, 10% Ramp Down)
const RAMP_TIME_SEC = Math.floor(TOTAL_DURATION_SEC * 0.1);
const SUSTAIN_TIME_SEC = Math.floor(TOTAL_DURATION_SEC * 0.8);
const DOWN_TIME_SEC = Math.floor(TOTAL_DURATION_SEC * 0.1);

// Initialize Client
const client = new tracing.Client({
    endpoint: ENDPOINT,
    insecure: true,
});

// Entropy Pool for high-performance payload generation (5MB noise)
const ENTROPY_POOL = randomString(5 * 1024 * 1024, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+');

// Helper to calculate VUs based on rate (Assuming worst case 1s latency for safety)
const calculateVUs = (targetRate) => Math.ceil(targetRate * 2);

// Weights for different scenarios
const RATES = {
    BROWSING: Math.floor(BASE_RATE * 0.50),  // 50%
    CHECKOUT: Math.floor(BASE_RATE * 0.10),  // 10%
    LOGIN:    Math.floor(BASE_RATE * 0.15),  // 15%
    INVENTORY:Math.floor(BASE_RATE * 0.05),  // 5%
    RETURNS:  Math.floor(BASE_RATE * 0.05),  // 5%
    SUPPORT:  Math.floor(BASE_RATE * 0.10),  // 10% (Support Chat)
    ADS:      Math.floor(BASE_RATE * 0.05)   // 5% (Ad Bidding)
};

export const options = {
    scenarios: {
        browsing_traffic: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.BROWSING * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.BROWSING),
            maxVUs: calculateVUs(RATES.BROWSING) * 2, 
            stages: [
                { target: RATES.BROWSING, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.BROWSING, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runBrowseJourney',
        },
        checkout_traffic: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.CHECKOUT * 0.1), 
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.CHECKOUT),
            maxVUs: calculateVUs(RATES.CHECKOUT) * 2,
            stages: [
                { target: RATES.CHECKOUT, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.CHECKOUT, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runCheckoutJourney',
        },
        login_traffic: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.LOGIN * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.LOGIN),
            maxVUs: calculateVUs(RATES.LOGIN) * 2,
            stages: [
                { target: RATES.LOGIN, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.LOGIN, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runLoginJourney',
        },
        inventory_sync: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.INVENTORY * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.INVENTORY),
            maxVUs: calculateVUs(RATES.INVENTORY) * 2,
            stages: [
                { target: RATES.INVENTORY, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.INVENTORY, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runInventorySync',
        },
        return_traffic: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.RETURNS * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.RETURNS),
            maxVUs: calculateVUs(RATES.RETURNS) * 2,
            stages: [
                { target: RATES.RETURNS, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.RETURNS, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runReturnJourney',
        },
        support_chat: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.SUPPORT * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.SUPPORT),
            maxVUs: calculateVUs(RATES.SUPPORT) * 2,
            stages: [
                { target: RATES.SUPPORT, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.SUPPORT, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runSupportJourney',
        },
        ad_bidding: {
            executor: 'ramping-arrival-rate',
            startRate: Math.floor(RATES.ADS * 0.1),
            timeUnit: '1s',
            preAllocatedVUs: calculateVUs(RATES.ADS),
            maxVUs: calculateVUs(RATES.ADS) * 2,
            stages: [
                { target: RATES.ADS, duration: `${RAMP_TIME_SEC}s` },
                { target: RATES.ADS, duration: `${SUSTAIN_TIME_SEC}s` },
                { target: 0, duration: `${DOWN_TIME_SEC}s` },
            ],
            exec: 'runAdBiddingJourney',
        }
    },
};

// ==========================================
// SCALED SERVICE TOPOLOGY (100+ Services)
// ==========================================
const SERVICES = {
    // 1. Edge & Gateways
    CDN_EDGE_NA: "cdn-edge-na", CDN_EDGE_EU: "cdn-edge-eu", CDN_EDGE_APAC: "cdn-edge-apac",
    WAF: "waf-security", API_GATEWAY: "api-gateway", GRAPHQL_GATEWAY: "graphql-gateway",
    MOBILE_BFF: "mobile-bff", WEB_BFF: "web-bff", PARTNER_API: "partner-api", IOT_GATEWAY: "iot-gateway",

    // 2. Identity & Access
    AUTH: "auth-service", USER_PROFILE: "user-profile-svc", KYC_CHECK: "kyc-verification", 
    TOKEN_ISSUER: "token-issuer", MFA_PROVIDER: "mfa-provider", SOCIAL_LOGIN: "social-login-connector",
    RBAC_POLICY: "rbac-policy-engine", SESSION_STORE: "valkey-session-cluster",
    
    // 3. Catalog & Search
    CATALOG_READ: "catalog-read-svc", CATALOG_WRITE: "catalog-write-svc", SEARCH_ENGINE: "search-service", 
    IMAGE_RESIZER: "image-resizer", VIDEO_TRANSCODER: "video-transcoder", TRANSLATION_SVC: "translation-service",
    PRICE_CALCULATOR: "price-calculator", DISCOUNT_ENGINE: "discount-engine", 
    INVENTORY_SHARD_EU: "inventory-shard-eu", INVENTORY_SHARD_US: "inventory-shard-us", INVENTORY_SHARD_APAC: "inventory-shard-apac",
    REVIEWS: "review-service", RECOMMENDATION: "recommendation-ml-model",
    
    // 4. Checkout & Cart
    CART: "cart-service", CHECKOUT: "checkout-orchestrator", TAX_CALCULATOR_US: "tax-calculator-us", TAX_CALCULATOR_EU: "tax-calculator-eu",
    SHIPPING_ESTIMATOR: "shipping-estimator", PROMO_CODE_SVC: "promo-code-validator",
    GIFT_CARD_SVC: "gift-card-service", CURRENCY_CONVERTER: "currency-converter",

    // 5. Payment & Ledger
    PAYMENT_GATEWAY: "payment-gateway", WALLET_SVC: "wallet-service", LEDGER: "ledger-service", 
    FRAUD_DETECTOR: "fraud-detection-v2", AML_CHECK: "aml-check", CREDIT_CHECK: "credit-check-bureau",
    STRIPE_MOCK: "stripe-mock", PAYPAL_MOCK: "paypal-mock", ADYEN_MOCK: "adyen-mock", BNPL_PROVIDER: "bnpl-provider",

    // 6. Logistics & Fulfillment
    ORDER_PROCESSOR: "order-processor", ORDER_HISTORY: "order-history", FULFILLMENT: "fulfillment-orchestrator", 
    WAREHOUSE_ROBOTICS: "warehouse-robotics", LABEL_GENERATOR: "shipping-label-gen", 
    ROUTE_OPTIMIZER: "route-optimizer", DRIVER_APP_BFF: "driver-app-bff", DRONE_FLEET: "drone-fleet-mgr",
    FEDEX_MOCK: "fedex-mock", DHL_MOCK: "dhl-mock", UPS_MOCK: "ups-mock",

    // 7. Marketing & Comms
    NOTIFICATIONS: "notification-dispatcher", EMAIL_SENDER: "email-sender-svc", SMS_SENDER: "sms-sender-svc", PUSH_SENDER: "push-sender-svc",
    LOYALTY: "loyalty-program", REWARDS: "rewards-engine", CAMPAIGN_MGR: "campaign-manager",
    
    // 8. Ad Tech (New)
    AD_SERVER: "ad-server-core", BIDDING_ENGINE: "realtime-bidding", USER_SEGMENTATION: "user-segmentation",
    AD_INVENTORY: "ad-inventory-db", CLICK_TRACKER: "click-tracker",

    // 9. Support (New)
    CHAT_BOT: "ai-chat-bot", TICKET_SYSTEM: "support-ticket-svc", KNOWLEDGE_BASE: "knowledge-base-cms",
    AGENT_ROUTING: "agent-routing-engine", SENTIMENT_ANALYSIS: "sentiment-analysis",

    // 10. Data & ML (New)
    FEATURE_STORE: "ml-feature-store", DATA_LAKE_INGEST: "data-lake-ingest", 
    ETL_WORKER: "etl-batch-worker", METRICS_AGGREGATOR: "metrics-aggregator",
    
    // 11. Infrastructure / DBs / Queues
    DB_POSTGRES_PRIMARY: "postgres-primary", DB_POSTGRES_ANALYTICS: "postgres-analytics", 
    DB_MONGO_CATALOG: "mongo-catalog", DB_CASSANDRA_HISTORY: "cassandra-orders", 
    DB_CLICKHOUSE_LOGS: "clickhouse-logs", DB_NEO4J_SOCIAL: "neo4j-social-graph",
    DB_TIMESCALE_IOT: "timescale-iot",
    
    CACHE_REDIS_MAIN: "redis-cluster-main", CACHE_MEMCACHED: "memcached-shard-01", CACHE_VALKEY: "valkey-cache-eu",
    
    MSG_KAFKA: "kafka-broker", MSG_RABBIT: "rabbitmq-worker", MSG_SQS: "sqs-mock",
    ELASTICSEARCH: "elasticsearch-cluster", S3_STORAGE: "s3-blob-storage", AUDIT_LOGGER: "audit-log-worker",
    SECRETS_MGR: "secrets-manager", GEO_IP_SVC: "geo-ip-service"
};

// ==========================================
// SCENARIO EXECUTORS
// ==========================================

export function runBrowseJourney() {
    const generator = new TemplatedGenerator();
    const region = Math.random() > 0.5 ? SERVICES.CDN_EDGE_NA : SERVICES.CDN_EDGE_EU;
    const edgeSpan = generator.startSpan("GET /products", region, "server");
    const gatewaySpan = generator.childSpan(edgeSpan, "proxy-request", SERVICES.GRAPHQL_GATEWAY, "server");
    
    const authSpan = generator.childSpan(gatewaySpan, "ValidateSession", SERVICES.AUTH, "rpc");
    generator.childSpan(authSpan, "GET session", SERVICES.SESSION_STORE, "db", { "db.system": "valkey" });
    const bffSpan = generator.childSpan(gatewaySpan, "HydrateView", SERVICES.WEB_BFF, "rpc");
    
    const recSpan = generator.childSpan(bffSpan, "GetRecommendations", SERVICES.RECOMMENDATION, "rpc");
    generator.childSpan(recSpan, "fetch-features", SERVICES.FEATURE_STORE, "rpc");
    generator.childSpan(recSpan, "query-vector", SERVICES.ELASTICSEARCH, "db");

    const adSpan = generator.childSpan(bffSpan, "InjectAds", SERVICES.AD_SERVER, "rpc");
    generator.childSpan(adSpan, "check-segments", SERVICES.USER_SEGMENTATION, "rpc");
    
    const searchSpan = generator.childSpan(gatewaySpan, "SearchQuery", SERVICES.SEARCH_ENGINE, "rpc");
    generator.childSpan(searchSpan, "translate-query", SERVICES.TRANSLATION_SVC, "rpc");
    
    const catSpan = generator.childSpan(searchSpan, "FetchDetails", SERVICES.CATALOG_READ, "rpc");
    generator.childSpan(catSpan, "find-one", SERVICES.DB_MONGO_CATALOG, "db", { "db.system": "mongodb" });
    
    const mediaSpan = generator.childSpan(catSpan, "GetMedia", SERVICES.IMAGE_RESIZER, "rpc");
    generator.childSpan(mediaSpan, "transcode-preview", SERVICES.VIDEO_TRANSCODER, "rpc");
    generator.childSpan(mediaSpan, "s3-get", SERVICES.S3_STORAGE, "client");

    client.push(generator.getTrace());
}

export function runCheckoutJourney() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("POST /checkout", SERVICES.API_GATEWAY, "server");
    const checkoutSpan = generator.childSpan(root, "OrchestrateOrder", SERVICES.CHECKOUT, "rpc");
    
    generator.childSpan(checkoutSpan, "ResolveLocation", SERVICES.GEO_IP_SVC, "rpc");
    const taxSvc = Math.random() > 0.5 ? SERVICES.TAX_CALCULATOR_US : SERVICES.TAX_CALCULATOR_EU;
    generator.childSpan(checkoutSpan, "CalcTax", taxSvc, "rpc");

    const paySpan = generator.childSpan(checkoutSpan, "ProcessPayment", SERVICES.PAYMENT_GATEWAY, "rpc");
    generator.childSpan(paySpan, "FraudCheck", SERVICES.FRAUD_DETECTOR, "rpc");
    
    const pMethod = Math.random();
    if (pMethod < 0.2) {
        generator.childSpan(paySpan, "RedeemGiftCard", SERVICES.GIFT_CARD_SVC, "rpc");
    } else if (pMethod < 0.4) {
        generator.childSpan(paySpan, "AuthorizeBNPL", SERVICES.BNPL_PROVIDER, "client");
        generator.childSpan(paySpan, "CreditCheck", SERVICES.CREDIT_CHECK, "rpc");
    } else {
        generator.childSpan(paySpan, "ChargeCard", SERVICES.STRIPE_MOCK, "client");
    }
    
    generator.childSpan(paySpan, "ConvertFx", SERVICES.CURRENCY_CONVERTER, "rpc");

    const msgSpan = generator.childSpan(checkoutSpan, "publish-order", SERVICES.MSG_KAFKA, "producer");
    const procSpan = generator.childSpan(msgSpan, "process-order", SERVICES.ORDER_PROCESSOR, "consumer");
    generator.childSpan(procSpan, "Archive", SERVICES.DB_CASSANDRA_HISTORY, "db");
    
    const fulfillSpan = generator.childSpan(procSpan, "AssignFulfillment", SERVICES.FULFILLMENT, "rpc");
    generator.childSpan(fulfillSpan, "RouteOptimize", SERVICES.ROUTE_OPTIMIZER, "rpc");
    generator.childSpan(fulfillSpan, "NotifyDrone", SERVICES.DRONE_FLEET, "rpc");

    client.push(generator.getTrace());
}

export function runLoginJourney() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("POST /login", SERVICES.MOBILE_BFF, "server");
    const authSpan = generator.childSpan(root, "Authenticate", SERVICES.AUTH, "rpc");
    
    if (Math.random() > 0.7) {
        generator.childSpan(authSpan, "SocialOauth", SERVICES.SOCIAL_LOGIN, "rpc");
        generator.childSpan(authSpan, "ImportGraph", SERVICES.DB_NEO4J_SOCIAL, "db");
    }

    generator.childSpan(authSpan, "CheckPolicies", SERVICES.RBAC_POLICY, "rpc");
    
    const mfaSpan = generator.childSpan(authSpan, "ChallengeMFA", SERVICES.MFA_PROVIDER, "rpc");
    generator.childSpan(mfaSpan, "SendSMS", SERVICES.SMS_SENDER, "client");

    const sessionSpan = generator.childSpan(root, "StartSession", SERVICES.SESSION_STORE, "db", { "db.system": "valkey" });
    generator.childSpan(root, "Audit", SERVICES.AUDIT_LOGGER, "producer");
    client.push(generator.getTrace());
}

export function runInventorySync() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("iot-event", SERVICES.IOT_GATEWAY, "producer");
    generator.childSpan(root, "LogTelemetry", SERVICES.DB_TIMESCALE_IOT, "db");
    
    const ingestSpan = generator.childSpan(root, "consume-update", SERVICES.MSG_KAFKA, "consumer");
    
    const euSpan = generator.childSpan(ingestSpan, "UpdateEU", SERVICES.INVENTORY_SHARD_EU, "rpc");
    generator.childSpan(euSpan, "UPDATE db", SERVICES.DB_POSTGRES_PRIMARY, "db");
    
    const apacSpan = generator.childSpan(ingestSpan, "UpdateAPAC", SERVICES.INVENTORY_SHARD_APAC, "rpc");
    generator.childSpan(apacSpan, "UPDATE db", SERVICES.DB_POSTGRES_PRIMARY, "db");

    generator.childSpan(ingestSpan, "PurgeCache", SERVICES.CACHE_MEMCACHED, "db", { "db.system": "memcached" });
    generator.childSpan(ingestSpan, "PurgeCDN", SERVICES.CDN_EDGE_EU, "rpc");

    const etlSpan = generator.childSpan(ingestSpan, "TriggerETL", SERVICES.ETL_WORKER, "consumer");
    generator.childSpan(etlSpan, "WriteLake", SERVICES.DATA_LAKE_INGEST, "rpc");

    client.push(generator.getTrace());
}

export function runReturnJourney() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("POST /returns", SERVICES.WEB_BFF, "server");
    const historySpan = generator.childSpan(root, "CheckStatus", SERVICES.ORDER_HISTORY, "rpc");
    
    generator.childSpan(root, "AnalyzeReason", SERVICES.SENTIMENT_ANALYSIS, "rpc");

    const paySpan = generator.childSpan(root, "Refund", SERVICES.PAYMENT_GATEWAY, "rpc");
    generator.childSpan(paySpan, "Reversal", SERVICES.ADYEN_MOCK, "client");

    const logisticsSpan = generator.childSpan(root, "ReverseLogistics", SERVICES.FULFILLMENT, "rpc");
    generator.childSpan(logisticsSpan, "SchedulePickup", SERVICES.UPS_MOCK, "client");

    client.push(generator.getTrace());
}

export function runSupportJourney() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("websocket-msg", SERVICES.CHAT_BOT, "server");
    
    generator.childSpan(root, "InferIntent", SERVICES.SENTIMENT_ANALYSIS, "rpc");
    const kbSpan = generator.childSpan(root, "SearchKB", SERVICES.KNOWLEDGE_BASE, "rpc");
    generator.childSpan(kbSpan, "query-es", SERVICES.ELASTICSEARCH, "db");

    if (Math.random() > 0.5) {
        const agentSpan = generator.childSpan(root, "EscalateToHuman", SERVICES.AGENT_ROUTING, "rpc");
        generator.childSpan(agentSpan, "CreateTicket", SERVICES.TICKET_SYSTEM, "rpc");
        generator.childSpan(agentSpan, "NotifyAgent", SERVICES.PUSH_SENDER, "client");
    }
    client.push(generator.getTrace());
}

export function runAdBiddingJourney() {
    const generator = new TemplatedGenerator();
    const root = generator.startSpan("bid-request", SERVICES.AD_SERVER, "server");
    
    const segSpan = generator.childSpan(root, "GetSegments", SERVICES.USER_SEGMENTATION, "rpc");
    generator.childSpan(segSpan, "read-profile", SERVICES.DB_CLICKHOUSE_LOGS, "db"); 

    const bidSpan = generator.childSpan(root, "RequestBids", SERVICES.BIDDING_ENGINE, "rpc");
    generator.childSpan(bidSpan, "PartnerA", SERVICES.PARTNER_API, "client");
    generator.childSpan(bidSpan, "PartnerB", SERVICES.PARTNER_API, "client");
    generator.childSpan(bidSpan, "CheckBudget", SERVICES.AD_INVENTORY, "rpc");

    client.push(generator.getTrace());
}

// ==========================================
// TEMPLATED GENERATOR (Panic-Free & Flat Model)
// ==========================================

// The Golden Span Template
// Matches the expected fields for the Go unmarshaller in xk6-client-tracing
const SPAN_TEMPLATE = {
    name: "",
    kind: 0,
    trace_id: "",
    span_id: "",
    // parent_span_id is intentionally omitted here and only added if needed
    start_time_unix_nano: 0,
    end_time_unix_nano: 0,
    attributes: {}, // Simple map for JS -> Go conversion
    events: [],
    links: [],
    status: { code: 0, message: "" },
    trace_state: "",
    dropped_attributes_count: 0,
    dropped_events_count: 0,
    dropped_links_count: 0,
    service_name: "" // Some xk6 versions support this top-level field
};

class TemplatedGenerator {
    constructor() {
        this.traceId = randomString(32, '0123456789abcdef');
        this.spans = [];
    }

    startSpan(name, serviceName, kind, attributes = {}) {
        return this._createSpan(name, serviceName, kind, attributes, null);
    }

    childSpan(parentSpan, name, serviceName, kind, attributes = {}) {
        return this._createSpan(name, serviceName, kind, attributes, parentSpan.id);
    }

    _createSpan(name, serviceName, kind, attributes, parentId) {
        // 1. Clone the Safe Template
        const span = JSON.parse(JSON.stringify(SPAN_TEMPLATE));

        // 2. Populate Dynamic Values
        span.span_id = randomString(16, '0123456789abcdef');
        span.trace_id = this.traceId;
        span.name = name;
        span.kind = this._mapKind(kind);
        
        // Handle Parent ID strictly
        if (parentId) {
            span.parent_span_id = parentId;
        }

        // Timing
        const startTime = Date.now();
        const duration = randomIntBetween(10, 200);
        const actualStart = parentId ? startTime + randomIntBetween(2, 20) : startTime;
        span.start_time_unix_nano = actualStart * 1000000;
        span.end_time_unix_nano = (actualStart + duration) * 1000000;

        // 3. Attributes & Status
        const { attributes: finalAttributes, isError } = this._generateAttributes(name, attributes);
        span.attributes = finalAttributes;
        
        // Add service name to attributes as a fallback if top-level support is missing
        span.attributes["service.name"] = serviceName;
        
        // Also set top level for library mapping
        span.service_name = serviceName;

        span.status = { code: isError ? 2 : 1, message: "" };

        this.spans.push(span);
        return span; 
    }

    // UPDATED: Lightweight Attribute Generation (Simple Map)
    _generateAttributes(spanName, baseAttributes) {
        let method = "POST";
        const upperName = spanName.toUpperCase();
        if (upperName.startsWith("GET") || upperName.includes("FETCH") || upperName.includes("READ") || upperName.includes("QUERY")) method = "GET";
        
        const rand = Math.random();
        let status = 200;
        let isError = false;
        if (rand > 0.99) { status = 500; isError = true; }
        else if (rand > 0.95) { status = 400; isError = true; }

        // FIX: Return a simple JavaScript Object Map, not an Array
        const defaults = {
            "http.method": method,
            "http.status_code": status
        };

        const allAttributes = { ...defaults, ...baseAttributes };
        
        return { attributes: allAttributes, isError };
    }

    _mapKind(kindStr) {
        const map = { "internal": 1, "server": 2, "client": 3, "producer": 4, "consumer": 5, "rpc": 3 };
        return map[kindStr] || 1;
    }

    // THE CRITICAL METHOD FOR CLIENT.PUSH
    // Returns a flat list of spans. The xk6 library handles grouping.
    getTrace() {
        return this.spans;
    }
}