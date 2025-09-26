import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface CreditRechargeRequest {
  amount: number;
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet';
  gatewayTransactionId?: string;
  description?: string;
}

interface CreditRechargeResponse {
  transactionId: number;
  walletId: number;
  amount: number;
  newBalance: number;
  status: string;
  gatewayTransactionId?: string;
}

interface BulkCreditRequest {
  userIds: number[];
  amount: number;
  description: string;
  referenceType?: string;
  referenceId?: number;
}

interface CreditAdjustmentRequest {
  userId: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  reason: string;
  adminNotes?: string;
}

// Recharge wallet with credits
export const rechargeCredits = api<CreditRechargeRequest, CreditRechargeResponse>(
  { auth: true, expose: true, method: "POST", path: "/payments/recharge" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate input
    if (!req.amount || req.amount <= 0) {
      throw APIError.invalidArgument("Amount must be greater than 0");
    }
    
    if (req.amount > 1000000) { // Max 10 lakh per transaction
      throw APIError.invalidArgument("Amount cannot exceed ₹10,00,000 per transaction");
    }

    try {
      // Start transaction
      const result = await db.tx(async (tx) => {
        // Get or create wallet
        let wallet = await tx.queryRow`
          SELECT * FROM wallets WHERE user_id = ${auth.userID} FOR UPDATE
        `;

        if (!wallet) {
          wallet = await tx.queryRow`
            INSERT INTO wallets (user_id, balance, total_earned, total_spent)
            VALUES (${auth.userID}, 0, 0, 0)
            RETURNING *
          `;
        }

        // Create transaction record
        const transaction = await tx.queryRow`
          INSERT INTO transactions (
            wallet_id, type, amount, description, reference_type, reference_id,
            status, payment_method, gateway_transaction_id
          ) VALUES (
            ${wallet.id}, 'credit', ${req.amount}, ${req.description || 'Wallet recharge'},
            'recharge', NULL, 'completed', ${req.paymentMethod}, ${req.gatewayTransactionId}
          ) RETURNING *
        `;

        // Update wallet balance
        const updatedWallet = await tx.queryRow`
          UPDATE wallets 
          SET 
            balance = balance + ${req.amount},
            total_earned = total_earned + ${req.amount},
            updated_at = NOW()
          WHERE id = ${wallet.id}
          RETURNING *
        `;

        return { transaction, wallet: updatedWallet };
      });

      // Log analytics event
      await db.exec`
        INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties)
        VALUES (
          'wallet_recharge', ${auth.userID}, 'transaction', ${result.transaction.id},
          ${JSON.stringify({ amount: req.amount, method: req.paymentMethod })}
        )
      `;

      // Create notification
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (
          ${auth.userID},
          'Wallet Recharged Successfully',
          'Your wallet has been recharged with ₹${req.amount}. New balance: ₹${result.wallet.balance}',
          'wallet_credit',
          'transaction',
          ${result.transaction.id}
        )
      `;

      return {
        transactionId: result.transaction.id,
        walletId: result.wallet.id,
        amount: req.amount,
        newBalance: result.wallet.balance,
        status: result.transaction.status,
        gatewayTransactionId: req.gatewayTransactionId
      };

    } catch (error) {
      console.error('Credit recharge error:', error);
      throw APIError.internal("Failed to process credit recharge", error as Error);
    }
  }
);

// Admin: Bulk credit addition for multiple users
export const bulkCreditAddition = api<BulkCreditRequest, { processedCount: number; failedCount: number }>(
  { auth: true, expose: true, method: "POST", path: "/payments/bulk-credit" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('finance.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    if (!req.userIds.length || req.amount <= 0) {
      throw APIError.invalidArgument("Invalid user IDs or amount");
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const userId of req.userIds) {
      try {
        await db.tx(async (tx) => {
          // Get or create wallet
          let wallet = await tx.queryRow`
            SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
          `;

          if (!wallet) {
            wallet = await tx.queryRow`
              INSERT INTO wallets (user_id, balance, total_earned, total_spent)
              VALUES (${userId}, 0, 0, 0)
              RETURNING *
            `;
          }

          // Create transaction
          await tx.exec`
            INSERT INTO transactions (
              wallet_id, type, amount, description, reference_type, reference_id, status
            ) VALUES (
              ${wallet.id}, 'credit', ${req.amount}, ${req.description},
              ${req.referenceType || 'admin_credit'}, ${req.referenceId}, 'completed'
            )
          `;

          // Update wallet
          await tx.exec`
            UPDATE wallets 
            SET 
              balance = balance + ${req.amount},
              total_earned = total_earned + ${req.amount},
              updated_at = NOW()
            WHERE id = ${wallet.id}
          `;

          // Create notification
          await tx.exec`
            INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
            VALUES (
              ${userId},
              'Credit Added to Wallet',
              'Admin has added ₹${req.amount} to your wallet. Reason: ${req.description}',
              'admin_credit',
              'wallet',
              ${wallet.id}
            )
          `;
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to add credit for user ${userId}:`, error);
        failedCount++;
      }
    }

    // Log bulk operation
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, properties)
      VALUES (
        'bulk_credit_addition', ${auth.userID},
        ${JSON.stringify({ 
          userCount: req.userIds.length, 
          amount: req.amount, 
          processedCount, 
          failedCount 
        })}
      )
    `;

    return { processedCount, failedCount };
  }
);

// Admin: Credit adjustment (add/deduct credits)
export const adjustCredits = api<CreditAdjustmentRequest, { success: boolean; newBalance: number }>(
  { auth: true, expose: true, method: "POST", path: "/payments/adjust-credits" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('finance.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    if (!req.amount || req.amount <= 0) {
      throw APIError.invalidArgument("Amount must be greater than 0");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Get wallet
        const wallet = await tx.queryRow`
          SELECT * FROM wallets WHERE user_id = ${req.userId} FOR UPDATE
        `;

        if (!wallet) {
          throw APIError.notFound("User wallet not found");
        }

        // Check if debit amount is available
        if (req.type === 'debit' && wallet.balance < req.amount) {
          throw APIError.invalidArgument("Insufficient wallet balance");
        }

        // Create transaction
        const transaction = await tx.queryRow`
          INSERT INTO transactions (
            wallet_id, type, amount, description, reference_type, status
          ) VALUES (
            ${wallet.id}, ${req.type}, ${req.amount}, 
            'Admin adjustment: ${req.description}', 'admin_adjustment', 'completed'
          ) RETURNING *
        `;

        // Update wallet balance
        const balanceChange = req.type === 'credit' ? req.amount : -req.amount;
        const updatedWallet = await tx.queryRow`
          UPDATE wallets 
          SET 
            balance = balance + ${balanceChange},
            ${req.type === 'credit' ? 'total_earned = total_earned + $1' : 'total_spent = total_spent + $1'},
            updated_at = NOW()
          WHERE id = ${wallet.id}
          RETURNING *
        `;

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, 
            old_values, new_values, ip_address
          ) VALUES (
            ${auth.userID}, 'credit_adjustment', 'wallet', ${wallet.id},
            ${JSON.stringify({ balance: wallet.balance })},
            ${JSON.stringify({ 
              balance: updatedWallet.balance, 
              adjustment: req.amount, 
              type: req.type,
              reason: req.reason,
              notes: req.adminNotes 
            })},
            NULL
          )
        `;

        return { transaction, wallet: updatedWallet };
      });

      // Create notification for user
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (
          ${req.userId},
          'Wallet ${req.type === 'credit' ? 'Credit' : 'Debit'} Adjustment',
          'Admin has ${req.type === 'credit' ? 'added' : 'deducted'} ₹${req.amount} ${req.type === 'credit' ? 'to' : 'from'} your wallet. Reason: ${req.description}',
          'admin_adjustment',
          'transaction',
          ${result.transaction.id}
        )
      `;

      return {
        success: true,
        newBalance: result.wallet.balance
      };

    } catch (error) {
      console.error('Credit adjustment error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to adjust credits");
    }
  }
);

// Get wallet transaction history with detailed filtering
export const getTransactionHistory = api(
  { auth: true, expose: true, method: "GET", path: "/payments/transactions" },
  async () => {
    const auth = getAuthData()!;
    
    const transactions = await db.queryAll`
      SELECT 
        t.*,
        w.user_id
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ${auth.userID}
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        referenceType: t.reference_type,
        referenceId: t.reference_id,
        status: t.status,
        paymentMethod: t.payment_method,
        gatewayTransactionId: t.gateway_transaction_id,
        createdAt: t.created_at
      }))
    };
  }
);