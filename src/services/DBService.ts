import { RateLimiterMongo } from 'rate-limiter-flexible';
import Core from '../Core';
import {
  MongoClient,
  type MongoClientOptions,
  ServerApiVersion,
  type Db
} from 'mongodb';
import { ErrorResponse } from '../HTTPHandle';

function splitPEM(pemContent: string): { certificate: string | undefined, privateKey: string | undefined } | null {
  const pemSectionRegex = /-----BEGIN [^-]+-----[^-]*-----END [^-]+-----/g;
  const pemSections = pemContent.match(pemSectionRegex);

  if (pemSections) {
    // Return an object with properties for each section
    const result = {
      certificate: pemSections.find(section => section.includes("CERTIFICATE")),
      privateKey: pemSections.find(section => section.includes("PRIVATE KEY"))
    };

    return result;
  } else {
    return null; // or handle the case where no PEM sections are found
  }
}

export default class DBService {
  public readonly core: Core
  private certificate: string | Uint8Array | null;
  public client: MongoClient | null;
  public db: Db | null;

  constructor(core: Core) {
    this.core = core;

    this.certificate = null;

    this.client = null;

    this.db = null;
  }

  getSecretFromKMS(keyName: string) {
    this.certificate = this.core.KMService.getSecret(keyName);
  }

  async createClient() {
    const mongoOptions: MongoClientOptions = this.core.options.mongoClientOptions ?? {};

    if (this.certificate) {
      const splitedPem = splitPEM(this.certificate.toString());
      if (!splitedPem) {
        throw new Error('Invalid certificate');
      }
      const { certificate, privateKey } = splitedPem;
      // mongoOptions.tls = true;
      mongoOptions.cert = certificate;
      mongoOptions.key = privateKey;
    }

    mongoOptions.serverApi = ServerApiVersion.v1;

    this.client = new MongoClient(
      this.core.options.mongoURI,
      mongoOptions
    );

    this.client.on('connectionReady', () => {
      this.core.debug('Connected to MongoDB');
    });

    this.client.on('connectionClosed', () => {
      this.core.debug('Disconnected from MongoDB');
    });

    this.client.on('connectionCreated', () => {
      this.core.debug('Connection to MongoDB created');
    });

    await this.client.connect();

    this.db = this.client.db(this.core.options.mongoDatabaseName)

    this.core.HTTPService.handle.app.locals.database = this.db;

    this.core.HTTPService.handle.rateLimit = new RateLimiterMongo({
      storeClient: this.core.DBService.db,
      points: 10,
      duration: 1,
    })

    this.core.HTTPService.handle.app.use('/', async (req, res, next) => {
      this.core.debug('Middleware: (*) Rate limit middleware')
      try {
        await this.core.HTTPService.handle.rateLimit?.consume(req.ip || req.socket.remoteAddress || 'unknwon', 1)
        next()
      } catch (error) {
        return this.core.HTTPService.handle.createResponse(req, res, null, new ErrorResponse('Too many requests', 429))
      }
    })

    return this.client;
  }
}