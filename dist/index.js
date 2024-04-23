"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/Core.ts
var _debug = require('debug'); var _debug2 = _interopRequireDefault(_debug);

// src/services/HTTPService.ts
var _http = require('http'); var _http2 = _interopRequireDefault(_http);

// src/HTTPHandle.ts
var _express = require('express'); var _express2 = _interopRequireDefault(_express);

// src/Route.ts

var _Route = class _Route {
  constructor(core, routerOptions) {
    this.core = core;
    this.mapper = _express.Router.call(void 0, routerOptions);
    this.middlewares = /* @__PURE__ */ new Map();
  }
  setGlobalMiddleware(descriptor, middleware) {
    this.mapper.use(this.createMiddleware(descriptor, middleware));
  }
  createMiddleware(descriptor, middleware) {
    return (req, res, next) => {
      this.core.debug(`Middleware: [${descriptor}] called`);
      middleware(req, res, next);
    };
  }
};
__name(_Route, "Route");
var Route = _Route;

// src/HTTPHandle.ts
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var _helmet = require('helmet'); var _helmet2 = _interopRequireDefault(_helmet);
var _ErrorResponse = class _ErrorResponse extends Error {
  /**
   * @param {string} message
   */
  constructor(message, status = 400) {
    super(message);
    this.status = 400;
    this.name = "ErrorResponse";
    this.status = status;
  }
  /**
   * @returns Return response version
   */
  exportToResponse() {
    return {
      message: this.message,
      name: this.name
    };
  }
  static transformToResponseError(error) {
    return new _ErrorResponse(error.message);
  }
};
__name(_ErrorResponse, "ErrorResponse");
var ErrorResponse = _ErrorResponse;
var _HTTPHandle = class _HTTPHandle {
  /**
   * @constructor
   * @param {Core} core
   */
  constructor(core) {
    this.rateLimit = null;
    this.core = core;
    this.app = _express2.default.call(void 0, );
    this.corsOptions = {
      origin: [/http(s)?:\/\/localhost:\d{3,5}/],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false
    };
    this.app.options("*", _cors2.default.call(void 0, this.corsOptions));
    this.app.use(_cors2.default.call(void 0, this.corsOptions));
    this.app.use(_helmet2.default.call(void 0, ));
    this.app.disable("x-powered-by");
  }
  /**
   * @param result
   */
  createResponse(req, res, result, error, transform) {
    var _a;
    if (error !== null) {
      res.setHeader("Content-Type", "application/json");
      res.status((_a = error == null ? void 0 : error.status) != null ? _a : 400);
      transform == null ? void 0 : transform(req, res, result, error);
      res.json({
        error: error instanceof ErrorResponse ? error.exportToResponse() : ErrorResponse.transformToResponseError(error).exportToResponse(),
        result: null
      });
    } else {
      res.setHeader("Content-Type", "application/json");
      res.status(200);
      transform == null ? void 0 : transform(req, res, result, null);
      res.json({
        error: null,
        result
      });
    }
  }
  initiateHealthCheckRoute(version) {
    this.app.get("/health", (req, res) => {
      return this.createResponse(req, res, {
        status: "ok",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        version,
        lifespan: process.uptime()
      }, null);
    });
    return this;
  }
  createRoute(basePath, cb, routerOptions) {
    const route = new Route(this.core, routerOptions);
    cb(route, this.core.DBService.client);
    this.app.use(basePath, route.mapper);
    return route;
  }
};
__name(_HTTPHandle, "HTTPHandle");
var HTTPHandle = _HTTPHandle;

// src/services/HTTPService.ts
var _HTTPService = class _HTTPService {
  /**
   * @constructor
   */
  constructor(core) {
    this.core = core;
    this.server = null;
    this.handle = new HTTPHandle(this.core);
  }
  /**
   * @method createServer
   */
  createServer() {
    this.server = _http2.default.createServer(this.handle.app);
    this.server.listen(
      this.core.options.port,
      () => {
        this.core.debug("Server is running on port %s", this.core.options.port);
      }
    );
    return this.server;
  }
  getServer() {
    if (this.server === null) {
      throw new Error("Server is not initiated");
    }
    return this.server;
  }
};
__name(_HTTPService, "HTTPService");
var HTTPService = _HTTPService;

// src/services/KMSService.ts
var _secretmanager = require('@google-cloud/secret-manager');
var _KMSService = class _KMSService {
  constructor(core) {
    this.core = core;
    this.client = new (0, _secretmanager.SecretManagerServiceClient)(
      this.core.options.secretManagerServicClientOptions
    );
    this.secrets = /* @__PURE__ */ new Map();
  }
  async fetchSecret(secretName, keyName) {
    var _a;
    const [secret] = await this.client.accessSecretVersion({
      name: secretName
    });
    if (!secret.payload || !((_a = secret.payload) == null ? void 0 : _a.data)) {
      throw new Error("Secret does not have a payload");
    }
    this.secrets.set(keyName, secret.payload.data);
  }
  getSecret(keyName) {
    if (!this.secrets.has(keyName)) {
      throw new Error("Secret not found");
    }
    return this.secrets.get(keyName);
  }
};
__name(_KMSService, "KMSService");
var KMSService = _KMSService;

