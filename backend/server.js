require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { seedDemoData } = require("./utils/demoSeed");

const PORT = process.env.PORT || 5055;
const DAY_MS = 24 * 60 * 60 * 1000;

const start = async () => {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error("MONGO_URI and JWT_SECRET must be set");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  // Public demo: reseed on boot and once a day so visitors always find a
  // working dataset, whatever the previous visitor did with the admin account.
  if (process.env.DEMO_MODE === "true") {
    await seedDemoData({ reset: true });
    setInterval(() => seedDemoData({ reset: true }).catch(console.error), DAY_MS);
    console.log("Demo data seeded");
  }

  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
};

start().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
