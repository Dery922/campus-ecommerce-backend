import mongoose from "mongoose";


const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true }, // Saved in GHS/NGN/USD native value
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  channel: { type: String, default: 'mobile_money' } // e.g., mobile_money, card
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema)