// src/services/DBService.ts
var _ratelimiterflexible = require('rate-limiter-flexible');
var _mongoose = require('mongoose'); var _mongoose2 = _interopRequireDefault(_mongoose);
function splitPEM(pemContent) {
  const pemSectionRegex = /-----BEGIN [^-]+-----[^-]*-----END [^-]+-----/g;
  const pemSections = pemContent.match(pemSectionRegex);
  if (pemSections) {
    const result = {
      certificate: pemSections.find((section) => section.includes("CERTIFICATE")),
      privateKey: pemSections.find((section) => section.includes("PRIVATE KEY"))
    };
    return result;
  } else {
    return null;
  }
}
__name(splitPEM, "splitPEM");
var _DBService = class _DBService {
  constructor(core) {
    this.core = core;
    this.certificate = null;
    this.client = null;
  }
  getSecretFromKMS(keyName) {
    this.certificate = this.core.KMService.getSecret(keyName);
  }
  async createClient() {
    var _a;
    const mongoOptions = (_a = this.core.options.mongoClientOptions) != null ? _a : {};
    if (this.certificate) {
      const splitedPem = splitPEM(this.certificate.toString());
      if (!splitedPem) {
        throw new Error("Invalid certificate");
      }
      const { certificate, privateKey } = splitedPem;
      mongoOptions.cert = certificate;
      mongoOptions.key = privateKey;
      mongoOptions.dbName = this.core.options.mongoDatabaseName;
    }
    this.client = await _mongoose2.default.connect(
      this.core.options.mongoURI,
      mongoOptions
    );
    this.client.connection.on("connected", () => {
      this.core.debug("Connected to MongoDB");
    });
    this.client.connection.on("disconnected", () => {
      this.core.debug("Disconnected from MongoDB");
    });
    this.core.HTTPService.handle.app.locals.database = this.client;
    this.core.HTTPService.handle.rateLimit = new (0, _ratelimiterflexible.RateLimiterMongo)({
      storeClient: this.client.connection,
      points: 10,
      duration: 3
    });
    this.core.HTTPService.handle.app.use(async (req, res, next) => {
      var _a2;
      this.core.debug("Middleware: (*) Rate limit middleware : s%", req.ip || req.socket.remoteAddress || "unknwon");
      try {
        const rateLimitResponse = await ((_a2 = this.core.HTTPService.handle.rateLimit) == null ? void 0 : _a2.consume(req.ip || req.socket.remoteAddress || "unknwon", 2));
        if (rateLimitResponse) {
          res.setHeader("X-RateLimit-Limit", 10);
          res.setHeader("X-RateLimit-Remaining", rateLimitResponse.remainingPoints);
          res.setHeader("X-RateLimit-Reset", new Date(Date.now() + rateLimitResponse.msBeforeNext).getTime() / 1e3);
        }
        next();
      } catch (e) {
        this.core.HTTPService.handle.createResponse(req, res, null, new ErrorResponse("Too many requests", 429));
      }
    });
    return this.client;
  }
};
__name(_DBService, "DBService");
var DBService = _DBService;

// src/Core.ts
var debug = _debug2.default.call(void 0, "codebase");
var _Core = class _Core {
  /**
   * @constructor
   */
  constructor(options) {
    this.debug = debug;
    if (options.usePriorityEnvVars === true) {
      this.debug("Using priority environment variables");
      if ("PORT" in process.env) {
        this.debug("PORT in variable found %s", process.env.PORT);
        options.port = process.env.PORT;
      }
      if ("PROJECT_ID" in process.env) {
        this.debug("PROJECT_ID in variable found %s", process.env.PROJECT_ID);
        if (!options.secretManagerServicClientOptions) {
          options.secretManagerServicClientOptions = {};
        }
        options.secretManagerServicClientOptions.projectId = process.env.PROJECT_ID;
      }
    }
    this.options = options;
    this.HTTPService = new HTTPService(this);
    this.DBService = new DBService(this);
    this.KMService = new KMSService(this);
  }
  static instanciateFromEnv() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error("Missing MONGO_URI in env");
    }
    const MONGO_DATABASE_NAME = process.env.MONGO_DATABASE_NAME;
    if (!MONGO_DATABASE_NAME) {
      throw new Error("Missing MONGO_DATABASE_NAME in env");
    }
    return new _Core({
      usePriorityEnvVars: true,
      mongoURI: MONGO_URI,
      mongoDatabaseName: MONGO_DATABASE_NAME
    });
  }
};
__name(_Core, "Core");
var Core = _Core;

// src/index.ts
var src_default = Core;



exports.ErrorResponse = ErrorResponse; exports.default = src_default;
