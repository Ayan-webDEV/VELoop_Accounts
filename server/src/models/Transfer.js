import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  reference: { type: String, unique: true, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  fromBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  fromBrandName: { type: String, required: true },
  toBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  toBrandName: { type: String, required: true },
  note: { type: String, default: '', maxlength: 1000 },
  reversesTransfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer', default: null },
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer', default: null },
  debitTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  creditTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdByName: { type: String, required: true },
}, { timestamps: true });
schema.index({ date: -1, createdAt: -1 });
export default mongoose.model('Transfer', schema);
