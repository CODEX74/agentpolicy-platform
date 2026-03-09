import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema(
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
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    networkId: { type: String, default: 'base-sepolia' },
    cdpWalletId: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

WalletSchema.index({ userId: 1 });
WalletSchema.index({ agentId: 1 }, { sparse: true });
WalletSchema.index({ address: 1 }, { unique: true });

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
