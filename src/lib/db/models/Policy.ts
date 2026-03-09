import mongoose from 'mongoose';

const PolicySchema = new mongoose.Schema(
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
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: 'Default Policy' },
    dailyLimit: { type: Number, default: 0, min: 0 },
    weeklyLimit: { type: Number, default: 0, min: 0 },
    maxPerTransaction: { type: Number, default: 0, min: 0 },
    allowedAddresses: [{ type: String, lowercase: true }],
    blockedAddresses: [{ type: String, lowercase: true }],
    allowedOperations: [
      {
        type: String,
        enum: ['transfer', 'swap', 'nft', 'contract', 'all'],
        default: 'all',
      },
    ],
    timeRestrictions: {
      enabled: { type: Boolean, default: false },
      startHour: { type: Number, min: 0, max: 23, default: 0 },
      endHour: { type: Number, min: 0, max: 23, default: 23 },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },
    notifications: {
      email: { type: Boolean, default: true },
      telegram: { type: Boolean, default: false },
      onEachTransaction: { type: Boolean, default: true },
      onLimitExceeded: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PolicySchema.index({ userId: 1, isActive: 1 });
PolicySchema.index({ agentId: 1 }, { unique: true });

export default mongoose.models.Policy || mongoose.model('Policy', PolicySchema);
