import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  phone_number: { type: String, required: true },
  is_available: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  verification_token: { type: String, default: null }
});

const CompanySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  address: { type: String, required: true }
});

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  company_id: { type: Number, required: true },
  product_name: { type: String, required: true },
  product_code: { type: String, required: true },
  description: { type: String, required: true }
});

const TicketSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  ticket_number: { type: String, required: true, unique: true },
  company_id: { type: Number, required: true },
  product_id: { type: Number, default: null },
  product_name: { type: String, default: '' },
  serial_number: { type: String, default: '' },
  client_whatsapp: { type: String, required: true },
  client_email: { type: String, default: '' },
  invoice_spare_parts: { type: String, default: null },
  invoice_service_cost: { type: Number, default: null },
  invoice_spare_parts_cost: { type: Number, default: null },
  invoice_total_amount: { type: Number, default: null },
  purchase_date: { type: Date, default: null },
  description: { type: String, required: true },
  status: { type: String, default: 'open' },
  assigned_engineer_id: { type: Number, default: null },
  scheduled_slot: { type: Date, default: null },
  closed_at: { type: Date, default: null },
  is_escalated: { type: Boolean, default: false },
  eta_assigned: { type: Date, default: null },
  eta_in_progress: { type: Date, default: null },
  eta_resolved: { type: Date, default: null },
  assigned_at: { type: Date, default: null },
  in_progress_at: { type: Date, default: null },
  resolved_at: { type: Date, default: null },
  internal_status: { type: String, default: 'Pending' },
  final_comments: { type: String, default: null },
  service_form_image: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const WhatsAppMessageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  ticket_id: { type: Number, default: null },
  client_whatsapp: { type: String, required: true },
  sender: { type: String, required: true }, // 'client', 'bot', 'manager'
  message_text: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const ServiceLogSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  ticket_id: { type: Number, required: true },
  author_id: { type: Number, default: null },
  author_name: { type: String, required: true },
  comment: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const BotStateSchema = new mongoose.Schema({
  client_whatsapp: { type: String, required: true, unique: true },
  step: { type: String, default: 'idle' },
  company_id: { type: Number, default: null },
  company_name: { type: String, default: '' },
  product_id: { type: Number, default: null },
  product_name: { type: String, default: '' },
  client_email: { type: String, default: '' }
});

export const User = mongoose.model('User', UserSchema);
export const Company = mongoose.model('Company', CompanySchema);
export const Product = mongoose.model('Product', ProductSchema);
export const Ticket = mongoose.model('Ticket', TicketSchema);
export const WhatsAppMessage = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);
export const ServiceLog = mongoose.model('ServiceLog', ServiceLogSchema);
export const BotState = mongoose.model('BotState', BotStateSchema);
