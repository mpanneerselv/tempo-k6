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
    const generator = new TraceGenerator();
    const region = Math.random() > 0.5 ? SERVICES.CDN_EDGE_NA : SERVICES.CDN_EDGE_EU;
    const edgeSpan = generator.startSpan("GET /products", region, "server");
    const gatewaySpan = generator.childSpan(edgeSpan, "proxy-request", SERVICES.GRAPHQL_GATEWAY, "server");
    
    // Auth & Personalization
    const authSpan = generator.childSpan(gatewaySpan, "ValidateSession", SERVICES.AUTH, "rpc");
    generator.childSpan(authSpan, "GET session", SERVICES.SESSION_STORE, "db", { "db.system": "valkey" });
    const bffSpan = generator.childSpan(gatewaySpan, "HydrateView", SERVICES.WEB_BFF, "rpc");
    
    // Fan Out: Ads & Recs
    const recSpan = generator.childSpan(bffSpan, "GetRecommendations", SERVICES.RECOMMENDATION, "rpc");
    generator.childSpan(recSpan, "fetch-features", SERVICES.FEATURE_STORE, "rpc"); // ML Feature Store
    generator.childSpan(recSpan, "query-vector", SERVICES.ELASTICSEARCH, "db");

    // Fan Out: Ads (Cross Link)
    const adSpan = generator.childSpan(bffSpan, "InjectAds", SERVICES.AD_SERVER, "rpc");
    generator.childSpan(adSpan, "check-segments", SERVICES.USER_SEGMENTATION, "rpc");
    
    // Core Catalog
    const searchSpan = generator.childSpan(gatewaySpan, "SearchQuery", SERVICES.SEARCH_ENGINE, "rpc");
    generator.childSpan(searchSpan, "translate-query", SERVICES.TRANSLATION_SVC, "rpc"); // Localization
    
    const catSpan = generator.childSpan(searchSpan, "FetchDetails", SERVICES.CATALOG_READ, "rpc");
    generator.childSpan(catSpan, "find-one", SERVICES.DB_MONGO_CATALOG, "db", { "db.system": "mongodb" });
    
    // Media
    const mediaSpan = generator.childSpan(catSpan, "GetMedia", SERVICES.IMAGE_RESIZER, "rpc");
    generator.childSpan(mediaSpan, "transcode-preview", SERVICES.VIDEO_TRANSCODER, "rpc");
    generator.childSpan(mediaSpan, "s3-get", SERVICES.S3_STORAGE, "client");

    client.push(generator.getTrace());
}

export function runCheckoutJourney() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("POST /checkout", SERVICES.API_GATEWAY, "server");
    const checkoutSpan = generator.childSpan(root, "OrchestrateOrder", SERVICES.CHECKOUT, "rpc");
    
    // Geo IP & Tax
    generator.childSpan(checkoutSpan, "ResolveLocation", SERVICES.GEO_IP_SVC, "rpc");
    const taxSvc = Math.random() > 0.5 ? SERVICES.TAX_CALCULATOR_US : SERVICES.TAX_CALCULATOR_EU;
    generator.childSpan(checkoutSpan, "CalcTax", taxSvc, "rpc");

    // Payment Logic
    const paySpan = generator.childSpan(checkoutSpan, "ProcessPayment", SERVICES.PAYMENT_GATEWAY, "rpc");
    generator.childSpan(paySpan, "FraudCheck", SERVICES.FRAUD_DETECTOR, "rpc");
    
    // Complex Payment Methods
    const pMethod = Math.random();
    if (pMethod < 0.2) {
        generator.childSpan(paySpan, "RedeemGiftCard", SERVICES.GIFT_CARD_SVC, "rpc");
    } else if (pMethod < 0.4) {
        generator.childSpan(paySpan, "AuthorizeBNPL", SERVICES.BNPL_PROVIDER, "client");
        generator.childSpan(paySpan, "CreditCheck", SERVICES.CREDIT_CHECK, "rpc");
    } else {
        generator.childSpan(paySpan, "ChargeCard", SERVICES.STRIPE_MOCK, "client");
    }
    
    // Currency Conversion
    generator.childSpan(paySpan, "ConvertFx", SERVICES.CURRENCY_CONVERTER, "rpc");

    // Async Finalization
    const msgSpan = generator.childSpan(checkoutSpan, "publish-order", SERVICES.MSG_KAFKA, "producer");
    const procSpan = generator.childSpan(msgSpan, "process-order", SERVICES.ORDER_PROCESSOR, "consumer");
    generator.childSpan(procSpan, "Archive", SERVICES.DB_CASSANDRA_HISTORY, "db");
    
    // Logistics
    const fulfillSpan = generator.childSpan(procSpan, "AssignFulfillment", SERVICES.FULFILLMENT, "rpc");
    generator.childSpan(fulfillSpan, "RouteOptimize", SERVICES.ROUTE_OPTIMIZER, "rpc");
    generator.childSpan(fulfillSpan, "NotifyDrone", SERVICES.DRONE_FLEET, "rpc");

    client.push(generator.getTrace());
}

