import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    /** Хеш пароля (только для входа по email/паролю). Отсутствует у пользователей OAuth. */
    password: { type: String, default: null },
    emailVerified: { type: Date, default: null },
    walletAddress: { type: String, default: null },
    telegramId: { type: String, default: null },
    /** Персональный ключ OpenAI (ChatGPT) для вызовов AI */
    openaiApiKey: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ walletAddress: 1 }, { sparse: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
