import mongoose from 'mongoose';
import dns from 'dns';
import { User, Company, Product, Ticket, WhatsAppMessage, ServiceLog, BotState } from './models.js';

// Configure custom DNS resolution to bypass querySrv lookups on restricted networks
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const MONGO_URI = "mongodb+srv://enquiry_db_user:zcMmRkyRfoEuR8eM@cluster0.eethx9i.mongodb.net/service_portal?retryWrites=true&w=majority";

console.log("Connecting database to MongoDB...");
mongoose.connect(MONGO_URI).then(() => {
  console.log("Database connected to MongoDB successfully!");
}).catch(err => {
  console.error("Database MongoDB connection failed:", err);
});

class MongoDBWrapper {
  // --- Users & Auth ---
  async getUserByEmail(email) {
    if (!email) return null;
    return await User.findOne({ email: new RegExp('^' + email.trim() + '$', 'i') }).lean();
  }

  async createUser({ name, email, password, role = 'none', phone_number, verification_token }) {
    const lastUser = await User.findOne().sort({ id: -1 });
    const nextId = lastUser ? lastUser.id + 1 : 1;

    const newUser = new User({
      id: nextId,
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone_number,
      is_available: true,
      is_verified: !verification_token, // verified true if no verification_token
      verification_token
    });

    await newUser.save();
    return newUser.toObject();
  }

  async verifyUserByToken(token) {
    if (!token) return null;
    const user = await User.findOne({ verification_token: token });
    if (!user) return null;

    user.is_verified = true;
    user.verification_token = null;
    await user.save();
    return user.toObject();
  }

  async getUserById(id) {
    if (!id) return null;
    return await User.findOne({ id: parseInt(id) }).lean();
  }

  async getUsers() {
    return await User.find({}).lean();
  }

  async updateUserRole(id, role) {
    const user = await User.findOne({ id: parseInt(id) });
    if (!user) return null;
    user.role = role;
    await user.save();
    return user.toObject();
  }

  async deleteUser(id) {
    return await User.deleteOne({ id: parseInt(id) });
  }

  async getEngineers() {
    return await User.find({ role: 'engineer' }).lean();
  }

  // --- Companies & Products ---
  async getCompanies() {
    return await Company.find({}).lean();
  }

  async getCompanyByName(name) {
    if (!name) return null;
    return await Company.findOne({ name: new RegExp('^' + name.trim() + '$', 'i') }).lean();
  }

  async createCompany(name) {
    const existing = await this.getCompanyByName(name);
    if (existing) return existing;

    const lastCompany = await Company.findOne().sort({ id: -1 });
    const nextId = lastCompany ? lastCompany.id + 1 : 1;

    const newCompany = new Company({
      id: nextId,
      name: name.trim(),
      address: "Registered via WhatsApp Chatbot"
    });

    await newCompany.save();
    return newCompany.toObject();
  }

  async getProductsByCompany(companyId) {
    return await Product.find({ company_id: parseInt(companyId) }).lean();
  }

  async getProductById(productId) {
    return await Product.findOne({ id: parseInt(productId) }).lean();
  }

  // --- Tickets ---
  async getTickets() {
    const tickets = await Ticket.find({}).lean();
    const companies = await Company.find({}).lean();
    const products = await Product.find({}).lean();
    const users = await User.find({}).lean();

    return tickets.map(t => {
      const company = companies.find(c => c.id === t.company_id);
      const product = products.find(p => p.id === t.product_id);
      const engineer = users.find(u => u.id === t.assigned_engineer_id);
      return {
        ...t,
        company_name: company ? company.name : 'Unknown Company',
        product_name: t.product_name || (product ? product.product_name : 'N/A'),
        serial_number: t.serial_number || t.product_code || (product ? product.product_code : 'N/A'),
        eta_assigned: t.eta_assigned || null,
        eta_in_progress: t.eta_in_progress || null,
        eta_resolved: t.eta_resolved || null,
        assigned_at: t.assigned_at || null,
        in_progress_at: t.in_progress_at || null,
        resolved_at: t.resolved_at || null,
        internal_status: t.internal_status || 'Pending',
        engineer_name: engineer ? engineer.name : null,
        engineer_phone: engineer ? engineer.phone_number : null
      };
    });
  }

  async getTicketById(id) {
    const tickets = await this.getTickets();
    return tickets.find(t => t.id === parseInt(id));
  }

  async getTicketByNumber(ticketNumber) {
    if (!ticketNumber) return null;
    const tickets = await this.getTickets();
    return tickets.find(t => t.ticket_number.toLowerCase() === ticketNumber.trim().toLowerCase());
  }

  async getTicketsByClientWhatsapp(whatsapp) {
    if (!whatsapp) return [];
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    const tickets = await this.getTickets();
    return tickets.filter(t => t.client_whatsapp.replace(/\D/g, '') === cleanWhatsapp);
  }