export function runLoginJourney() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("POST /login", SERVICES.MOBILE_BFF, "server");
    const authSpan = generator.childSpan(root, "Authenticate", SERVICES.AUTH, "rpc");
    
    // Social Login
    if (Math.random() > 0.7) {
        generator.childSpan(authSpan, "SocialOauth", SERVICES.SOCIAL_LOGIN, "rpc");
        generator.childSpan(authSpan, "ImportGraph", SERVICES.DB_NEO4J_SOCIAL, "db");
    }

    generator.childSpan(authSpan, "CheckPolicies", SERVICES.RBAC_POLICY, "rpc");
    
    // MFA
    const mfaSpan = generator.childSpan(authSpan, "ChallengeMFA", SERVICES.MFA_PROVIDER, "rpc");
    generator.childSpan(mfaSpan, "SendSMS", SERVICES.SMS_SENDER, "client");

    const sessionSpan = generator.childSpan(root, "StartSession", SERVICES.SESSION_STORE, "db", { "db.system": "valkey" });
    generator.childSpan(root, "Audit", SERVICES.AUDIT_LOGGER, "producer");
    client.push(generator.getTrace());
}

export function runInventorySync() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("iot-event", SERVICES.IOT_GATEWAY, "producer");
    generator.childSpan(root, "LogTelemetry", SERVICES.DB_TIMESCALE_IOT, "db");
    
    const ingestSpan = generator.childSpan(root, "consume-update", SERVICES.MSG_KAFKA, "consumer");
    
    // Update Global Inventory
    const euSpan = generator.childSpan(ingestSpan, "UpdateEU", SERVICES.INVENTORY_SHARD_EU, "rpc");
    generator.childSpan(euSpan, "UPDATE db", SERVICES.DB_POSTGRES_PRIMARY, "db");
    
    const apacSpan = generator.childSpan(ingestSpan, "UpdateAPAC", SERVICES.INVENTORY_SHARD_APAC, "rpc");
    generator.childSpan(apacSpan, "UPDATE db", SERVICES.DB_POSTGRES_PRIMARY, "db");

    // Invalidate Caches
    generator.childSpan(ingestSpan, "PurgeCache", SERVICES.CACHE_MEMCACHED, "db", { "db.system": "memcached" });
    generator.childSpan(ingestSpan, "PurgeCDN", SERVICES.CDN_EDGE_EU, "rpc");

    // Data Engineering (ETL)
    const etlSpan = generator.childSpan(ingestSpan, "TriggerETL", SERVICES.ETL_WORKER, "consumer");
    generator.childSpan(etlSpan, "WriteLake", SERVICES.DATA_LAKE_INGEST, "rpc");

    client.push(generator.getTrace());
}

export function runReturnJourney() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("POST /returns", SERVICES.WEB_BFF, "server");
    const historySpan = generator.childSpan(root, "CheckStatus", SERVICES.ORDER_HISTORY, "rpc");
    
    // Sentiment Analysis on Reason
    generator.childSpan(root, "AnalyzeReason", SERVICES.SENTIMENT_ANALYSIS, "rpc");

    const paySpan = generator.childSpan(root, "Refund", SERVICES.PAYMENT_GATEWAY, "rpc");
    generator.childSpan(paySpan, "Reversal", SERVICES.ADYEN_MOCK, "client");

    const logisticsSpan = generator.childSpan(root, "ReverseLogistics", SERVICES.FULFILLMENT, "rpc");
    generator.childSpan(logisticsSpan, "SchedulePickup", SERVICES.UPS_MOCK, "client");

    client.push(generator.getTrace());
}

