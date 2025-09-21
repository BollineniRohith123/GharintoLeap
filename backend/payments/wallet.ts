import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface WalletBalance {
  balance: number;
  blockedAmount: number;
  availableBalance: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface WalletDetailsResponse {
  wallet: WalletBalance;
  recentTransactions: WalletTransaction[];
}

// Retrieves wallet details and recent transactions for the current user.
export const getWalletDetails = api<void, WalletDetailsResponse>(
  { auth: true, expose: true, method: "GET", path: "/payments/wallet" },
  async () => {
    const auth = getAuthData()!;

    const wallet = await db.queryRow<{
      balance: number;
      blocked_amount: number;
    }>`
      SELECT balance, blocked_amount
      FROM wallets
      WHERE user_id = ${auth.userID}
    `;

    if (!wallet) {
      // Create wallet if it doesn't exist
      await db.exec`
        INSERT INTO wallets (user_id, balance, blocked_amount)
        VALUES (${auth.userID}, 0, 0)
      `;
      
      return {
        wallet: {
          balance: 0,
          blockedAmount: 0,
          availableBalance: 0
        },
        recentTransactions: []
      };
    }

    const transactions = await db.queryAll<{
      id: number;
      transaction_type: string;
      amount: number;
      description: string | null;
      status: string;
      created_at: string;
    }>`
      SELECT wt.id, wt.transaction_type, wt.amount, wt.description, wt.status, wt.created_at
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.user_id = ${auth.userID}
      ORDER BY wt.created_at DESC
      LIMIT 10
    `;

    return {
      wallet: {
        balance: wallet.balance,
        blockedAmount: wallet.blocked_amount,
        availableBalance: wallet.balance - wallet.blocked_amount
      },
      recentTransactions: transactions.map(t => ({
        id: t.id.toString(),
        type: t.transaction_type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        createdAt: t.created_at
      }))
    };
  }
);
