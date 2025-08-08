// import express from 'express';

// // Middleware to handle raw body for Stripe webhooks
// export const webhookMiddleware = (req, res, next) => {
//   if (req.originalUrl === '/webhook/stripe') {
//     express.raw({ type: 'application/json' })(req, res, next);
//   } else {
//     express.json()(req, res, next);
//   }
// };