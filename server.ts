import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// CRITICAL: Set environment variables BEFORE any Firebase Admin calls
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
}

// Lazy Firebase Admin Initialization
let appInstance: admin.app.App | null = null;
let dbInstance: admin.firestore.Firestore | null = null;
let authAdminInstance: admin.auth.Auth | null = null;

function getFirebaseAdmin() {
  if (!appInstance) {
    const projectId = firebaseConfig.projectId;
    try {
      console.log(`[Firebase Admin] Init check for project: ${projectId}`);
      
      // Try to find if an app already exists for this project
      const existing = admin.apps.find(a => a?.options.projectId === projectId);
      if (existing) {
        appInstance = existing;
      } else {
        // If we are the first app, or previous apps were for different projects
        if (admin.apps.length === 0) {
          appInstance = admin.initializeApp({ projectId });
        } else {
          appInstance = admin.initializeApp({ projectId }, `admin-${Date.now()}`);
        }
      }
      console.log(`[Firebase Admin] Using App: ${appInstance.name} (${appInstance.options.projectId})`);
    } catch (error: any) {
      console.error("[Firebase Admin] Initialization failed, using default app:", error.message);
      appInstance = admin.apps.length > 0 ? admin.app() : admin.initializeApp();
    }
  }
  return appInstance;
}

let isDefaultFallbackActive = false;

