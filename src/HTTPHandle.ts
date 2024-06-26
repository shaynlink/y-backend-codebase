import express, { RouterOptions, type Application, type Request, type Response } from 'express'
import Core from './Core'
import Route from './Route'
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import type { RateLimiterMongo } from 'rate-limiter-flexible'
import mongoose from 'mongoose'

export interface ErrorResponseComplance {
  message: string,
  name: string,
  extra?: Record<string, any>
}

/**
 * Create custom error for response
 */
export class ErrorResponse extends Error {
  public status: number = 400
  public extra?: Record<string, any>
  /**
   * @param {string} message
   */
  constructor (message: string, status = 400, extra?: Record<string, any>) {
    super(message)

    this.name = 'ErrorResponse'
    this.status = status
    this.extra = extra
  }

  /**
   * @returns Return response version
   */
  exportToResponse (): ErrorResponseComplance {
    const exporter: ErrorResponseComplance = {
      message: this.message,
      name: this.name
    }
    if (this.extra) {
      exporter.extra = this.extra
    }

    return exporter;
  }

  static transformToResponseError (error: Error): ErrorResponse {
    return new ErrorResponse(error.message)
  }
}

type NullableError<Extra extends Error> = null | Extra | Error

/**
 * @class HTTPHandle
 */
export default class HTTPHandle {
  public readonly core: Core
  public readonly app: Application & {
    locals: {
      database: typeof mongoose
    }
  }
  public readonly corsOptions: CorsOptions
  public rateLimit: RateLimiterMongo | null = null
  /**
   * @constructor
   * @param {Core} core
   */
  constructor (core: Core) {
    this.core = core;

    this.app = express() as unknown as Application & {
      locals: {
        database: typeof mongoose
      }
    }

    this.corsOptions = {
      origin: [/http(s)?:\/\/localhost:\d{3,5}/],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false,
    }

    this.app.use(express.json())
    this.app.options('*', cors(this.corsOptions))
    this.app.use(cors(this.corsOptions))
    this.app.use(helmet())

    this.app.disable('x-powered-by')
  }

  /**
   * @param result
   */
  createResponse <R extends Record<string, any> | null = null>(
    req: Request,
    res: Response,
    result: R,
    error: NullableError<ErrorResponse>,
    transform?: (
      req: Request,
      res: Response,
      result: R,
      error: NullableError<ErrorResponse>
    ) => void): void {
    if (error !== null) {
      res.setHeader('Content-Type', 'application/json')
      res.status((error as & { status?: number })?.status ?? 400)
      transform?.(req, res, result, error)
      res.json({
        error: (error instanceof ErrorResponse ? error.exportToResponse() : ErrorResponse.transformToResponseError(error).exportToResponse()),
        result: null
      })
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.status(200)
      transform?.(req, res, result, null)
      res.json({
        error: null,
        result
      })
    }
  }

  initiateHealthCheckRoute (version: string): this {
    this.app.get('/health', (req, res) => {
      return this.createResponse(req, res, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: version,
        lifespan: process.uptime()
      }, null)
    })

    return this
  }

  initiateNotFoundRoute (): this {
    this.app.use((req, res) => {
      return this.createResponse(req, res, null, new ErrorResponse('Not Found', 404))
    })

    return this
  }

  createRoute (basePath: string, cb: (route: Route, database: typeof mongoose | null) => void, routerOptions?: RouterOptions) {
    const route = new Route(this.core, routerOptions);

    cb(route, this.core.DBService.client);

    this.app.use(basePath, route.mapper);

    return route;
  }
}
