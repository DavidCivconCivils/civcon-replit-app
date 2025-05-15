import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import * as crypto from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true
    }),
    cookie: {
      httpOnly: true,
      // In Replit environment, we need to enable secure cookies but also set sameSite to 'none'
      // to allow cross-site cookies when using the Replit domain
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
  };

  app.set("trust proxy", 1);
  
  // More detailed session debugging
  app.use((req, res, next) => {
    console.log('Pre-session middleware. Cookies:', req.headers.cookie);
    next();
  });
  
  app.use(session(sessionSettings));
  
  app.use((req, res, next) => {
    console.log('Post-session middleware. Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid email or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      console.log('Deserializing user with ID:', id);
      // Ensure ID is a string
      const userId = String(id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }
      
      console.log('User found during deserialization:', user.email);
      return done(null, user);
    } catch (error) {
      console.error('Error during deserialization:', error);
      return done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Create user with hashed password
      const hashedPassword = await hashPassword(password);
      // Generate a unique ID
      const id = crypto.randomUUID();
      
      const user = await storage.createUser({
        id,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "user", // Default role
      });

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for:", req.body.email);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      console.log("User authenticated successfully:", user.id);
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        
        console.log("User logged in, session established");
        console.log("Session ID:", req.sessionID);
        console.log("Session data:", req.session);
        
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ redirectUrl: "/" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
  
  // Debug endpoint to create a test user
  app.post("/api/create-test-user", async (req, res) => {
    try {
      // Check if we already have a test user
      const existingUser = await storage.getUserByEmail("test@example.com");
      if (existingUser) {
        return res.json({ message: "Test user already exists", user: { email: existingUser.email } });
      }
      
      // Create a test user if not exists
      const hashedPassword = await hashPassword("password123");
      const id = crypto.randomUUID();
      
      const user = await storage.createUser({
        id,
        email: "test@example.com",
        password: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "admin"
      });
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "Test user created successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ message: "Failed to create test user" });
    }
  });
  
  // Password reset endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      const updatedUser = await storage.updateUserPassword(user.id, hashedPassword);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });
}

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};