import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface Wallet {
  id: number;
  userId: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isActive: boolean;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
}

interface WalletResponse {
  wallet: Wallet;
  recentTransactions: Transaction[];
}

// Gets the user's wallet information and recent transactions
export const getWallet = api<void, WalletResponse>(
  { auth: true, expose: true, method: "GET", path: "/payments/wallet" },
  async () => {
    const auth = getAuthData()!;
    
    // Get or create wallet
    let wallet = await db.queryRow`
      SELECT * FROM wallets WHERE user_id = ${auth.userID}
    `;

    if (!wallet) {
      wallet = await db.queryRow`
        INSERT INTO wallets (user_id) VALUES (${auth.userID}) RETURNING *
      `;
    }

    if (!wallet) {
      throw APIError.internal("Failed to get wallet");
    }

    // Get recent transactions
    const transactions = await db.queryAll`
      SELECT id, type, amount, description, status, created_at
      FROM transactions
      WHERE wallet_id = ${wallet.id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return {
      wallet: {
        id: wallet.id,
        userId: wallet.user_id,
        balance: wallet.balance,
        totalEarned: wallet.total_earned,
        totalSpent: wallet.total_spent,
        isActive: wallet.is_active
      },
      recentTransactions: transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        createdAt: transaction.created_at
      }))
    };
  }
);
