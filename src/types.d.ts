import type { ClientOptions } from 'google-gax'
import type { MongoOptions } from 'mongodb';
import type { MongooseOptions } from 'mongoose';

export interface CoreOptions {
  usePriorityEnvVars?: boolean
  port?: string
  secretManagerServicClientOptions?: ClientOptions
  mongoURI: string;
  mongoClientOptions?: MongooseOptions & MongoOptions;
  mongoDatabaseName: string;
}
