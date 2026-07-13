import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { User, Company, Product, Ticket, WhatsAppMessage, ServiceLog, BotState } from './models.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const MONGO_URI = "mongodb+srv://enquiry_db_user:zcMmRkyRfoEuR8eM@cluster0.eethx9i.mongodb.net/service_portal?retryWrites=true&w=majority";

async function runMigration() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  if (!fs.existsSync(DB_FILE)) {
    console.error("Local db.json file not found. Migration aborted.");
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Clear existing collections to start fresh
  console.log("Clearing existing collections...");
  await User.deleteMany({});
  await Company.deleteMany({});
  await Product.deleteMany({});
  await Ticket.deleteMany({});
  await WhatsAppMessage.deleteMany({});
  await ServiceLog.deleteMany({});
  await BotState.deleteMany({});

  // Seed Users
  if (data.users && data.users.length > 0) {
    console.log(`Migrating ${data.users.length} users...`);
    await User.insertMany(data.users);
  }

  // Seed Companies
  if (data.companies && data.companies.length > 0) {
    console.log(`Migrating ${data.companies.length} companies...`);
    await Company.insertMany(data.companies);
  }

  // Seed Products
  if (data.products && data.products.length > 0) {
    console.log(`Migrating ${data.products.length} products...`);
    await Product.insertMany(data.products);
  }

  // Seed Tickets
  if (data.tickets && data.tickets.length > 0) {
    console.log(`Migrating ${data.tickets.length} tickets...`);
    await Ticket.insertMany(data.tickets);
  }

  // Seed WhatsApp Messages
  if (data.whatsapp_messages && data.whatsapp_messages.length > 0) {
    console.log(`Migrating ${data.whatsapp_messages.length} WhatsApp messages...`);
    await WhatsAppMessage.insertMany(data.whatsapp_messages);
  }

  // Seed Service Logs
  if (data.service_logs && data.service_logs.length > 0) {
    console.log(`Migrating ${data.service_logs.length} service logs...`);
    await ServiceLog.insertMany(data.service_logs);
  }

  console.log("Migration completed successfully!");
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});
