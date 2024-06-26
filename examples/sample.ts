import { config } from 'dotenv'
config({
  path: './examples/.env.local'
})

import Core from '../src'
import Route from '../src/Route';
import { ErrorResponse } from '../src/HTTPHandle';

const CERTIFICATE_KEY = 'DB_CERTIFICATE';
const CERTIFICATE_DATABASE_NAME = process.env.CERTIFICATE_DATABASE_NAME;

const core = Core.instanciateFromEnv();

async function bootstrap() {
  if (!CERTIFICATE_DATABASE_NAME) {
    throw new Error('Missing certificate database name in env');
  }

  await core.KMService.fetchSecret(
    CERTIFICATE_DATABASE_NAME,
    CERTIFICATE_KEY
  );
  
  core.DBService.getSecretFromKMS(CERTIFICATE_KEY);

  await core.DBService.createClient();

  const handle = core.HTTPService.handle;

  handle.initiateHealthCheckRoute('1.0.0');

  handle.createRoute('/', (route: Route) => {
    // Set middleware for each route endpoints
    route.setGlobalMiddleware('(/) logger', (req, res, next) => {
      console.log('Middleware for /');
      next();
    })

    // Creare a new middleware
    const authentification = route.createMiddleware('(/) authentification', (req, res, next) => {
      if (req.headers.authorization !== 'Bearer token') {
        return res.status(200).send(handle.createResponse(req, res, null, new ErrorResponse('Unauthorized', 403)));
      }

      res.locals.user = {
        id: 1,
        name: 'Shaynlink'
      }
      next();
    })

    route.mapper.use(authentification);

    route.mapper.get(
      '/',
      authentification,
      (req, res) => {
        return handle.createResponse(req, res, {
          message: 'Hello ' + res.locals.user.name
        }, null);
      });
  })

  const server = core.HTTPService.createServer();

  server.on('connection', (socket) => {
    console.log('New connection from %s', socket.remoteAddress);
  });
}

bootstrap();
