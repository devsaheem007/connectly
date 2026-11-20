import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { server, io } from "./app.js";
import { cloudinaryEnabled } from "./config/cloudinary.js";
import { emailEnabled } from "./config/mailer.js";

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("\n❌ Could not connect to MongoDB:", err.message);
    console.error(
      "   Check MONGO_URI in server/.env (and that MongoDB is running / your Atlas IP is allowed).\n",
    );
    process.exit(1);
  }

  server.listen(env.PORT, () => {
    console.log(`🚀 Connectly API running on http://localhost:${env.PORT}`);
    console.log(
      `   Email:      ${emailEnabled ? "SMTP configured" : "not configured (codes/links are printed here)"}`,
    );
    console.log(
      `   Uploads:    ${cloudinaryEnabled ? "Cloudinary" : "local disk (server/uploads)"}`,
    );
    console.log(
      `   Google:     ${env.GOOGLE_CLIENT_ID ? "configured" : "not configured"}`,
    );
  });
}

let isShuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Closing Connectly...`);

  io.close(async () => {
    try {
      await mongoose.disconnect();
      console.log("✅ MongoDB disconnected");
      process.exit(exitCode);
    } catch (err) {
      console.error("❌ Shutdown error:", err);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  shutdown("Unhandled rejection", 1);
});

start();
