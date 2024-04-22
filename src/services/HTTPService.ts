import http from 'node:http'
import HTTPHandle from '../HTTPHandle'
import type Core from '../Core'

export default class HTTPService {
  public core: Core
  public server: http.Server | null
  public handle: HTTPHandle
  /**
   * @constructor
   */
  constructor (core: Core) {
    this.core = core
    this.server = null
    this.handle = new HTTPHandle(this.core)
  }

  /**
   * @method createServer
   */
  createServer (): http.Server {
    this.server = http.createServer(this.handle.app)

    this.server.listen(
      this.core.options.port,
      () => {
        this.core.debug('Server is running on port %s', this.core.options.port)
      })

    return this.server
  }

  getServer (): http.Server {
    if (this.server === null) {
      throw new Error('Server is not initiated')
    }

    return this.server
  }
}
