import { RateLimiterMongo } from 'rate-limiter-flexible';
import Core from '../Core';
// import {
//   MongoClient,
//   type MongoClientOptions,
//   ServerApiVersion,
//   type Db
// } from 'mongodb';
import mongoose, { type MongooseOptions } from 'mongoose';
import { ErrorResponse } from '../HTTPHandle';
import { MongoOptions } from 'mongodb';

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
  public client: typeof mongoose | null;

  constructor(core: Core) {
    this.core = core;

    this.certificate = null;

    this.client = null;
  }

  getSecretFromKMS(keyName: string) {
    this.certificate = this.core.KMService.getSecret(keyName);
  }

  async createClient() {
    const mongoOptions: MongoOptions & MongooseOptions = this.core.options.mongoClientOptions ?? <MongoOptions & MongooseOptions>{};
    
    if (this.certificate) {
      const splitedPem = splitPEM(this.certificate.toString());
      if (!splitedPem) {
        throw new Error('Invalid certificate');
      }
      const { certificate, privateKey } = splitedPem;
      // mongoOptions.tls = true;
      mongoOptions.cert = certificate;  
      mongoOptions.key = privateKey;
      mongoOptions.dbName = this.core.options.mongoDatabaseName;
    }

    this.client = await mongoose.connect(
      this.core.options.mongoURI,
      mongoOptions
    )

    this.client.connection.on('connected', () => {
      this.core.debug('Connected to MongoDB');
    })

    this.client.connection.on('disconnected', () => {
      this.core.debug('Disconnected from MongoDB');
    
    })

    this.core.HTTPService.handle.app.locals.database = this.client;

    this.core.HTTPService.handle.rateLimit = new RateLimiterMongo({
      storeClient: this.client.connection,
      points: 10,
      duration: 3,
    })

    this.core.HTTPService.handle.app.use(async (req, res, next) => {
      this.core.debug('Middleware: (*) Rate limit middleware : s%', req.ip || req.socket.remoteAddress || 'unknwon')
      try {
        const rateLimitResponse = await this.core.HTTPService.handle.rateLimit?.consume(req.ip || req.socket.remoteAddress || 'unknwon', 2)

        if (rateLimitResponse) {
          res.setHeader('X-RateLimit-Limit', 10);
          res.setHeader('X-RateLimit-Remaining', rateLimitResponse.remainingPoints);
          res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitResponse.msBeforeNext).getTime() / 1000);
        }
        next()
      } catch {
        this.core.HTTPService.handle.createResponse(req, res, null, new ErrorResponse('Too many requests', 429))
      }
    })

    return this.client;
  }
}