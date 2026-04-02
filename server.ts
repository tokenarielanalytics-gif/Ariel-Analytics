import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
} else {
  console.warn("Firebase config not found. Admin SDK not initialized.");
}

const db = admin.apps.length ? admin.firestore() : null;

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for Stripe Webhook (must be before express.json())
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe not configured");
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (!db) return res.status(500).send("Database not initialized");

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await db.collection('users').doc(userId).update({
            plan: plan,
            stripeCustomerId: session.customer as string,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`User ${userId} upgraded to ${plan}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await userDoc.ref.update({
            plan: 'FREE',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`User ${userDoc.id} subscription canceled`);
        }
        break;
      }
    }
    
    res.json({ received: true });
  });

  app.use(express.json());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe Checkout
  app.post("/api/stripe/create-checkout-session", authenticate, async (req: any, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
    
    const { plan } = req.body;
    const userId = req.user.uid;

    const prices: any = {
      PRO: process.env.STRIPE_PRICE_PRO,
      PREMIUM: process.env.STRIPE_PRICE_PREMIUM
    };

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: prices[plan],
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/dashboard?success=true`,
        cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
        metadata: {
          userId,
          plan
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Crypto API Proxy Routes
  app.get("/api/crypto/dexscreener/search", async (req, res) => {
    try {
      const { q } = req.query;
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${q}`);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from Dexscreener" });
    }
  });

  app.get("/api/crypto/dexscreener/latest", async (req, res) => {
    try {
      const response = await axios.get("https://api.dexscreener.com/token-profiles/latest/v1");
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest tokens" });
    }
  });

  // Usage Limit Middleware
  const checkUsageLimit = async (req: any, res: any, next: any) => {
    if (!db) return next();

    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const userPlan = userData?.plan || "FREE";
    const userUsage = userData?.analysesCount || 0;

    const limits: any = {
      FREE: 5,
      PRO: 50,
      PREMIUM: 200
    };

    if (userUsage >= limits[userPlan]) {
      return res.status(403).json({ error: "Usage limit reached for your plan" });
    }
    next();
  };

  // Analysis Engine
  app.get("/api/crypto/analyze", authenticate, checkUsageLimit, async (req: any, res) => {
    try {
      const { symbol } = req.query;
      if (!symbol) return res.status(400).json({ error: "Symbol is required" });

      // Real Dexscreener Data Integration
      const dexResponse = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`);
      const pair = dexResponse.data.pairs?.[0];

      const analysis = {
        id: Math.random().toString(36).substring(7),
        symbol: (symbol as string).toUpperCase(),
        name: pair?.baseToken?.name || `${symbol} Token`,
        price: parseFloat(pair?.priceUsd || "0"),
        score: Math.floor(Math.random() * 40) + 60, // Base score
        signal: Math.random() > 0.6 ? "BUY" : (Math.random() > 0.3 ? "RISKY" : "SELL"),
        liquidity: pair?.liquidity?.usd || 0,
        volume24h: pair?.volume?.h24 || 0,
        momentum: pair?.priceChange?.h24 || 0,
        hype: Math.random() * 10,
        timestamp: new Date().toISOString(),
        indicators: {
          rsi: Math.floor(Math.random() * 30) + 40,
          macd: Math.random() * 0.0001,
          ema: parseFloat(pair?.priceUsd || "0") * 0.98,
        }
      };

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
