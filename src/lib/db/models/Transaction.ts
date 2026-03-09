import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
      index: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['transfer', 'swap', 'nft', 'contract', 'receive'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USDT' },
    fromAddress: { type: String, default: null },
    toAddress: { type: String, default: null },
    txHash: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected'],
      default: 'pending',
    },
    policyValidated: { type: Boolean, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ agentId: 1 });
TransactionSchema.index({ walletId: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ status: 1 });

export default mongoose.models.Transaction ||
  mongoose.model('Transaction', TransactionSchema);
