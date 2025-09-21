import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Payment {
  id: number;
  project_id: number;
  amount: number;
  payment_type: string;
  status: string;
  due_date?: Date;
  paid_date?: Date;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  status: string;
  payment_method?: string;
  gateway_transaction_id?: string;
  created_at: Date;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentRequest {
  project_id: number;
  amount: number;
  payment_type: 'advance' | 'milestone' | 'final';
  due_date?: Date;
  notes?: string;
}

export interface ProcessPaymentRequest {
  payment_id: number;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
}

export interface WalletTransactionRequest {
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  reference_type?: string;
  reference_id?: number;
  payment_method?: string;
}

export interface PaymentSummary {
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  payment_count: number;
}

export const createPayment = api<CreatePaymentRequest, Payment>(
  { auth: true, expose: true, method: "POST", path: "/payments" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check if user can create payments
    if (!auth.permissions.includes('finance.manage') && !auth.permissions.includes('projects.manage')) {
      throw APIError.forbidden("Access denied to create payments");
    }

    // Validate project exists and user has access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${req.project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const userId = parseInt(auth.userID);
    const hasProjectAccess = project.client_id === userId || 
                            project.designer_id === userId || 
                            project.project_manager_id === userId ||
                            auth.permissions.includes('projects.manage');

    if (!hasProjectAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    // Validate amount
    if (req.amount <= 0) {
      throw APIError.badRequest("Payment amount must be positive");
    }

    const payment = await db.queryRow<Payment>`
      INSERT INTO payments (project_id, amount, payment_type, due_date, notes)
      VALUES (${req.project_id}, ${req.amount}, ${req.payment_type}, ${req.due_date}, ${req.notes})
      RETURNING *
    `;

    if (!payment) {
      throw APIError.internal("Failed to create payment");
    }

    return payment;
  }
);

export const getProjectPayments = api<{ 
  project_id: number;
  status?: string;
}, { payments: Payment[]; summary: PaymentSummary }>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/payments" },
  async ({ project_id, status }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check project access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const hasAccess = project.client_id === userId || 
                     project.designer_id === userId || 
                     project.project_manager_id === userId ||
                     auth.permissions.includes('finance.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    let whereClause = "WHERE project_id = $1";
    const params = [project_id];

    if (status) {
      whereClause += " AND status = $2";
      params.push(status);
    }

    const paymentsQuery = db.rawQuery<Payment>(`
      SELECT * FROM payments
      ${whereClause}
      ORDER BY due_date ASC, created_at DESC
    `, ...params);

    const payments: Payment[] = [];
    for await (const payment of paymentsQuery) {
      payments.push(payment);
    }

    // Calculate summary
    const summaryResult = await db.queryRow<PaymentSummary>`
      SELECT 
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'pending' AND due_date < NOW() THEN amount ELSE 0 END) as overdue_amount,
        COUNT(*) as payment_count
      FROM payments
      WHERE project_id = ${project_id}
    `;

    const summary: PaymentSummary = {
      total_amount: summaryResult?.total_amount || 0,
      paid_amount: summaryResult?.paid_amount || 0,
      pending_amount: summaryResult?.pending_amount || 0,
      overdue_amount: summaryResult?.overdue_amount || 0,
      payment_count: summaryResult?.payment_count || 0
    };

    return { payments, summary };
  }
);

export const processPayment = api<ProcessPaymentRequest, Payment>(
  { auth: true, expose: true, method: "POST", path: "/payments/process" },
  async (req) => {
    const auth = getAuthData()!;

    // Check if user can process payments
    if (!auth.permissions.includes('finance.manage')) {
      throw APIError.forbidden("Access denied to process payments");
    }

    const payment = await db.queryRow<Payment>`
      SELECT * FROM payments WHERE id = ${req.payment_id} AND status = 'pending'
    `;

    if (!payment) {
      throw APIError.notFound("Payment not found or already processed");
    }

    // Update payment status
    const updatedPayment = await db.queryRow<Payment>`
      UPDATE payments
      SET status = 'completed', paid_date = NOW(), payment_method = ${req.payment_method}, 
          transaction_id = ${req.transaction_id}, notes = COALESCE(${req.notes}, notes)
      WHERE id = ${req.payment_id}
      RETURNING *
    `;

    if (!updatedPayment) {
      throw APIError.internal("Failed to process payment");
    }

    // Create transaction record for tracking
    await db.exec`
      INSERT INTO transactions (wallet_id, type, amount, description, reference_type, reference_id, payment_method, gateway_transaction_id)
      SELECT w.id, 'credit', ${payment.amount}, 'Payment received', 'payment', ${payment.id}, ${req.payment_method}, ${req.transaction_id}
      FROM wallets w
      JOIN projects p ON w.user_id = p.designer_id OR w.user_id = p.project_manager_id
      WHERE p.id = ${payment.project_id}
      LIMIT 1
    `;

    return updatedPayment;
  }
);

export const getUserWallet = api<{ user_id?: number }, Wallet>(
  { auth: true, expose: true, method: "GET", path: "/wallet" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view wallet
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('finance.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to view wallet");
    }

    const wallet = await db.queryRow<Wallet>`
      SELECT * FROM wallets WHERE user_id = ${targetUserId}
    `;

    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = await db.queryRow<Wallet>`
        INSERT INTO wallets (user_id) VALUES (${targetUserId})
        RETURNING *
      `;
      
      if (!newWallet) {
        throw APIError.internal("Failed to create wallet");
      }
      
      return newWallet;
    }

    return wallet;
  }
);

export const getWalletTransactions = api<{ 
  user_id?: number;
  limit?: number;
  offset?: number;
  type?: string;
}, { transactions: Transaction[]; total_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/wallet/transactions" },
  async ({ user_id, limit = 20, offset = 0, type }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view transactions
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('finance.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to view transactions");
    }

    const wallet = await db.queryRow<{ id: number }>`
      SELECT id FROM wallets WHERE user_id = ${targetUserId}
    `;

    if (!wallet) {
      return { transactions: [], total_count: 0 };
    }

    let whereClause = "WHERE wallet_id = $1";
    const params = [wallet.id, limit, offset];
    let paramIndex = 4;

    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.splice(-2, 0, type);
    }

    const transactionsQuery = db.rawQuery<Transaction>(`
      SELECT * FROM transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex - 2} OFFSET $${paramIndex - 1}
    `, ...params);

    const transactions: Transaction[] = [];
    for await (const transaction of transactionsQuery) {
      transactions.push(transaction);
    }

    const countResult = await db.rawQueryRow<{ count: number }>(`
      SELECT COUNT(*) as count FROM transactions ${whereClause.replace(/LIMIT.*$/, '')}
    `, ...params.slice(0, -2));

    return {
      transactions,
      total_count: countResult?.count || 0
    };
  }
);

