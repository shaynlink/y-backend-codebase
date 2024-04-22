import express, { RouterOptions, type Application, type Request, type Response } from 'express'
import Core from './Core'
import Route from './Route'
import type { Db } from 'mongodb'
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import type { RateLimiterMongo } from 'rate-limiter-flexible'

/**
 * Create custom error for response
 */
export class ErrorResponse extends Error {
  status: number = 400
  /**
   * @param {string} message
   */
  constructor (message: string, status = 400) {
    super(message)

    this.name = 'ErrorResponse'
    this.status = status
  }

  /**
   * @returns Return response version
   */
  exportToResponse (): { message: string, name: string } {
    return {
      message: this.message,
      name: this.name
    }
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
      database: Db
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
        database: Db
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

    this.app.options('*', cors(this.corsOptions))
    this.app.use(cors(this.corsOptions))
    this.app.use(helmet());

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
        error: (error instanceof ErrorResponse ? error : ErrorResponse.transformToResponseError(error).exportToResponse()),
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

  createRoute (basePath: string, cb: (route: Route, database: Db | null) => void, routerOptions?: RouterOptions) {
    const route = new Route(this.core, routerOptions);

    cb(route, this.core.DBService.db);

    this.app.use(basePath, route.mapper);

    return route;
  }
}