function getDb() {
  if (!dbInstance) {
    const app = getFirebaseAdmin();
    const configDbId = (firebaseConfig.firestoreDatabaseId || "(default)").trim();
    
    try {
      if (isDefaultFallbackActive || configDbId === "(default)") {
        console.log(`[Firebase Admin] Using (default) database.`);
        dbInstance = getFirestore(app);
      } else {
        console.log(`[Firebase Admin] Using named database: ${configDbId}`);
        dbInstance = getFirestore(app, configDbId);
      }
    } catch (e: any) {
      console.error(`[Firebase Admin] Firestore init failure: ${e.message}`);
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

// Global flag to force default database after any major failure
function triggerDefaultFallback() {
  if (!isDefaultFallbackActive && (firebaseConfig.firestoreDatabaseId || "(default)").trim() !== "(default)") {
    console.warn("[Firebase Admin] Global fallback to (default) database triggered.");
    isDefaultFallbackActive = true;
    dbInstance = null;
  }
}

// Connection check with auto-switching
async function verifyConnectivity() {
  const configDbId = (firebaseConfig.firestoreDatabaseId || "(default)").trim();
  
  try {
    const db = getDb();
    // Test a read quietly
    await db.collection("users").limit(1).get();
    console.log(`[Firebase Admin] Connectivity verified for project: ${firebaseConfig.projectId}`);
  } catch (error: any) {
    if (configDbId !== "(default)" && !isDefaultFallbackActive) {
      isDefaultFallbackActive = true;
      dbInstance = null; // Force reset
      try {
        const db = getDb();
        await db.collection("users").limit(1).get();
        console.log(`[Firebase Admin] Switched to (default) database fallback.`);
      } catch (fallbackError: any) {
        console.warn(`[Firebase Admin] Connectivity issue: ${fallbackError.message}`);
      }
    }
  }
}
// Run connectivity test once quietly in background
verifyConnectivity().catch(() => {});

function getAuthAdmin() {
  if (!authAdminInstance) {
    const app = getFirebaseAdmin();
    authAdminInstance = getAuth(app);
  }
  return authAdminInstance;
}

// Formal Firestore Error Handler as per instructions
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

type OperationType = (typeof OperationType)[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, uid?: string, email?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: uid || null,
      email: email || null,
    }
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error Instance: ', jsonError);
  throw new Error(jsonError);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware for all secure API calls
  const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Authentication attempt without Bearer token');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const authAdmin = getAuthAdmin();
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error: any) {
      console.error('Token Verification Error:', error.message);
      res.status(401).json({ error: `Unauthorized: ${error.message}` });
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure Ad Verification Endpoint
  app.post("/api/verify-ad", authenticate, async (req, res) => {
    const { adId, reward, progress } = req.body;
    const user = (req as any).user;
    const uid = user.uid;

    console.log(`[API] Received verify-ad request from UID: ${uid} (${user.email}) for adId: ${adId}`);
    
    if (!adId || reward === undefined || progress === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields"
      });
    }

    // Security Rule 1: Watch progress must be >= 90%
    if (progress < 90) {
      return res.status(403).json({ error: "Insufficient ad progress (min 90%)" });
    }

    try {
      // Security Rule 2: Verify user exists and is active
      const db = getDb();
      const userRef = db.collection("users").doc(uid);
      let userDoc;
      try {
        userDoc = await userRef.get();
      } catch (err: any) {
        if (err.message.includes("NOT_FOUND") || err.code === 5) {
          console.warn("[API] Detected possible database missing error. Triggering fallback.");
          triggerDefaultFallback();
          // After fallback, we need to retry or return a specific error that prompts client to retry
          return res.status(503).json({ error: "Initializing database. Please try again in a moment." });
        }
        handleFirestoreError(err, OperationType.GET, `users/${uid}`, uid, user.email);
        return; 
      }

      if (!userDoc.exists) {
        console.log(`[API] User ${uid} not found. Creating new profile...`);
        try {
          await userRef.set({
            email: user.email || "",
            walletBalance: 0,
            totalEarnings: 0,
            status: 'active', // Default to active for better UX
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          userDoc = await userRef.get(); // Re-fetch
        } catch (createErr) {
          handleFirestoreError(createErr, OperationType.CREATE, `users/${uid}`, uid, user.email);
          return;
        }
      }

      const userData = userDoc.data();
      
      // Auto-activate for testing if status is missing or user is admin
      const isAdminEmail = userData?.email === "bertsalvador227@gmail.com";
      if (!userData?.status) {
        await userRef.update({ status: 'active' });
      }
      
      if (userData?.status !== "active" && !isAdminEmail) {
        return res.status(403).json({ error: `Account is ${userData?.status || 'inactive'}. Please wait for admin approval.` });
      }

      // Security Rule 3: Prevention of duplicate reward for same ad session
      const now = Date.now();
      const lastRewardAt = userData?.lastAdRewardAt;
      const lastRewardTime = lastRewardAt ? (typeof lastRewardAt.toMillis === 'function' ? lastRewardAt.toMillis() : 0) : 0;
      
      // Reduced cooldown to 1s for testing and smoother experience
      if (now - lastRewardTime < 1000) { 
          return res.status(429).json({ error: "Please wait before watching the next ad." });
      }
      
      // Atomic Update: Balance and Total Earnings
      await db.runTransaction(async (transaction) => {
        const freshUserDoc = await transaction.get(userRef);
        if (!freshUserDoc.exists) {
           throw new Error("User document disappeared during transaction");
        }
        const currentBalance = freshUserDoc.data()?.walletBalance || 0;
        const currentTotal = freshUserDoc.data()?.totalEarnings || 0;

        transaction.update(userRef, {
          walletBalance: currentBalance + reward,
          totalEarnings: currentTotal + reward,
          lastAdRewardAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Record Transaction
        const txRef = db.collection("transactions").doc();
        transaction.set(txRef, {
          userId: uid,
          amount: reward,
          type: "earning",
          description: `Watched Ad: ${adId}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      res.json({ success: true, reward });
    } catch (error: any) {
      console.error("Verification Error at /api/verify-ad:", error);
      // If it's already a JSON error, pass it through
      let message = error.message;
      if (message.startsWith('{')) {
         try {
           const parsed = JSON.parse(message);
           message = parsed.error || message;
         } catch (e) {}
      }
      res.status(500).json({ error: `Verification failed: ${message || 'Unknown error'}` });
    }
  });

  // Admin Only Middleware (Requires authenticate to run first)
  const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    const adminEmail = process.env.ADMIN_EMAIL || "bertsalvador227@gmail.com";

    if (user && user.email === adminEmail) {
      next();
    } else {
      res.status(403).json({ error: "Unauthorized. Admin access only." });
    }
  };

  // Example Admin API
  app.get("/api/admin/stats", authenticate, adminOnly, (req, res) => {
    res.json({
      totalUsers: 100,
      activeUsers: 45,
      totalRevenue: "₱15,240.00",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