export function runSupportJourney() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("websocket-msg", SERVICES.CHAT_BOT, "server");
    
    // AI Processing
    generator.childSpan(root, "InferIntent", SERVICES.SENTIMENT_ANALYSIS, "rpc");
    const kbSpan = generator.childSpan(root, "SearchKB", SERVICES.KNOWLEDGE_BASE, "rpc");
    generator.childSpan(kbSpan, "query-es", SERVICES.ELASTICSEARCH, "db");

    // Escalation
    if (Math.random() > 0.5) {
        const agentSpan = generator.childSpan(root, "EscalateToHuman", SERVICES.AGENT_ROUTING, "rpc");
        generator.childSpan(agentSpan, "CreateTicket", SERVICES.TICKET_SYSTEM, "rpc");
        generator.childSpan(agentSpan, "NotifyAgent", SERVICES.PUSH_SENDER, "client");
    }
    client.push(generator.getTrace());
}

export function runAdBiddingJourney() {
    const generator = new TraceGenerator();
    const root = generator.startSpan("bid-request", SERVICES.AD_SERVER, "server");
    
    // High fan-out
    const segSpan = generator.childSpan(root, "GetSegments", SERVICES.USER_SEGMENTATION, "rpc");
    generator.childSpan(segSpan, "read-profile", SERVICES.DB_CLICKHOUSE_LOGS, "db"); // Fast analytics DB

    const bidSpan = generator.childSpan(root, "RequestBids", SERVICES.BIDDING_ENGINE, "rpc");
    // Simulate parallel calls
    generator.childSpan(bidSpan, "PartnerA", SERVICES.PARTNER_API, "client");
    generator.childSpan(bidSpan, "PartnerB", SERVICES.PARTNER_API, "client");
    generator.childSpan(bidSpan, "CheckBudget", SERVICES.AD_INVENTORY, "rpc");

    client.push(generator.getTrace());
}

// ==========================================
// TRACE BUILDER (Optimized for Throughput)
// ==========================================
class TraceGenerator {
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
        const spanId = randomString(16, '0123456789abcdef');
        const startTime = Date.now();
        const duration = randomIntBetween(10, 200);
        const actualStart = parentId ? startTime + randomIntBetween(2, 20) : startTime;

        const { attributes: heavyAttributes, isError } = this._generateHeavyAttributes(serviceName, name, attributes);

        // FIX: The library expects specific structure. 
        // We will construct the internal span object here, but getTrace will group them.
        const span = {
            name: name,
            id: spanId,
            trace_id: this.traceId,
            start_time_unix_nano: actualStart * 1000000,
            end_time_unix_nano: (actualStart + duration) * 1000000,
            attributes: heavyAttributes, // Typed OTLP array
            kind: this._mapKind(kind),
            status: { code: isError ? 2 : 1 },
            // SAFEGUARDS FOR GO PANICS:
            events: [],
            links: [],
            trace_state: "",
            dropped_attributes_count: 0,
            dropped_events_count: 0,
            dropped_links_count: 0,
            service: serviceName // Used for grouping, removed before sending if strictly needed
        };

        // Handle Parent ID safely. Root spans should not have 'parent_span_id' set to null.
        if (parentId) {
            span.parent_span_id = parentId;
        } else {
            // Explicitly undefined for root spans to avoid type confusion
            span.parent_span_id = undefined;
        }

