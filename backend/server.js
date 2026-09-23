require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { seedDemoData } = require("./utils/demoSeed");

const PORT = process.env.PORT || 5055;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 15000;

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("MONGO_URI and JWT_SECRET must be set");
  process.exit(1);
}

// Listen first so the host sees a healthy port and requests fail fast with a
// clear 503 (see app.js) while the database is unreachable, instead of hanging.
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

let demoTimer;
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected");

    // Public demo: reseed on boot and once a day so visitors always find a
    // working dataset, whatever the previous visitor did with the admin account.
    if (process.env.DEMO_MODE === "true" && !demoTimer) {
      await seedDemoData({ reset: true });
      demoTimer = setInterval(() => seedDemoData({ reset: true }).catch(console.error), DAY_MS);
      console.log("Demo data seeded");
    }
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}. Retrying in ${RETRY_MS / 1000}s`);
    setTimeout(connect, RETRY_MS);
  }
};

connect();