  async createTicket({ company_id, product_id, product_name, client_whatsapp, client_email, description }) {
    const lastTicket = await Ticket.findOne().sort({ id: -1 });
    const nextId = lastTicket ? lastTicket.id + 1 : 1;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TIC-${dateStr}-${rand}`;

    const newTicket = new Ticket({
      id: nextId,
      ticket_number: ticketNumber,
      company_id: parseInt(company_id),
      product_id: product_id ? parseInt(product_id) : null,
      product_name: (product_name || '').trim(),
      serial_number: '',
      client_whatsapp,
      client_email: client_email || '',
      description,
      status: 'open',
      assigned_engineer_id: null,
      scheduled_slot: null,
      closed_at: null,
      is_escalated: false,
      eta_assigned: null,
      eta_in_progress: null,
      eta_resolved: null,
      assigned_at: null,
      in_progress_at: null,
      resolved_at: null,
      internal_status: 'Pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    await newTicket.save();
    return await this.getTicketById(newTicket.id);
  }

  async assignTicket(ticketId, engineerId, scheduledSlot, { eta_assigned, eta_in_progress, eta_resolved } = {}) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    ticket.assigned_engineer_id = parseInt(engineerId);
    ticket.scheduled_slot = new Date(scheduledSlot);
    ticket.status = 'assigned';
    ticket.assigned_at = new Date();
    ticket.updated_at = new Date();

    if (eta_assigned) ticket.eta_assigned = new Date(eta_assigned);
    if (eta_in_progress) ticket.eta_in_progress = new Date(eta_in_progress);
    if (eta_resolved) ticket.eta_resolved = new Date(eta_resolved);

    await ticket.save();

    // Create Service Log for assignment
    const engineer = await User.findOne({ id: parseInt(engineerId) });
    await this.createServiceLog({
      ticket_id: ticket.id,
      author_name: "System",
      comment: `Ticket assigned to Engineer: ${engineer ? engineer.name : 'Unknown'}. Scheduled visit: ${new Date(scheduledSlot).toLocaleString()}.`
    });

    return await this.getTicketById(ticket.id);
  }

  async updateTicketStatus(ticketId, status, authorId, authorName, { final_comments, service_form_image } = {}) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    ticket.status = status;
    ticket.updated_at = new Date();

    if (status === 'in_progress' && !ticket.in_progress_at) {
      ticket.in_progress_at = new Date();
    } else if (status === 'resolved') {
      ticket.resolved_at = new Date();
      if (final_comments) ticket.final_comments = final_comments;
      if (service_form_image) ticket.service_form_image = service_form_image;
    } else if (status === 'closed') {
      ticket.closed_at = new Date();
    }

    await ticket.save();

    // Add service log comment
    let comment = `Ticket status changed to ${status.toUpperCase()} by ${authorName}.`;
    if (status === 'resolved' && final_comments) {
      comment += ` Resolution comments: "${final_comments}"`;
      if (service_form_image) {
        comment += ` (Service Form Attachment uploaded)`;
      }
    }

    await this.createServiceLog({
      ticket_id: ticket.id,
      author_id: authorId,
      author_name: authorName,
      comment
    });

    return await this.getTicketById(ticket.id);
  }

  async editTicketDetails(ticketId, updates) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    const fields = [
      'product_name', 'serial_number', 'client_email',
      'client_whatsapp', 'description', 'eta_assigned', 'eta_in_progress', 'eta_resolved'
    ];

    let changes = [];
    fields.forEach(field => {
      if (updates[field] !== undefined) {
        let oldVal = ticket[field];
        let newVal = updates[field];

        // Format dates
        if (field.startsWith('eta_') && newVal) newVal = new Date(newVal);
        
        if (String(oldVal) !== String(newVal)) {
          ticket[field] = newVal;
          changes.push(`${field}: "${oldVal || 'N/A'}" -> "${newVal || 'N/A'}"`);
        }
      }
    });

    if (changes.length > 0) {
      ticket.updated_at = new Date();
      await ticket.save();

      await this.createServiceLog({
        ticket_id: ticket.id,
        author_name: "System (Manager Edit)",
        comment: `Ticket details updated: ${changes.join(', ')}`
      });
    }

    return await this.getTicketById(ticket.id);
  }

  async updateInternalStatus(ticketId, internalStatus) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    ticket.internal_status = internalStatus;
    ticket.updated_at = new Date();
    await ticket.save();

    await this.createServiceLog({
      ticket_id: ticket.id,
      author_name: "System",
      comment: `Internal payment status updated to: ${internalStatus}`
    });

    return await this.getTicketById(ticket.id);
  }

  async generateInvoice(ticketId, { sparePartsUsed, serviceCost, sparePartsCost, purchaseDate, totalAmount }) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    ticket.invoice_spare_parts = sparePartsUsed;
    ticket.invoice_service_cost = parseFloat(serviceCost || 0);
    ticket.invoice_spare_parts_cost = parseFloat(sparePartsCost || 0);
    ticket.invoice_total_amount = parseFloat(totalAmount || 0);
    ticket.purchase_date = new Date(purchaseDate);
    ticket.internal_status = 'Invoiced';
    ticket.updated_at = new Date();
    await ticket.save();

    const inWarranty = (parseFloat(totalAmount || 0) === parseFloat(sparePartsCost || 0));
    const comment = `Invoice generated by Service Manager. Spare parts: ${sparePartsUsed || 'None'} (Cost: Rs.${sparePartsCost || 0}). Service Cost: Rs.${serviceCost} (Warranty: ${inWarranty ? 'Active - Free' : 'Expired'}). Total Amount Charged: Rs.${totalAmount}.`;

    await this.createServiceLog({
      ticket_id: ticket.id,
      author_name: "System (Billing)",
      comment: comment
    });

    return await this.getTicketById(ticket.id);
  }

  async reopenTicket(ticketId) {
    const ticket = await Ticket.findOne({ id: parseInt(ticketId) });
    if (!ticket) return null;

    ticket.status = 'open';
    ticket.closed_at = null;
    ticket.resolved_at = null;
    ticket.final_comments = null;
    ticket.service_form_image = null;
    ticket.updated_at = new Date();
    await ticket.save();

    await this.createServiceLog({
      ticket_id: ticket.id,
      author_name: "System",
      comment: `Ticket reopened by client.`
    });

    return await this.getTicketById(ticket.id);
  }

  // --- Service Logs ---
  async getServiceLogs(ticketId) {
    return await ServiceLog.find({ ticket_id: parseInt(ticketId) }).sort({ created_at: 1 }).lean();
  }

  async createServiceLog({ ticket_id, author_id, author_name, comment }) {
    const lastLog = await ServiceLog.findOne().sort({ id: -1 });
    const nextId = lastLog ? lastLog.id + 1 : 1;

    const newLog = new ServiceLog({
      id: nextId,
      ticket_id: parseInt(ticket_id),
      author_id: author_id ? parseInt(author_id) : null,
      author_name,
      comment,
      created_at: new Date()
    });

    await newLog.save();
    return newLog.toObject();
  }

  // --- WhatsApp Messages ---
  async getWhatsAppMessages(number) {
    if (!number) return [];
    const cleanNumber = number.replace(/\D/g, '');
    return await WhatsAppMessage.find({ client_whatsapp: cleanNumber }).sort({ created_at: 1 }).lean();
  }

  async addWhatsAppMessage({ ticket_id, client_whatsapp, sender, message_text }) {
    const lastMsg = await WhatsAppMessage.findOne().sort({ id: -1 });
    const nextId = lastMsg ? lastMsg.id + 1 : 1;

    const newMsg = new WhatsAppMessage({
      id: nextId,
      ticket_id: ticket_id ? parseInt(ticket_id) : null,
      client_whatsapp: client_whatsapp.replace(/\D/g, ''),
      sender,
      message_text,
      created_at: new Date()
    });

    await newMsg.save();
    return newMsg.toObject();
  }

  // --- Bot State ---
  async getBotState(whatsapp) {
    const cleanNum = whatsapp.replace(/\D/g, '');
    const state = await BotState.findOne({ client_whatsapp: cleanNum }).lean();
    return state || { client_whatsapp: cleanNum, step: 'idle' };
  }

  async updateBotState(whatsapp, stateUpdates) {
    const cleanNum = whatsapp.replace(/\D/g, '');
    return await BotState.findOneAndUpdate(
      { client_whatsapp: cleanNum },
      stateUpdates,
      { new: true, upsert: true }
    ).lean();
  }

  async checkAndApplyEscalations() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const ticketsToEscalate = await Ticket.find({
      $or: [{ status: 'open' }, { assigned_engineer_id: null }],
      status: { $nin: ['closed', 'resolved'] },
      is_escalated: { $ne: true },
      created_at: { $lt: twentyFourHoursAgo }
    });

    if (ticketsToEscalate.length > 0) {
      for (const ticket of ticketsToEscalate) {
        ticket.is_escalated = true;
        ticket.updated_at = now;
        await ticket.save();

        await this.createServiceLog({
          ticket_id: ticket.id,
          author_name: "System (Escalation Engine)",
          comment: "ALERT: Ticket automatically escalated to Service Officer due to assignment delay exceeding 24 hours."
        });
      }
    }
  }
}

export const db = new MongoDBWrapper();
