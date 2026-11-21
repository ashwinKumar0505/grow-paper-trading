import { Router } from 'express';
import type { DurableStore } from '../storage/durableStore';
import { defaultStore } from '../storage/durableStore';
import { createPaymentOrderRouter } from './paymentOrderRoutes';
import { createSubscriptionManageRouter } from './subscriptionManageRoutes';

export function createPaymentRouter(store: DurableStore = defaultStore): Router {
  const router = Router();
  router.use(createPaymentOrderRouter(store));
  router.use(createSubscriptionManageRouter(store));
  return router;
}
