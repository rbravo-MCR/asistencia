export {
  createLocationService,
  recordLocationCheck,
  initializeLocationDefaults,
  type LocationService,
} from './service.js';
export { registerLocationRoutes } from './routes.js';
export { LocationError } from './domain/geofence.js';
export { readLocationConfiguration } from './configuration.js';
