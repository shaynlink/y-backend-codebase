import type { ClientOptions } from '@google-cloud/secret-manager';
import type { MongoClient, MongoOptions } from 'mongodb';
import type { MongooseOptions } from 'mongoose';

export interface CoreOptions {
  usePriorityEnvVars?: boolean
  port?: string
  secretManagerServicClientOptions?: ClientOptions
  mongoURI: string;
  mongoClientOptions?: MongooseOptions & MongoOptions;
  mongoDatabaseName: string;
}
