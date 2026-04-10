require('dotenv').config();
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware =====

app.use(cors());
app.use(bodyParser.json());

// ===== MongoDB Connection =====
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB connected to recycleDB (Native Driver)");

    db = client.db("recycleDB");

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run();

// ===== Serve Frontend =====
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// Routes for frontend pages
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "profile.html"));
});
app.get("/calculate.html", (req, res) => {
  res.sendFile(path.join(frontendPath, "calculator.html"));
});

// ===== API Routes =====

// Save or update profile (signup/login)
app.post("/api/profile", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!db) return res.status(500).json({ message: "Database not connected" });

  try {
    const usersCollection = db.collection("users");
    let user = await usersCollection.findOne({ email });

    if (!user) {
      user = {
        name,
        email,
        phone,
        greenPoints: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await usersCollection.insertOne(user);
    } else {
      await usersCollection.updateOne(
        { email },
        { $set: { name, phone, updatedAt: new Date() } }
      );
      // Fetch updated user to return
      user = await usersCollection.findOne({ email });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.toString() });
  }
});

// Get user profile by email
app.get("/api/profile/:email", async (req, res) => {
  if (!db) return res.status(500).json({ message: "Database not connected" });

  try {
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Calculate and update Green Points
app.post("/api/calculate", async (req, res) => {
  const { email, plastic, paper, metal, glass, ewaste } = req.body;
  if (!db) return res.status(500).json({ message: "Database not connected" });

  let points = 0;
  points += (plastic || 0) * 10;
  points += (paper || 0) * 10;
  points += Math.floor((metal || 0) / 5) * 10;
  points += Math.floor((glass || 0) / 5) * 10;
  points += Math.floor((ewaste || 0) / 10) * 10;

  try {
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newHistoryItem = {
      material: "Mixed",
      kg:
        (plastic || 0) +
        (paper || 0) +
        (metal || 0) +
        (glass || 0) +
        (ewaste || 0),
      points,
      date: new Date() // Store as native Date object
    };

    const updateResult = await usersCollection.findOneAndUpdate(
      { email },
      {
        $inc: { greenPoints: points },
        $push: { history: newHistoryItem },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    // native driver v6 findOneAndUpdate returns an object with `value` or directly the doc depending on options
    // Using simple findOne for safety if unsure of driver version behavior in this context, but 'after' should return doc.
    // Let's safe-fetch.
    const updatedUser = await usersCollection.findOne({ email });

    res.json({ success: true, totalPoints: updatedUser.greenPoints, earned: points });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.toString() });
  }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
