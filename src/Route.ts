import Core from './Core';
import { type RequestHandler, Router, type RouterOptions } from 'express'

export default class Route {
  public readonly core: Core
  public readonly mapper: Router
  public readonly middlewares: Map<Symbol, RequestHandler>
  constructor(core: Core, routerOptions?: RouterOptions) {
    this.core = core;

    this.mapper = Router(routerOptions)

    this.middlewares = new Map()
  }

  setGlobalMiddleware(descriptor: string, middleware: RequestHandler): void {
    this.mapper.use(this.createMiddleware(descriptor, middleware));
  }

  createMiddleware(descriptor: string, middleware: RequestHandler): RequestHandler {
    return (req, res, next) => {
      this.core.debug(`Middleware: [${descriptor}] called`);
      middleware(req, res, next);
    };
  }
}