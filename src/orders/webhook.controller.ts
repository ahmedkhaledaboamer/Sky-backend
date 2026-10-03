import { Controller, Headers, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { OrdersService } from './orders.service';

// POST /webhook-checkout (outside /api/v1) — Stripe calls it when a checkout is paid.
// Needs the raw body for the signature check (NestFactory.create(..., { rawBody: true })).
@Controller('webhook-checkout')
export class WebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature?: string,
  ): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.ordersService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      await this.ordersService.createCardOrder(event.data.object);
    }
    res.status(200).json({ received: true });
  }
}
