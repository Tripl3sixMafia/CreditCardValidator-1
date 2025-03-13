import { users, type User, type InsertUser, TelegramBotSettings } from "@shared/schema";
import { randomBytes } from 'crypto';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  verifyEmail(token: string): Promise<boolean>;
  updateTelegramSettings(userId: number, settings: TelegramBotSettings): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    // Generate a unique verification token
    const verificationToken = randomBytes(32).toString('hex');
    
    const user: User = { 
      ...insertUser, 
      id, 
      verificationToken,
      emailVerified: false,
      telegramBotToken: null,
      telegramChatId: null,
      createdAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async verifyEmail(token: string): Promise<boolean> {
    const user = Array.from(this.users.values()).find(
      (user) => user.verificationToken === token
    );
    
    if (!user) return false;
    
    user.emailVerified = true;
    user.verificationToken = null;
    this.users.set(user.id, user);
    return true;
  }
  
  async updateTelegramSettings(userId: number, settings: TelegramBotSettings): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      telegramBotToken: settings.telegramBotToken, 
      telegramChatId: settings.telegramChatId 
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const storage = new MemStorage();
