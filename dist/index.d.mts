import { Debugger } from 'debug';
import { ClientOptions } from 'google-gax';
import { MongoOptions } from 'mongodb';
import mongoose, { MongooseOptions } from 'mongoose';
import http from 'node:http';
import { Router, RequestHandler, RouterOptions, Application, Request, Response } from 'express';
import { CorsOptions } from 'cors';
import { RateLimiterMongo } from 'rate-limiter-flexible';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

interface CoreOptions {
  usePriorityEnvVars?: boolean
  port?: string
  secretManagerServicClientOptions?: ClientOptions
  mongoURI: string;
  mongoClientOptions?: MongooseOptions & MongoOptions;
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

interface ErrorResponseComplance {
    message: string;
    name: string;
    extra?: Record<string, any>;
}
/**
 * Create custom error for response
 */
declare class ErrorResponse extends Error {
    status: number;
    extra?: Record<string, any>;
    /**
     * @param {string} message
     */
    constructor(message: string, status?: number, extra?: Record<string, any>);
    /**
     * @returns Return response version
     */
    exportToResponse(): ErrorResponseComplance;
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
            database: typeof mongoose;
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
    initiateNotFoundRoute(): this;
    createRoute(basePath: string, cb: (route: Route, database: typeof mongoose | null) => void, routerOptions?: RouterOptions): Route;
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
    client: typeof mongoose | null;
    constructor(core: Core);
    getSecretFromKMS(keyName: string): void;
    createClient(): Promise<typeof mongoose>;
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

export { DBService, ErrorResponse, HTTPHandle, HTTPService, KMSService, Route, Core as default };
