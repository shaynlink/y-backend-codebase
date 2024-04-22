import { Debugger } from 'debug';
import { ClientOptions, SecretManagerServiceClient } from '@google-cloud/secret-manager';
import http from 'node:http';
import { Router, RequestHandler, RouterOptions, Application, Request, Response } from 'express';
import { Db, MongoClient } from 'mongodb';
import { CorsOptions } from 'cors';
import { RateLimiterMongo } from 'rate-limiter-flexible';

interface CoreOptions {
  usePriorityEnvVars?: boolean
  port?: string
  secretManagerServicClientOptions?: ClientOptions
  mongoURI: string;
  mongoClientOptions?: MongoClientOptions;
  mongoDatabaseName: string;
}

declare class Route {
    readonly core: Core;
    readonly mapper: Router;
    readonly middlewares: Map<Symbol, RequestHandler>;
    constructor(core: Core, routerOptions?: RouterOptions);
    setGlobalMiddleware(descriptor: string, middleware: RequestHandler): void;
    createMiddleware(descriptor: string, middleware: RequestHandler): RequestHandler;
}

/**
 * Create custom error for response
 */
declare class ErrorResponse extends Error {
    status: number;
    /**
     * @param {string} message
     */
    constructor(message: string, status?: number);
    /**
     * @returns Return response version
     */
    exportToResponse(): {
        message: string;
        name: string;
    };
    static transformToResponseError(error: Error): ErrorResponse;
}
type NullableError<Extra extends Error> = null | Extra | Error;
/**
 * @class HTTPHandle
 */
declare class HTTPHandle {
    readonly core: Core;
    readonly app: Application & {
        locals: {
            database: Db;
        };
    };
    readonly corsOptions: CorsOptions;
    rateLimit: RateLimiterMongo | null;
    /**
     * @constructor
     * @param {Core} core
     */
    constructor(core: Core);
    /**
     * @param result
     */
    createResponse<R extends Record<string, any> | null = null>(req: Request, res: Response, result: R, error: NullableError<ErrorResponse>, transform?: (req: Request, res: Response, result: R, error: NullableError<ErrorResponse>) => void): void;
    initiateHealthCheckRoute(version: string): this;
    createRoute(basePath: string, cb: (route: Route, database: Db | null) => void, routerOptions?: RouterOptions): Route;
}

declare class HTTPService {
    core: Core;
    server: http.Server | null;
    handle: HTTPHandle;
    /**
     * @constructor
     */
    constructor(core: Core);
    /**
     * @method createServer
     */
    createServer(): http.Server;
    getServer(): http.Server;
}

declare class KMSService {
    readonly core: Core;
    readonly client: SecretManagerServiceClient;
    private readonly secrets;
    constructor(core: Core);
    fetchSecret(secretName: string, keyName: string): Promise<void>;
    getSecret(keyName: string): Uint8Array | string;
}

declare class DBService {
    readonly core: Core;
    private certificate;
    client: MongoClient | null;
    db: Db | null;
    constructor(core: Core);
    getSecretFromKMS(keyName: string): void;
    createClient(): Promise<MongoClient>;
}

/**
 * @class Core
 */
declare class Core {
    readonly debug: Debugger;
    readonly options: CoreOptions;
    HTTPService: HTTPService;
    DBService: DBService;
    KMService: KMSService;
    /**
     * @constructor
     */
    constructor(options: CoreOptions);
    static instanciateFromEnv(): Core;
}

export { ErrorResponse, Core as default };