export const createWalletTransaction = api<WalletTransactionRequest, Transaction>(
  { auth: true, expose: true, method: "POST", path: "/wallet/transactions" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check if user can create transactions
    if (!auth.permissions.includes('finance.manage')) {
      throw APIError.forbidden("Access denied to create transactions");
    }

    if (req.amount <= 0) {
      throw APIError.badRequest("Transaction amount must be positive");
    }

    const wallet = await db.queryRow<{ id: number; balance: number }>`
      SELECT id, balance FROM wallets WHERE user_id = ${userId}
    `;

    if (!wallet) {
      throw APIError.notFound("Wallet not found");
    }

    // Check if debit amount is available
    if (req.type === 'debit' && wallet.balance < req.amount) {
      throw APIError.badRequest("Insufficient wallet balance");
    }

    // Create transaction
    const transaction = await db.queryRow<Transaction>`
      INSERT INTO transactions (
        wallet_id, type, amount, description, reference_type, reference_id, payment_method
      ) VALUES (
        ${wallet.id}, ${req.type}, ${req.amount}, ${req.description}, 
        ${req.reference_type}, ${req.reference_id}, ${req.payment_method}
      ) RETURNING *
    `;

    if (!transaction) {
      throw APIError.internal("Failed to create transaction");
    }

    // Update wallet balance
    const balanceChange = req.type === 'credit' ? req.amount : -req.amount;
    const totalField = req.type === 'credit' ? 'total_earned' : 'total_spent';

    await db.exec`
      UPDATE wallets 
      SET balance = balance + ${balanceChange},
          ${totalField} = ${totalField} + ${req.amount}
      WHERE id = ${wallet.id}
    `;

    return transaction;
  }
);

export const getFinancialSummary = api<{ 
  user_id?: number;
  start_date?: Date;
  end_date?: Date;
}, { 
  wallet_balance: number;
  total_earned: number;
  total_spent: number;
  pending_payments: number;
  completed_payments: number;
  project_earnings: number;
}>(
  { auth: true, expose: true, method: "GET", path: "/finance/summary" },
  async ({ user_id, start_date, end_date }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view financial summary
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('finance.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to view financial summary");
    }

    // Get wallet info
    const wallet = await db.queryRow<{ balance: number; total_earned: number; total_spent: number }>`
      SELECT balance, total_earned, total_spent FROM wallets WHERE user_id = ${targetUserId}
    `;

    // Get payment summary
    let dateFilter = "";
    const params = [targetUserId];
    if (start_date && end_date) {
      dateFilter = "AND p.created_at BETWEEN $2 AND $3";
      params.push(start_date, end_date);
    }

    const paymentSummary = await db.rawQueryRow<{
      pending_payments: number;
      completed_payments: number;
      project_earnings: number;
    }>(`
      SELECT 
        SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) as pending_payments,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as completed_payments,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as project_earnings
      FROM payments p
      JOIN projects pr ON p.project_id = pr.id
      WHERE (pr.designer_id = $1 OR pr.project_manager_id = $1)
      ${dateFilter}
    `, ...params);

    return {
      wallet_balance: wallet?.balance || 0,
      total_earned: wallet?.total_earned || 0,
      total_spent: wallet?.total_spent || 0,
      pending_payments: paymentSummary?.pending_payments || 0,
      completed_payments: paymentSummary?.completed_payments || 0,
      project_earnings: paymentSummary?.project_earnings || 0
    };
  }
);