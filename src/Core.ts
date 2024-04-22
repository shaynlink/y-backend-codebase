import createDebug, { type Debugger } from 'debug'
import type { CoreOptions } from './types'
import HTTPService from './services/HTTPService'
import KMSService from './services/KMSService'
import DBService from './services/DBService'

const debug = createDebug('codebase')

/**
 * @class Core
 */
export default class Core {
  public readonly debug: Debugger
  public readonly options: CoreOptions
  public HTTPService: HTTPService
  public DBService: DBService
  public KMService: KMSService
  /**
   * @constructor
   */
  constructor (options: CoreOptions) {
    this.debug = debug

    if (options.usePriorityEnvVars === true) {
      this.debug('Using priority environment variables')
      if ('PORT' in process.env) {
        this.debug('PORT in variable found %s', process.env.PORT)
        options.port = process.env.PORT
      }

      if ('PROJECT_ID' in process.env) {
        this.debug('PROJECT_ID in variable found %s', process.env.PROJECT_ID)
        if (!options.secretManagerServicClientOptions) {
          options.secretManagerServicClientOptions = {}
        }
        options.secretManagerServicClientOptions.projectId = process.env.PROJECT_ID
      }
    }

    this.options = options;

    this.HTTPService = new HTTPService(this)
    this.DBService = new DBService(this);
    this.KMService = new KMSService(this);
  }

  static instanciateFromEnv() {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      throw new Error('Missing MONGO_URI in env');
    }

    const MONGO_DATABASE_NAME = process.env.MONGO_DATABASE_NAME;

    if (!MONGO_DATABASE_NAME) {
      throw new Error('Missing MONGO_DATABASE_NAME in env');
    }

    return new Core({
      usePriorityEnvVars: true,
      mongoURI: MONGO_URI,
      mongoDatabaseName: MONGO_DATABASE_NAME
    })
  }
}
