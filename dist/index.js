"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ErrorResponse: () => ErrorResponse,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/Core.ts
var import_debug = __toESM(require("debug"));

// src/services/HTTPService.ts
var import_node_http = __toESM(require("http"));

// src/HTTPHandle.ts
var import_express2 = __toESM(require("express"));

// src/Route.ts
var import_express = require("express");
var Route = class {
  constructor(core, routerOptions) {
    this.core = core;
    this.mapper = (0, import_express.Router)(routerOptions);
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

// src/HTTPHandle.ts
var import_cors = __toESM(require("cors"));
var import_helmet = __toESM(require("helmet"));
var ErrorResponse = class _ErrorResponse extends Error {
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
var HTTPHandle = class {
  /**
   * @constructor
   * @param {Core} core
   */
  constructor(core) {
    this.rateLimit = null;
    this.core = core;
    this.app = (0, import_express2.default)();
    this.corsOptions = {
      origin: [/http(s)?:\/\/localhost:\d{3,5}/],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false
    };
    this.app.options("*", (0, import_cors.default)(this.corsOptions));
    this.app.use((0, import_cors.default)(this.corsOptions));
    this.app.use((0, import_helmet.default)());
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
        error: error instanceof ErrorResponse ? error : ErrorResponse.transformToResponseError(error).exportToResponse(),
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
    cb(route, this.core.DBService.db);
    this.app.use(basePath, route.mapper);
    return route;
  }
};

// src/services/HTTPService.ts
var HTTPService = class {
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
    this.server = import_node_http.default.createServer(this.handle.app);
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

// src/services/KMSService.ts
var import_secret_manager = require("@google-cloud/secret-manager");
var KMSService = class {
  constructor(core) {
    this.core = core;
    this.client = new import_secret_manager.SecretManagerServiceClient(
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

// src/services/DBService.ts
var import_rate_limiter_flexible = require("rate-limiter-flexible");
var import_mongodb = require("mongodb");
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
var DBService = class {
  constructor(core) {
    this.core = core;
    this.certificate = null;
    this.client = null;
    this.db = null;
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
    }
    mongoOptions.serverApi = import_mongodb.ServerApiVersion.v1;
    this.client = new import_mongodb.MongoClient(
      this.core.options.mongoURI,
      mongoOptions
    );
    this.client.on("connectionReady", () => {
      this.core.debug("Connected to MongoDB");
    });
    this.client.on("connectionClosed", () => {
      this.core.debug("Disconnected from MongoDB");
    });
    this.client.on("connectionCreated", () => {
      this.core.debug("Connection to MongoDB created");
    });
    await this.client.connect();
    this.db = this.client.db(this.core.options.mongoDatabaseName);
    this.core.HTTPService.handle.app.locals.database = this.db;
    this.core.HTTPService.handle.rateLimit = new import_rate_limiter_flexible.RateLimiterMongo({
      storeClient: this.core.DBService.db,
      points: 10,
      duration: 1
    });
    this.core.HTTPService.handle.app.use("/", async (req, res, next) => {
      var _a2;
      this.core.debug("Middleware: (*) Rate limit middleware");
      try {
        await ((_a2 = this.core.HTTPService.handle.rateLimit) == null ? void 0 : _a2.consume(req.ip || req.socket.remoteAddress || "unknwon", 1));
        next();
      } catch (error) {
        return this.core.HTTPService.handle.createResponse(req, res, null, new ErrorResponse("Too many requests", 429));
      }
    });
    return this.client;
  }
};

// src/Core.ts
var debug = (0, import_debug.default)("codebase");
var Core = class _Core {
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

// src/index.ts
var src_default = Core;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ErrorResponse
});
