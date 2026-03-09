import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    moltbookId: { type: String, default: null, index: true },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AgentSchema.index({ userId: 1 });
AgentSchema.index({ moltbookId: 1 }, { sparse: true });

export default mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
