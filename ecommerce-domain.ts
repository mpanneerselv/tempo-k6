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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
    const generator = new OTLPGenerator();
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
// OTLP GENERATOR (Strict Typing, No Panic)
// ==========================================

class OTLPGenerator {
    constructor() {
        this.traceId = randomString(32, '0123456789abcdef');
        this.spans = [];
    }

    startSpan(name, serviceName, kind, attributes = {}) {
        return this._createSpan(name, serviceName, kind, attributes, null);
    }

    childSpan(parentSpan, name, serviceName, kind, attributes = {}) {
        return this._createSpan(name, serviceName, kind, attributes, parentSpan.spanId);
    }

    _createSpan(name, serviceName, kind, attributes, parentId) {
        const spanId = randomString(16, '0123456789abcdef');
        
        // OTLP Requires NanoStrings (string encoded 64-bit int)
        const now = Date.now();
        const duration = randomIntBetween(10, 200);
        
        // Hack: Append '000000' to simulate nanoseconds since Date.now() is ms
        const startTimeUnixNano = `${now}000000`;
        const endTimeUnixNano = `${now + duration}000000`;

        const { attributes: heavyAttributes, isError } = this._generateHeavyAttributes(serviceName, name, attributes);

        const span = {
            traceId: this.traceId,
            spanId: spanId,
            parentSpanId: parentId || undefined, // Strict undefined, not null/empty string
            name: name,
            kind: this._mapKind(kind),
            startTimeUnixNano: startTimeUnixNano,
            endTimeUnixNano: endTimeUnixNano,
            attributes: heavyAttributes, // Typed array [ {key, value} ]
            status: { code: isError ? 2 : 1 }, // 2=Error
            _service_name: serviceName // Internal grouping key
        };

        this.spans.push(span);
        return span; 
    }

    _generateHeavyAttributes(serviceName, spanName, baseAttributes) {
        let method = "POST";
        const upperName = spanName.toUpperCase();
        if (upperName.startsWith("GET") || upperName.includes("FETCH") || upperName.includes("READ") || upperName.includes("QUERY")) method = "GET";
        
        const rand = Math.random();
        let status = 200;
        let isError = false;
        if (rand > 0.99) { status = 500; isError = true; }
        else if (rand > 0.95) { status = 400; isError = true; }

        // STRICT TYPED ATTRIBUTES
        const defaults = [
            { key: "http.method", value: { stringValue: method } },
            { key: "http.status_code", value: { intValue: status } }
        ];

        const convertedBase = [];
        for (const [k, v] of Object.entries(baseAttributes)) {
             let val = v;
             // Ensure it is wrapped in { type: val }
             if (typeof v === 'string') val = { stringValue: v };
             else if (typeof v === 'number') val = { intValue: v };
             else if (typeof v === 'boolean') val = { boolValue: v };
             else if (typeof v === 'object' && !v.stringValue && !v.intValue) val = { stringValue: JSON.stringify(v) };
             
             convertedBase.push({ key: k, value: val });
        }

        const allAttributes = [...defaults, ...convertedBase];

        // HEAVY PAYLOAD GENERATION
        let context = "generic";
        if (serviceName.includes("postgres") || serviceName.includes("mongo")) context = "db";
        if (serviceName.includes("redis") || serviceName.includes("memcached")) context = "cache";
        if (serviceName.includes("kafka") || serviceName.includes("rabbit")) context = "messaging";
        
        const targetSize = randomIntBetween(1024, 5120);
        let usedSize = 0;

        const contextKeys = this._getContextKeys(context, serviceName);
        contextKeys.forEach(item => {
            const randStart = randomIntBetween(0, ENTROPY_POOL.length - item.size);
            const val = ENTROPY_POOL.slice(randStart, randStart + item.size);
            allAttributes.push({ key: item.key, value: { stringValue: val } });
            usedSize += item.size;
        });

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
        const keys = [];
        if (context === "db") {
            keys.push({ key: "db.statement", size: randomIntBetween(200, 800) });
            keys.push({ key: "db.plan_json", size: randomIntBetween(500, 1500) });
        } else if (context === "http") {
            keys.push({ key: "http.request.body_raw", size: randomIntBetween(500, 2000) });
        } else {
            keys.push({ key: "app.stack_trace", size: randomIntBetween(500, 1500) });
        }
        return keys;
    }

    _mapKind(kindStr) {
        // OTLP Enums: 1=INTERNAL, 2=SERVER, 3=CLIENT, 4=PRODUCER, 5=CONSUMER
        const map = { "internal": 1, "server": 2, "client": 3, "producer": 4, "consumer": 5, "rpc": 3 };
        return map[kindStr] || 1;
    }

    // THE CRITICAL METHOD: RETURNS RESOURCE SPANS
    getTrace() {
        const spansByService = {};

        // Group spans by service name
        this.spans.forEach(span => {
            const svc = span._service_name;
            if (!spansByService[svc]) {
                spansByService[svc] = [];
            }
            // Create a clean copy removing internal keys
            const { _service_name, ...cleanSpan } = span;
            spansByService[svc].push(cleanSpan);
        });

        // Convert grouped spans to OTLP ResourceSpans structure
        return Object.keys(spansByService).map(serviceName => {
            return {
                resource: {
                    attributes: [
                        { key: "service.name", value: { stringValue: serviceName } },
                        { key: "deployment.environment", value: { stringValue: "prod" } },
                        { key: "k8s.cluster.name", value: { stringValue: "eks-prod-ap-southeast-2" } },
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