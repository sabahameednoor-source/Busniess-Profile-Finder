import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Note: In Cloud Run, it will use the default service account
admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Verify a business (The core logic)
  app.post("/api/verify", async (req, res) => {
    const { businessName, location, apiKey } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: "Business name is required" });
    }

    // Verify API Key
    if (apiKey) {
      const keyDoc = await db.collection('apiKeys').doc(apiKey).get();
      if (!keyDoc.exists || keyDoc.data()?.status !== 'active') {
        return res.status(401).json({ error: "Invalid or inactive API key" });
      }
      // Update last used
      await keyDoc.ref.update({ lastUsed: new Date().toISOString() });
    } else {
      // If no API key, we might want to restrict this to session-based or just allow it for the web app
      // For now, let's assume the web app uses this endpoint directly.
      // In a real app, you'd check auth tokens here.
    }

    try {
      const prompt = `Verify if the business "${businessName}" exists on Google Maps (Google Business Profile) in the location "${location || 'anywhere'}". 
      Provide detailed information about its existence, address, profile URL, and whether it appears to be claimed or unclaimed.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exists: { type: Type.BOOLEAN },
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewsCount: { type: Type.INTEGER },
              category: { type: Type.STRING },
              isClaimed: { 
                type: Type.STRING, 
                enum: ['claimed', 'unclaimed', 'unknown'] 
              },
              profileUrl: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ['exists', 'name', 'address', 'isClaimed', 'profileUrl', 'summary']
          },
          tools: [{ googleSearch: {} }] as any
        }
      });

      const data = JSON.parse(result.text || '{}');
      res.json(data);
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Failed to verify business" });
    }
  });

  // API Route: Generate an API Key (for user management)
  app.post("/api/keys", async (req, res) => {
    const { userId, name } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const newKey = `gmb_${uuidv4().replace(/-/g, '')}`;
    const keyData = {
      key: newKey,
      ownerId: userId,
      name: name || 'Default Key',
      createdAt: new Date().toISOString(),
      status: 'active',
      lastUsed: null
    };

    await db.collection('apiKeys').doc(newKey).set(keyData);
    res.json(keyData);
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
