
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
  status?: string; // LIVE, DEAD, UNKNOWN
}

// Error codes and their classifications - based on CC-Checker reference implementation
const LIVE_CARD_INDICATORS = [
  'cvc_check: pass',
  'succeeded',
  'requires_payment_method',
  'authentication',
  'authentication_required',
  'requires_capture',
  'payment_intent_unexpected_state',
  'security code is incorrect',
  'security_code_incorrect',
  'Your card\'s security code is incorrect',
  'incorrect_cvc',
  'stolen_card',
  'lost_card',
  'Your card has insufficient funds'
];

const DEAD_CARD_INDICATORS = [
  'pickup_card',
  'insufficient_funds',
  'Your card has expired',
  'expired_card',
  'Your card number is incorrect',
  'Your card was declined',
  'card_declined',
  'do_not_honor',
  'transaction_not_allowed',
  'generic_decline',
  'Your card\'s security code is invalid',
  'invalid_cvc',
  'card_not_supported', 
  'Your card\'s expiration month is invalid',
  'Your card\'s expiration year is invalid',
  'Your card is not supported',
  'Your card\'s security code is not correct',
  'currency_not_supported',
  'call_issuer',
  'fraudulent',
  'Try Again Later',
  'invalid_account'
];

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
      
      // Get BIN data
      let binData = null;
      try {
        binData = await this.lookupBIN(cleanCardNumber);
      } catch (binError) {
        console.error('BIN lookup failed:', binError);
      }
      
      // Check status by looking for specific patterns in the response
      // Convert payment intent to string for pattern matching
      const paymentIntentStr = JSON.stringify(paymentIntent);
      
      // Create log of the card details to include with response
      const cardLog = {
        brand: token.card?.brand || undefined,
        last4: token.card?.last4 || undefined,
        funding: token.card?.funding || undefined,
        country: token.card?.country || undefined
      };
      
      // First, cancel the payment intent to avoid accidental charges (if chargeable)
      if (paymentIntent.status === 'requires_capture') {
        await this.stripe.paymentIntents.cancel(paymentIntent.id);
      }
      
      // Check for live card indicators
      if (paymentIntent.status === 'requires_capture' || 
          LIVE_CARD_INDICATORS.some(indicator => 
            paymentIntentStr.includes(indicator) ||
            (paymentIntent.last_payment_error?.message && 
             paymentIntent.last_payment_error.message.includes(indicator)) ||
            (paymentIntent.last_payment_error?.code && 
             paymentIntent.last_payment_error.code.includes(indicator)))) {
              
        // Card is considered LIVE
        const message = paymentIntent.status === 'requires_capture' 
          ? 'CVV Matched (Chargeable)' 
          : paymentIntent.last_payment_error?.message?.includes('security code') 
            ? 'CCN Matched (Incorrect CVV)'
            : 'Card Valid (Live)';
            
        return {
          success: true,
          message,
          details: cardLog,
          binData,
          code: paymentIntent.last_payment_error?.code || paymentIntent.status,
          status: 'LIVE'
        };
      } 
      // Check for dead card indicators
      else if (DEAD_CARD_INDICATORS.some(indicator => 
              paymentIntentStr.includes(indicator) ||
              (paymentIntent.last_payment_error?.message && 
               paymentIntent.last_payment_error.message.includes(indicator)) ||
              (paymentIntent.last_payment_error?.code && 
               paymentIntent.last_payment_error.code.includes(indicator)))) {
               
        // Card is considered DEAD
        return {
          success: false,
          message: paymentIntent.last_payment_error?.message || 'Card Declined',
          details: cardLog,
          binData,
          code: paymentIntent.last_payment_error?.code || 'card_declined',
          status: 'DEAD'
        };
      }
      // No specific pattern found, treat as UNKNOWN
      else {
        return {
          success: false,
          message: paymentIntent.last_payment_error?.message || 'Unknown Card Status',
          details: cardLog,
          binData,
          code: paymentIntent.last_payment_error?.code || paymentIntent.status,
          status: 'UNKNOWN'
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
      
      // Check if the error message or code matches any of our live indicators
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      
      // Classify based on error message/code
      let status = 'UNKNOWN';
      let success = false;
      
      if (LIVE_CARD_INDICATORS.some(indicator => 
          errorMessage.includes(indicator) || errorCode.includes(indicator))) {
        status = 'LIVE';
        success = true;
      } else if (DEAD_CARD_INDICATORS.some(indicator => 
                errorMessage.includes(indicator) || errorCode.includes(indicator))) {
        status = 'DEAD';
      }
      
      return {
        success,
        message: error.message || 'Card validation failed',
        code: error.code || 'card_declined',
        binData: binData,
        status
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
