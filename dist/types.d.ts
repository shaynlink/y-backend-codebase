import type { ClientOptions } from '@google-cloud/secret-manager'

export interface CoreOptions {
  usePriorityEnvVars?: boolean
  port?: string
  secretManagerServicClientOptions?: ClientOptions
  mongoURI: string;
  mongoClientOptions?: MongoClientOptions;
  mongoDatabaseName: string;
}
