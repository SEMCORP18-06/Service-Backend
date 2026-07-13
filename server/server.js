import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from './db.js';
import { Product } from './models.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: 'service@semcogroups.com',
    pass: 'S$@1!5&^86*'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Load .env manually if it exists
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
    console.log("Loaded environment variables from .env");
  }
} catch (e) {
  console.error("Error reading .env file:", e);
}

// Helper: Send Invoice Email to Client
// Helper: Create Invoice PDF Buffer
function createInvoicePDF(ticket) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Title / Header
      doc.fillColor('#06b6d4').fontSize(22).text('PRO-EQUIP SERVICE PORTAL', { align: 'center' });
      doc.fillColor('#718096').fontSize(10).text('PROCESS EQUIPMENT DIVISION', { align: 'center', letterSpacing: 2 });
      doc.moveDown(0.5);
      doc.fillColor('#333333').fontSize(14).text('INVOICE & SERVICE REPORT', { align: 'center' });
      doc.moveDown();

      // Horizontal Line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').lineWidth(1.5).stroke();
      doc.moveDown(1.5);

      // Invoice Meta / Info
      doc.fontSize(10).fillColor('#4a5568');
      doc.text(`Ticket Number:`, 50, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#1a202c').text(`  ${ticket.ticket_number}`).font('Helvetica');
      doc.fillColor('#4a5568').text(`Date of Issue:`, 50, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#1a202c').text(`  ${new Date().toLocaleDateString()}`).font('Helvetica');
      doc.fillColor('#4a5568').text(`Client Name:`, 50, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#1a202c').text(`  ${ticket.company_name}`).font('Helvetica');
      doc.fillColor('#4a5568').text(`Client Phone:`, 50, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#1a202c').text(`  ${ticket.client_whatsapp}`).font('Helvetica');
      doc.fillColor('#4a5568').text(`Client Email:`, 50, doc.y, { continued: true }).font('Helvetica-Bold').fillColor('#1a202c').text(`  ${ticket.client_email || 'N/A'}`).font('Helvetica');
      doc.moveDown(1.5);

      // Table Header
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 20).fill('#06b6d4');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Description / Item', 60, tableTop + 5, { width: 250 });
      doc.text('Warranty Status', 330, tableTop + 5, { width: 100, align: 'center' });
      doc.text('Amount (Rs.)', 450, tableTop + 5, { width: 90, align: 'right' });
      doc.font('Helvetica');
      
      // Table Row 1: Service Cost
      const row1Top = tableTop + 20;
      doc.rect(50, row1Top, 500, 25).fill('#f7fafc');
      doc.font('Helvetica').fillColor('#2d3748').fontSize(9);
      doc.text(`Technical Service Fee (${ticket.product_name})`, 60, row1Top + 8, { width: 250 });
      const inWarranty = ticket.invoice_total_amount === (ticket.invoice_spare_parts_cost || 0);
      doc.fillColor(inWarranty ? '#38a169' : '#e53e3e').font('Helvetica-Bold');
      doc.text(inWarranty ? 'Active (Free)' : 'Expired / None', 330, row1Top + 8, { width: 100, align: 'center' });
      const serviceCostCharged = inWarranty ? 0 : (ticket.invoice_service_cost || 0);
      doc.font('Helvetica').fillColor('#2d3748');
      doc.text(`Rs.${serviceCostCharged}.00`, 450, row1Top + 8, { width: 90, align: 'right' });

      // Table Row 2: Spare Parts Description
      const row2Top = row1Top + 25;
      doc.rect(50, row2Top, 500, 25).fill('#ffffff');
      doc.font('Helvetica').fillColor('#2d3748').fontSize(9);
      doc.text(`Spare Parts: ${ticket.invoice_spare_parts || 'None'}`, 60, row2Top + 8, { width: 250 });
      doc.font('Helvetica').fillColor('#718096');
      doc.text('-', 330, row2Top + 8, { width: 100, align: 'center' });
      doc.font('Helvetica').fillColor('#2d3748');
      doc.text(`Rs.${ticket.invoice_spare_parts_cost !== undefined ? ticket.invoice_spare_parts_cost : '0'}.00`, 450, row2Top + 8, { width: 90, align: 'right' });

      // Total Amount Row
      const totalTop = row2Top + 25;
      doc.rect(50, totalTop, 500, 25).fill('#edf2f7');
      doc.font('Helvetica-Bold').fillColor('#1a202c').fontSize(9.5);
      doc.text('TOTAL AMOUNT CHARGED:', 60, totalTop + 8, { width: 250 });
      doc.font('Helvetica-Bold').fillColor('#06b6d4');
      doc.text(`Rs.${ticket.invoice_total_amount !== undefined ? ticket.invoice_total_amount : '0'}.00`, 450, totalTop + 8, { width: 90, align: 'right' });
      doc.font('Helvetica'); // Reset font

      // Reset Y cursor position after absolute-positioned table
      const afterTableY = totalTop + 40;
      doc.y = afterTableY;

      // --- Resolution Notes Box ---
      const notesBoxTop = doc.y;
      const notesText = ticket.final_comments || 'No comments provided.';

      // Draw the notes container box
      doc.rect(50, notesBoxTop, 500, 70).lineWidth(0.5).strokeColor('#cbd5e0').fillAndStroke('#f7fafc', '#cbd5e0');

      // Notes heading with left accent bar
      doc.rect(50, notesBoxTop, 4, 70).fill('#06b6d4');

      // Section title
      doc.font('Helvetica-Bold').fillColor('#4a5568').fontSize(8);
      doc.text('ENGINEER RESOLUTION NOTES', 68, notesBoxTop + 10, { width: 470 });

      // Divider line inside box
      doc.moveTo(68, notesBoxTop + 24).lineTo(536, notesBoxTop + 24).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      // Notes content
      doc.font('Helvetica-Oblique').fillColor('#2d3748').fontSize(9);
      doc.text(`"${notesText}"`, 68, notesBoxTop + 32, { width: 460, lineGap: 3 });

      // Move cursor below notes box
      doc.y = notesBoxTop + 85;

      // --- Thank You Footer ---
      // Horizontal divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.y += 15;

      doc.font('Helvetica-Bold').fillColor('#06b6d4').fontSize(10);
      doc.text('Thank You for Choosing Pro-Equip!', 50, doc.y, { align: 'center', width: 500 });
      doc.moveDown(0.4);
      doc.font('Helvetica').fillColor('#a0aec0').fontSize(8);
      doc.text('If you have any inquiries regarding this invoice, please reach out to your Account Manager.', 50, doc.y, { align: 'center', width: 500 });
      doc.moveDown(0.3);
      doc.font('Helvetica').fillColor('#cbd5e0').fontSize(7);
      doc.text('This is a system-generated document. No signature is required.', 50, doc.y, { align: 'center', width: 500 });

      // End Document
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Helper: Send Service Report Email to Client
async function sendInvoiceEmail(ticket) {
  if (!ticket.client_email || !ticket.client_email.trim()) {
    console.warn(`[Mailer] Skipping service report email: Ticket ${ticket.ticket_number} has no client email address.`);
    return;
  }
  const attachments = [];
  
  // 1. Attach service form image if available
  if (ticket.service_form_image) {
    const match = ticket.service_form_image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const base64Data = match[2];
      const ext = contentType.split('/')[1] || 'png';
      
      attachments.push({
        filename: `service-form-${ticket.ticket_number}.${ext}`,
        content: Buffer.from(base64Data, 'base64'),
        contentType: contentType
      });
    }
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #edf2f7; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); color: #2d3748; line-height: 1.6;">
      
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 24px; font-weight: 800; color: #06b6d4; letter-spacing: 1px;">PRO-EQUIP</span>
        <div style="font-size: 11px; color: #718096; text-transform: uppercase; margin-top: 4px; letter-spacing: 2px; font-weight: 600;">Process Equipment Division</div>
      </div>

      <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 24px; border-radius: 10px; color: #ffffff; margin-bottom: 30px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Service Report</h2>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 6px; font-family: monospace;">Ticket: ${ticket.ticket_number}</div>
      </div>

      <p style="font-size: 15px; margin-top: 0; color: #4a5568;">Dear Valued Customer,</p>
      <p style="font-size: 14px; color: #4a5568; margin-bottom: 25px;">Your service request has been successfully closed. Please find your service form attached for your records.</p>
      
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #718096; margin-bottom: 12px; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; letter-spacing: 0.5px; font-weight: 700;">Client & Ticket Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; width: 150px;">Company Name:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #1a202c;">${ticket.company_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Equipment / Product:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #1a202c;">${ticket.product_name}</td>
          </tr>
          ${ticket.serial_number ? `
          <tr>
            <td style="padding: 6px 0; color: #718096;">Serial Number:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #1a202c;">${ticket.serial_number}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #718096;">Contact Email:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #1a202c; font-family: monospace;">${ticket.client_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Closed Date:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #1a202c;">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin-bottom: 30px;">
        <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #718096; margin-bottom: 6px; letter-spacing: 0.5px;">Engineer Resolution Comments</strong>
        <span style="color: #4a5568; font-size: 14px; line-height: 1.5; font-style: italic;">"${ticket.final_comments || 'No comments provided.'}"</span>
      </div>
      
      <p style="font-size: 14px; color: #4a5568; margin-top: 25px;">Thank you for your business!</p>
      
      <div style="color: #a0aec0; font-size: 11px; margin-top: 35px; border-top: 1px solid #edf2f7; padding-top: 15px; text-align: center; line-height: 1.4;">
        This is an automated service confirmation email. Please do not reply directly to this email.<br/>
        For inquiries or support, please contact your account manager.
      </div>
    </div>
  `;

  const mailOptions = {
    from: '"Pro-Equip Support" <service@semcogroups.com>',
    to: ticket.client_email,
    subject: `Service Report: Ticket ${ticket.ticket_number}`,
    html: htmlContent,
    attachments: attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Service report email sent: ${info.messageId} to ${ticket.client_email}`);
  } catch (error) {
    console.error("Error sending service report email:", error);
  }
}

// Helper: Send Signup Verification Link
async function sendVerificationEmail(user) {
  const verifyLink = `http://localhost:3001/api/auth/verify?token=${user.verification_token}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">Verify Your Email Address</h2>
      <p>Dear ${user.name},</p>
      <p>Thank you for registering a staff account on the Pro-Equip Support Portal. Please click the button below to verify your email and activate your account:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Account</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #06b6d4;">${verifyLink}</p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 10px;">
        If you did not initiate this registration request, please disregard this email.
      </p>
    </div>
  `;

  const mailOptions = {
    from: '"Pro-Equip Support" <service@semcogroups.com>',
    to: user.email,
    subject: "Verify Your Pro-Equip Staff Account",
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent: ${info.messageId} to ${user.email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Real-time connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`Client joined room: ticket_${ticketId}`);
  });

  socket.on('join_chat', (clientWhatsapp) => {
    const cleanNum = clientWhatsapp.replace(/\D/g, '');
    socket.join(`chat_${cleanNum}`);
    console.log(`Client joined room: chat_${cleanNum}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Helper: Broadcast to room
function broadcastLogUpdate(ticketId, log) {
  io.to(`ticket_${ticketId}`).emit('new_log', log);
  io.emit('ticket_updated', ticketId); // Notify global list
}

function broadcastWhatsAppMessage(clientWhatsapp, message) {
  const cleanNum = clientWhatsapp.replace(/\D/g, '');
  io.to(`chat_${cleanNum}`).emit('new_whatsapp_message', message);
  io.emit('global_chat_update', { clientWhatsapp: cleanNum, message });
}

// --- API Endpoints ---

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.toLowerCase().endsWith('@semcogroups.com')) {
    return res.status(400).json({ error: "Access denied. Only @semcogroups.com emails are authorized." });
  }

  try {
    const user = await db.getUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.is_verified === false) {
      return res.status(400).json({ error: "Your account is not verified yet. Please check your email for the verification link." });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number
      },
      token: `mock-jwt-token-for-user-${user.id}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 1b. Auth Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, phone_number } = req.body;

  if (!name || !email || !password || !role || !phone_number) {
    return res.status(400).json({ error: "All signup fields are required." });
  }

  if (!email.toLowerCase().endsWith('@semcogroups.com')) {
    return res.status(400).json({ error: "Access denied. Only @semcogroups.com emails are authorized." });
  }

  if (role !== 'manager' && role !== 'engineer') {
    return res.status(400).json({ error: "Invalid registration role." });
  }

  try {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email address is already registered." });
    }

    const verification_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newUser = await db.createUser({ name, email, password, role, phone_number, verification_token });
    
    sendVerificationEmail(newUser);

    res.status(201).json({
      message: "Registration successful! A verification email has been sent to your @semcogroups.com address. Please verify your account before logging in."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 1c. Auth Verify
app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send("Verification token is missing.");
  }

  try {
    const verifiedUser = await db.verifyUserByToken(token);
    if (!verifiedUser) {
      return res.status(400).send("Invalid or expired verification token.");
    }

    res.redirect('http://localhost:5173/?verified=true');
  } catch (err) {
    console.error(err);
    res.status(500).send("Verification failed.");
  }
});

// 2. Companies & Products
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await db.getCompanies();
    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve companies" });
  }
});

app.get('/api/companies/:id/products', async (req, res) => {
  const companyId = req.params.id;
  try {
    const products = await db.getProductsByCompany(companyId);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve products" });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve products" });
  }
});

// 3. Tickets
app.get('/api/tickets', async (req, res) => {
  const { whatsapp, engineerId } = req.query;
  try {
    let tickets = await db.getTickets();

    if (whatsapp) {
      tickets = await db.getTicketsByClientWhatsapp(whatsapp);
    } else if (engineerId) {
      tickets = tickets.filter(t => t.assigned_engineer_id === parseInt(engineerId));
    }

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve tickets" });
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve ticket" });
  }
});

app.post('/api/tickets', async (req, res) => {
  const { company_id, product_name, client_whatsapp, client_email, description } = req.body;

  if (!company_id || !product_name || !client_whatsapp || !client_email || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const ticket = await db.createTicket({
      company_id,
      product_name,
      client_whatsapp,
      client_email,
      description
    });

    await db.createServiceLog({
      ticket_id: ticket.id,
      author_name: "System",
      comment: "Ticket raised on portal."
    });

    io.emit('ticket_created', ticket);
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// Assign Engineer
app.patch('/api/tickets/:id/assign', async (req, res) => {
  const { engineerId, scheduledSlot, eta_assigned, eta_in_progress, eta_resolved } = req.body;
  if (!engineerId || !scheduledSlot) {
    return res.status(400).json({ error: "engineerId and scheduledSlot are required" });
  }

  try {
    const updatedTicket = await db.assignTicket(req.params.id, engineerId, scheduledSlot, {
      eta_assigned,
      eta_in_progress,
      eta_resolved
    });
    if (!updatedTicket) return res.status(404).json({ error: "Ticket not found" });

    const engineer = await db.getUserById(engineerId);

    const clientMsg = `Hello! Your service ticket ${updatedTicket.ticket_number} for "${updatedTicket.product_name}" has been assigned to our engineer, ${engineer.name} (Contact: ${engineer.phone_number}). They will visit you on ${new Date(scheduledSlot).toLocaleString()}.`;
    const botMsgClient = await db.addWhatsAppMessage({
      ticket_id: updatedTicket.id,
      client_whatsapp: updatedTicket.client_whatsapp,
      sender: 'bot',
      message_text: clientMsg
    });
    broadcastWhatsAppMessage(updatedTicket.client_whatsapp, botMsgClient);

    const engineerMsg = `New Ticket Assigned! Ticket: ${updatedTicket.ticket_number}. Client: ${updatedTicket.company_name}. Contact: ${updatedTicket.client_whatsapp}. Description: ${updatedTicket.description}. Slot: ${new Date(scheduledSlot).toLocaleString()}.`;
    await db.addWhatsAppMessage({
      ticket_id: updatedTicket.id,
      client_whatsapp: engineer.phone_number,
      sender: 'bot',
      message_text: engineerMsg
    });

    broadcastLogUpdate(updatedTicket.id, {
      author_name: "System",
      comment: `Automated WhatsApp notifications sent to Client (${updatedTicket.client_whatsapp}) and Engineer (${engineer.name}).`
    });

    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign engineer" });
  }
});

// Update Ticket Status
app.patch('/api/tickets/:id/status', async (req, res) => {
  const { status, authorId, author_id, authorName, author_name, final_comments, service_form_image } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });

  const finalAuthorId = authorId || author_id;
  const finalAuthorName = authorName || author_name;

  try {
    const updatedTicket = await db.updateTicketStatus(req.params.id, status, finalAuthorId, finalAuthorName, { final_comments, service_form_image });
    if (!updatedTicket) return res.status(404).json({ error: "Ticket not found" });

    if (status === 'resolved') {
      const resolveMsg = `Dear Client, your service ticket ${updatedTicket.ticket_number} for "${updatedTicket.product_name}" has been marked as RESOLVED by our engineer. Please review the service logs on the portal.`;
      const botMsg = await db.addWhatsAppMessage({
        ticket_id: updatedTicket.id,
        client_whatsapp: updatedTicket.client_whatsapp,
        sender: 'bot',
        message_text: resolveMsg
      });
      broadcastWhatsAppMessage(updatedTicket.client_whatsapp, botMsg);
    } else if (status === 'closed') {
      const closeMsg = `Dear Client, your service ticket ${updatedTicket.ticket_number} has been officially CLOSED. Thank you for choosing Pro-Equip Support!`;
      const botMsg = await db.addWhatsAppMessage({
        ticket_id: updatedTicket.id,
        client_whatsapp: updatedTicket.client_whatsapp,
        sender: 'bot',
        message_text: closeMsg
      });
      broadcastWhatsAppMessage(updatedTicket.client_whatsapp, botMsg);
      
      await sendInvoiceEmail(updatedTicket);
    }

    io.emit('ticket_updated', updatedTicket.id);
    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Update Ticket Details (Manager only)
app.patch('/api/tickets/:id', async (req, res) => {
  const { product_name, serial_number, client_email, client_whatsapp, description, eta_assigned, eta_in_progress, eta_resolved } = req.body;

  try {
    const updatedTicket = await db.editTicketDetails(req.params.id, {
      product_name,
      serial_number,
      client_email,
      client_whatsapp,
      description,
      eta_assigned,
      eta_in_progress,
      eta_resolved
    });

    if (!updatedTicket) return res.status(404).json({ error: "Ticket not found" });

    io.emit('ticket_updated', updatedTicket.id);
    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit ticket details" });
  }
});

// Update Ticket Internal Status (Manager / Senior Manager only)
app.patch('/api/tickets/:id/internal-status', async (req, res) => {
  const { internalStatus } = req.body;
  try {
    const updatedTicket = await db.updateInternalStatus(req.params.id, internalStatus);

    if (!updatedTicket) return res.status(404).json({ error: "Ticket not found" });

    io.emit('ticket_updated', updatedTicket.id);
    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update internal status" });
  }
});

// Generate Invoice for Ticket (Manager / Senior Manager only)
app.patch('/api/tickets/:id/invoice', async (req, res) => {
  const { sparePartsUsed, serviceCost, sparePartsCost, purchaseDate } = req.body;
  const ticketId = req.params.id;

  try {
    const ticket = await db.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    // Compute warranty eligibility (18 months)
    const purchase = new Date(purchaseDate);
    const created = new Date(ticket.created_at);
    let monthsDiff = (created.getFullYear() - purchase.getFullYear()) * 12 + (created.getMonth() - purchase.getMonth());
    if (created.getDate() < purchase.getDate()) {
      monthsDiff--;
    }
    const inWarranty = monthsDiff <= 18 && monthsDiff >= 0;
    const finalServiceCost = inWarranty ? 0 : parseFloat(serviceCost || 0);
    const finalSparePartsCost = parseFloat(sparePartsCost || 0);
    const totalAmount = finalServiceCost + finalSparePartsCost;

    const updatedTicket = await db.generateInvoice(ticketId, {
      sparePartsUsed,
      serviceCost,
      sparePartsCost,
      purchaseDate,
      totalAmount
    });

    io.emit('ticket_updated', updatedTicket.id);
    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

// Reopen Ticket (Client only, within 30 days of closure)
app.patch('/api/tickets/:id/reopen', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const ticket = await db.getTicketById(ticketId);

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (ticket.status !== 'closed') {
      return res.status(400).json({ error: "Only closed tickets can be reopened." });
    }

    if (ticket.closed_at) {
      const closedDate = new Date(ticket.closed_at);
      const diffTime = Math.abs(new Date() - closedDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        return res.status(400).json({ error: "Ticket cannot be reopened after 30 days of closure." });
      }
    }

    const updatedTicket = await db.reopenTicket(ticketId);

    const clientMsg = `Your ticket ${updatedTicket.ticket_number} has been successfully REOPENED. A Service Manager will review it shortly.`;
    const botMsg = await db.addWhatsAppMessage({
      ticket_id: updatedTicket.id,
      client_whatsapp: updatedTicket.client_whatsapp,
      sender: 'bot',
      message_text: clientMsg
    });
    broadcastWhatsAppMessage(updatedTicket.client_whatsapp, botMsg);

    io.emit('ticket_updated', updatedTicket.id);
    res.json(updatedTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reopen ticket" });
  }
});

// 4. Service Logs
app.get('/api/tickets/:id/logs', async (req, res) => {
  try {
    const logs = await db.getServiceLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve logs" });
  }
});

app.post('/api/tickets/:id/logs', async (req, res) => {
  const { author_id, author_name, comment } = req.body;
  if (!comment || !author_name) {
    return res.status(400).json({ error: "comment and author_name are required" });
  }

  try {
    const log = await db.createServiceLog({
      ticket_id: req.params.id,
      author_id,
      author_name,
      comment
    });

    broadcastLogUpdate(req.params.id, log);
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create log" });
  }
});

// 5. Engineers List (for dropdown selection)
app.get('/api/engineers', async (req, res) => {
  try {
    const engineers = await db.getEngineers();
    res.json(engineers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve engineers" });
  }
});

// 6. WhatsApp Messages history
app.get('/api/whatsapp/messages/:number', async (req, res) => {
  try {
    const messages = await db.getWhatsAppMessages(req.params.number);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve whatsapp messages" });
  }
});

// Send live message via Meta Graph API if active
async function sendLiveWhatsAppMessage(toNumber, textBody) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.log(`[WhatsApp Live] Skipped sending (meta credentials not configured in environment)`);
    return;
  }

  // Normalize number (remove non-digits)
  const cleanNumber = toNumber.replace(/\D/g, '');

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: cleanNumber,
    type: "text",
    text: { body: textBody }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[WhatsApp Live Error] Meta responded with ${res.status}:`, JSON.stringify(data));
    } else {
      console.log(`[WhatsApp Live] Message sent successfully to ${cleanNumber}:`, data.messages?.[0]?.id);
    }
  } catch (err) {
    console.error(`[WhatsApp Live Error] Fetch failed:`, err.message);
  }
}

// Manager directly sending WhatsApp message to Client from portal
app.post('/api/whatsapp/send', async (req, res) => {
  const { ticket_id, client_whatsapp, message_text } = req.body;
  if (!client_whatsapp || !message_text) {
    return res.status(400).json({ error: "client_whatsapp and message_text are required" });
  }

  try {
    const newMessage = await db.addWhatsAppMessage({
      ticket_id,
      client_whatsapp,
      sender: 'manager',
      message_text
    });

    broadcastWhatsAppMessage(client_whatsapp, newMessage);

    // Send Live message to Client's phone if configured
    await sendLiveWhatsAppMessage(client_whatsapp, message_text);

    if (ticket_id) {
      const log = await db.createServiceLog({
        ticket_id,
        author_name: "Sanjay Kumar (Manager)",
        comment: `Direct WhatsApp message sent to Client: "${message_text}"`
      });
      broadcastLogUpdate(ticket_id, log);
    }

    res.json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get current WhatsApp Chatbot State & available products
app.get('/api/whatsapp/state/:number', async (req, res) => {
  const number = req.params.number;
  try {
    const state = await db.getBotState(number);
    const products = await Product.find({}).lean();
    res.json({ state, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve WhatsApp state" });
  }
});

// Official WhatsApp Webhook Verification (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const localVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'semcorp_token_2026';

  if (mode === 'subscribe' && token === localVerifyToken) {
    console.log('[Webhook] Verification successful!');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed: token mismatch or incorrect mode');
    res.sendStatus(403);
  }
});

// Official WhatsApp Webhook Listener (POST)
app.post('/api/whatsapp/webhook', async (req, res) => {
  const body = req.body;

  // Check if this is a WhatsApp API webhook event
  if (body.object === 'whatsapp_business_account') {
    try {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        const message = body.entry[0].changes[0].value.messages[0];
        const client_whatsapp = '+' + message.from;
        let message_text = "";

        if (message.type === 'text') {
          message_text = message.text.body;
        } else if (message.type === 'interactive' && message.interactive.list_reply) {
          message_text = message.interactive.list_reply.title;
        }

        if (message_text) {
          console.log(`[Webhook] Inbound message from ${client_whatsapp}: "${message_text}"`);
          await handleInboundMessage(client_whatsapp, message_text, true);
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error("[Webhook Error] Failed to process message:", err);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(404);
  }
});

// Centralized Engine: Handle WhatsApp chatbot message flow
async function handleInboundMessage(client_whatsapp, message_text, isLive = false) {
  // Save the client's message
  const clientMsgObj = await db.addWhatsAppMessage({
    client_whatsapp,
    sender: 'client',
    message_text
  });
  broadcastWhatsAppMessage(client_whatsapp, clientMsgObj);

  // Run the bot AI state machine
  const state = await db.getBotState(client_whatsapp);
  const normalizedMsg = message_text.trim().toLowerCase();

  let botReply = "";
  let nextState = { ...state };

  if (normalizedMsg === 'hi' || normalizedMsg === 'hello' || normalizedMsg === 'menu') {
    botReply = `Welcome to the Process Equipment Service Portal!\n\nPlease select an option:\n1. Track a Ticket\n2. Raise a New Ticket\n\n(Reply with the number 1 or 2)`;
    nextState = { step: 'menu' };
  } else {
    switch (state.step) {
      case 'menu':
        if (normalizedMsg === '1') {
          botReply = `Please reply with your Ticket Number (e.g., TIC-2026-1234).`;
          nextState = { step: 'tracking' };
        } else if (normalizedMsg === '2') {
          botReply = `Let's raise a new ticket. Please enter your Company Name.`;
          nextState = { step: 'raising_company' };
        } else {
          botReply = `Invalid choice. Please reply with "1" to Track a Ticket, or "2" to Raise a New Ticket.`;
        }
        break;

      case 'tracking':
        const ticket = await db.getTicketByNumber(message_text.trim());
        if (ticket) {
          botReply = `Ticket Details Found:\n----------------------\n🎫 No: ${ticket.ticket_number}\n🏢 Company: ${ticket.company_name}\n🔧 Product: ${ticket.product_name} (${ticket.product_code})\n📌 Status: ${ticket.status.toUpperCase()}\n👨 Engineer: ${ticket.engineer_name || 'Not Assigned yet'}\n📅 Visit slot: ${ticket.scheduled_slot ? new Date(ticket.scheduled_slot).toLocaleString() : 'N/A'}\n\nTo return to main menu, reply "menu".`;
          nextState = { step: 'idle' };
        } else {
          botReply = `Sorry, I couldn't find a ticket with number "${message_text.trim()}". Please try again, or reply "menu" to restart.`;
        }
        break;

      case 'raising_company':
        const typedCompanyName = message_text.trim();
        const company = await db.createCompany(typedCompanyName);
        
        let companyProducts = await Product.find({}).lean();
        const otherOption = { id: 999, product_name: "Other (Enter Manually)", product_code: "OTHER" };
        const allOptions = [...companyProducts, otherOption];
        const productListText = allOptions.map((p, i) => `${i + 1}. ${p.product_name}`).join("\n");

        botReply = `Thank you, "${company.name}" has been registered.\n\nPlease select the Product:\n\n${productListText}\n\n(Reply with the option number or select "Other")`;
        nextState = { 
          step: 'raising_product', 
          company_id: company.id, 
          company_name: company.name 
        };
        break;

      case 'raising_product':
        let companyProductsList = await Product.find({}).lean();
        const otherOpt = { id: 999, product_name: "Other (Enter Manually)", product_code: "OTHER" };
        const allOpts = [...companyProductsList, otherOpt];

        let choiceIdx = -1;
        const numInput = parseInt(message_text.trim());
        if (!isNaN(numInput)) {
          choiceIdx = numInput - 1;
        } else {
          // Match by product name (case-insensitive contains)
          choiceIdx = allOpts.findIndex(p => 
            p.product_name.toLowerCase().includes(normalizedMsg) ||
            normalizedMsg.includes(p.product_name.toLowerCase()) ||
            p.product_code.toLowerCase().includes(normalizedMsg)
          );
        }

        if (choiceIdx >= 0 && choiceIdx < allOpts.length) {
          const selectedProduct = allOpts[choiceIdx];
          
          if (selectedProduct.id === 999) {
            botReply = `Please type/enter your product name manually:`;
            nextState = { 
              ...state, 
              step: 'raising_product_other' 
            };
          } else {
            botReply = `Selected: ${selectedProduct.product_name}.\n\nFinally, please describe the problem/complaint you are facing with the equipment.`;
            const clientEmail = "";
            nextState = { 
              ...state, 
              step: 'raising_desc', 
              product_id: selectedProduct.id, 
              product_name: selectedProduct.product_name,
              client_email: clientEmail
            };
          }
        } else {
          const allOptionsListText = allOpts.map((p, i) => `${i + 1}. ${p.product_name}`).join("\n");
          botReply = `Invalid product selection. Please select a valid option:\n\n${allOptionsListText}`;
        }
        break;

      case 'raising_product_other':
        const manualName = message_text.trim();
        if (manualName.length > 0) {
          botReply = `Selected: ${manualName}.\n\nFinally, please describe the problem/complaint you are facing with the equipment.`;
          nextState = {
            ...state,
            step: 'raising_desc',
            product_id: null,
            product_name: manualName,
            client_email: ""
          };
        } else {
          botReply = `Please enter a valid product name:`;
        }
        break;

      case 'raising_email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailInput = message_text.trim();
        if (emailRegex.test(emailInput)) {
          botReply = `Got it. Finally, please describe the problem/complaint you are facing with the equipment.`;
          nextState = { 
            ...state, 
            step: 'raising_desc', 
            client_email: emailInput 
          };
        } else {
          botReply = `Please enter a valid email address (e.g. client@company.com).`;
        }
        break;

      case 'raising_desc':
        const problemDesc = message_text.trim();
        const newTicket = await db.createTicket({
          company_id: state.company_id,
          product_id: state.product_id,
          product_name: state.product_name,
          client_whatsapp,
          client_email: state.client_email,
          description: problemDesc
        });

        await db.createServiceLog({
          ticket_id: newTicket.id,
          author_name: "System",
          comment: `Ticket raised via WhatsApp Chatbot.`
        });

        botReply = `🎉 Ticket Created Successfully!\n----------------------\n🎫 Ticket No: ${newTicket.ticket_number}\n🏢 Company: ${state.company_name}\n🔧 Product: ${state.product_name}\n📌 Status: Open (Awaiting Manager assignment)\n\nWe will update you here as soon as an engineer is assigned. Reply "menu" to restart.`;
        nextState = { step: 'idle' };
        
        io.emit('ticket_created', newTicket);
        break;

      default:
        botReply = `Hi! I'm the Process Equipment Service Bot. Send "Hi" or "menu" to see options.`;
        nextState = { step: 'idle' };
    }
  }

  await db.updateBotState(client_whatsapp, nextState);

  // Save and broadcast bot response
  const botMsgObj = await db.addWhatsAppMessage({
    client_whatsapp,
    sender: 'bot',
    message_text: botReply
  });
  broadcastWhatsAppMessage(client_whatsapp, botMsgObj);

  // If live WhatsApp message, deliver response directly to customer's device
  if (isLive) {
    await sendLiveWhatsAppMessage(client_whatsapp, botReply);
  }

  return clientMsgObj;
}

// Inbound message simulator endpoint
app.post('/api/whatsapp/simulate', async (req, res) => {
  const { client_whatsapp, message_text } = req.body;
  if (!client_whatsapp || !message_text) {
    return res.status(400).json({ error: "client_whatsapp and message_text are required" });
  }

  try {
    const clientMsg = await handleInboundMessage(client_whatsapp, message_text, false);
    res.json({ status: "success", clientMsg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Simulation failed" });
  }
});

// Escalation engine runner
const runEscalationEngine = async () => {
  try {
    await db.checkAndApplyEscalations();
    io.emit('escalation_check_complete');
  } catch (err) {
    console.error("Error in escalation engine:", err);
  }
};

// Check immediately on startup
setTimeout(runEscalationEngine, 1000);
// Check every 30 seconds
setInterval(runEscalationEngine, 30000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