        this.spans.push(span);
        return span;
    }

    // UPDATED: Generates domain-specific large attributes
    _generateHeavyAttributes(serviceName, spanName, baseAttributes) {
        let method = "POST";
        const upperName = spanName.toUpperCase();
        if (upperName.startsWith("GET") || upperName.includes("FETCH") || upperName.includes("READ") || upperName.includes("QUERY")) method = "GET";
        
        const rand = Math.random();
        let status = 200;
        let isError = false;
        if (rand > 0.99) { status = 500; isError = true; }
        else if (rand > 0.95) { status = 400; isError = true; }

        // FIX: STRICT TYPING for OTLP Attributes (Key, Value{Type})
        const defaults = [
            { key: "http.method", value: { stringValue: method } },
            { key: "http.status_code", value: { intValue: status } }
        ];

        // Helper to convert input simple object to typed array if mixed
        const convertedBase = [];
        for (const [k, v] of Object.entries(baseAttributes)) {
             // If user passed typed object, keep it. Else wrap it.
             let val = v;
             if (typeof v !== 'object' || (!v.stringValue && !v.intValue && !v.boolValue)) {
                 if (typeof v === 'string') val = { stringValue: v };
                 if (typeof v === 'number') val = { intValue: v };
                 if (typeof v === 'boolean') val = { boolValue: v };
             }
             convertedBase.push({ key: k, value: val });
        }

        const allAttributes = [...defaults, ...convertedBase];

        // Determine context
        let context = "generic";
        if (serviceName.includes("postgres") || serviceName.includes("mongo") || serviceName.includes("cassandra") || serviceName.includes("clickhouse")) context = "db";
        if (serviceName.includes("redis") || serviceName.includes("memcached") || serviceName.includes("valkey")) context = "cache";
        if (serviceName.includes("kafka") || serviceName.includes("rabbit") || serviceName.includes("sqs")) context = "messaging";
        if (serviceName.includes("gateway") || serviceName.includes("bff") || serviceName.includes("waf")) context = "http";
        if (serviceName.includes("payment") || serviceName.includes("checkout") || serviceName.includes("fraud")) context = "transaction";

        // Generate Heavy Payload
        const targetSize = randomIntBetween(1024, 5120);
        let usedSize = 0;

        const contextKeys = this._getContextKeys(context, serviceName);
        contextKeys.forEach(item => {
            const randStart = randomIntBetween(0, ENTROPY_POOL.length - item.size);
            const val = ENTROPY_POOL.slice(randStart, randStart + item.size);
            allAttributes.push({ key: item.key, value: { stringValue: val } });
            usedSize += item.size;
        });

        // Fill remainder
        const remainingSize = Math.max(0, targetSize - usedSize);
        if (remainingSize > 0) {
            const chunkKey = `app.state.dump_chunk_0`;
            const randStart = randomIntBetween(0, ENTROPY_POOL.length - remainingSize);
            const val = ENTROPY_POOL.slice(randStart, randStart + remainingSize);
            allAttributes.push({ key: chunkKey, value: { stringValue: val } });
        }
        
        return { attributes: allAttributes, isError };
    }

    _getContextKeys(context, serviceName) {
        // Return definitions for heavy keys
        const keys = [];
        if (context === "db") {
            keys.push({ key: "db.statement", size: randomIntBetween(200, 800) });
            keys.push({ key: "db.plan_json", size: randomIntBetween(500, 1500) });
        } else if (context === "http") {
            keys.push({ key: "http.request.body_raw", size: randomIntBetween(500, 2000) });
            keys.push({ key: "http.response.headers_dump", size: randomIntBetween(200, 500) });
        } else if (context === "messaging") {
            keys.push({ key: "messaging.message_payload", size: randomIntBetween(500, 2500) });
            keys.push({ key: "messaging.headers_json", size: 200 });
        } else if (context === "transaction") {
            keys.push({ key: "transaction.fraud_signals", size: randomIntBetween(1000, 2000) });
            keys.push({ key: "transaction.cart_snapshot", size: randomIntBetween(500, 1000) });
        } else {
            keys.push({ key: "app.stack_trace", size: randomIntBetween(500, 1500) });
        }
        return keys;
    }

    _mapKind(kindStr) {
        const map = { "internal": 1, "server": 2, "client": 3, "producer": 4, "consumer": 5, "rpc": 3 };
        return map[kindStr] || 1;
    }

    // THE CRITICAL METHOD FOR CLIENT.PUSH
    // Groups spans into OTLP ResourceSpans structure to avoid Go panics
    getTrace() {
        const spansByService = {};

        this.spans.forEach(span => {
            if (!spansByService[span.service]) {
                spansByService[span.service] = [];
            }
            // Create a clean copy of the span for export, removing the internal 'service' key
            const { service, ...cleanSpan } = span;
            spansByService[span.service].push(cleanSpan);
        });

        // Convert grouped spans to OTLP ResourceSpans
        return Object.keys(spansByService).map(serviceName => {
            return {
                resource: {
                    attributes: [
                        { key: "service.name", value: { stringValue: serviceName } },
                        { key: "deployment.environment", value: { stringValue: "prod" } },
                        { key: "k8s.cluster.name", value: { stringValue: "eks-prod-ap-southeast-2" } },
                        // Simulate random nodes for diversity
                        { key: "host.name", value: { stringValue: `ip-10-0-${randomIntBetween(1,255)}-${randomIntBetween(1,255)}` } }
                    ]
                },
                scopeSpans: [{
                    scope: { name: "k6-load-generator", version: "1.0" },
                    spans: spansByService[serviceName]
                }]
            };
        });
    }
}