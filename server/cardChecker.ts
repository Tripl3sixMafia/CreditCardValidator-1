
import Stripe from 'stripe';
import fetch from 'node-fetch';

// Card checker types
export interface CheckerResponse {
  success: boolean;
  message: string;
  details?: {
    brand?: string;
    last4?: string;
    funding?: string;
    country?: string;
  };
  binData?: any;
  code?: string;
}

export class CardChecker {
  private stripe: Stripe;
  
  constructor(stripeSecretKey: string) {
    this.stripe = new Stripe(stripeSecretKey || '', {
      apiVersion: '2023-10-16' as any,
    });
  }
  
  async checkCard(cardDetails: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    name?: string;
  }): Promise<CheckerResponse> {
    try {
      // Clean card number
      const cleanCardNumber = cardDetails.number.replace(/\s+/g, '');
      
      // First create a token to validate card format
      const tokenParams: any = {
        card: {
          number: cleanCardNumber,
          exp_month: cardDetails.expMonth,
          exp_year: cardDetails.expYear,
          cvc: cardDetails.cvc,
          name: cardDetails.name || undefined
        }
      };
      
      const token = await this.stripe.tokens.create(tokenParams);
      
      // If token creation is successful, try creating a payment method
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: token.id,
        },
      });
      
      // Create a $1 PaymentIntent to verify if card is active
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 100, // $1.00
        currency: 'usd',
        payment_method: paymentMethod.id,
        confirm: true,
        capture_method: 'manual', // Set to manual to avoid actual charges
      });
      
      // Check if card is chargeable
      const isLiveCard = paymentIntent.status === 'requires_capture';
      
      // Always cancel the payment intent
      if (isLiveCard) {
        await this.stripe.paymentIntents.cancel(paymentIntent.id);
      }
      
      // Get BIN data
      let binData = null;
      try {
        binData = await this.lookupBIN(cleanCardNumber);
      } catch (binError) {
        console.error('BIN lookup failed:', binError);
      }
      
      if (isLiveCard) {
        return {
          success: true,
          message: 'Card is valid and active (LIVE)',
          details: {
            brand: token.card?.brand,
            last4: token.card?.last4,
            funding: token.card?.funding,
            country: token.card?.country
          },
          binData: binData || null,
          code: 'approved'
        };
      } else {
        return {
          success: false,
          message: 'Card is valid but not active for charges',
          details: {
            brand: token.card?.brand,
            last4: token.card?.last4,
            funding: token.card?.funding,
            country: token.card?.country
          },
          binData: binData || null,
          code: 'card_not_chargeable'
        };
      }
    } catch (error: any) {
      // Get BIN data despite error
      let binData = null;
      try {
        binData = await this.lookupBIN(cardDetails.number.replace(/\s+/g, ''));
      } catch (binError) {
        console.error('BIN lookup failed during error handling:', binError);
      }
      
      return {
        success: false,
        message: error.message || 'Card validation failed',
        code: error.code || 'card_declined',
        binData: binData
      };
    }
  }
  
  private async lookupBIN(binNumber: string): Promise<any> {
    try {
      // Get first 6-8 digits (BIN)
      const bin = binNumber.slice(0, 8);
      
      // Use binlist.net API
      const response = await fetch(`https://lookup.binlist.net/${bin}`);
      
      if (!response.ok) {
        console.error(`BIN lookup failed: ${response.status} ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error during BIN lookup:', error);
      return null;
    }
  }
}
