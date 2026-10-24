import mongoose from 'mongoose';
import Brand from '../models/Brand.js';
import Transaction from '../models/Transaction.js';
import Transfer from '../models/Transfer.js';
import Notification from '../models/Notification.js';

export async function listTransfers(req, res) {
  const filter = {};
  if (req.query.brand && req.query.brand !== 'all') filter.$or = [{ fromBrand: req.query.brand }, { toBrand: req.query.brand }];
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '50', 10)));
  const items = await Transfer.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit).lean();
  res.json({ items });
}

export async function createTransfer(req, res) {
  const amount = Number(req.body.amount);
  const date = new Date(req.body.date);
  const time = String(req.body.time || '');
  const fromId = String(req.body.fromBrand || '');
  const toId = String(req.body.toBrand || '');
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Transfer amount must be greater than zero.' });
  if (Number.isNaN(+date)) return res.status(400).json({ message: 'Choose a valid transfer date.' });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ message: 'Choose a valid transfer time.' });
  if (!mongoose.isValidObjectId(fromId) || !mongoose.isValidObjectId(toId) || fromId === toId) return res.status(400).json({ message: 'Choose two different valid brands.' });
  const [from, to] = await Promise.all([Brand.findOne({ _id: fromId, archived: false }), Brand.findOne({ _id: toId, archived: false })]);
  if (!from || !to) return res.status(400).json({ message: 'Both brands must exist and be active.' });
  const note = String(req.body.note || '').trim().slice(0, 1000);
  const reference = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  let transfer;
  let debit;
  let credit;
  try {
    transfer = await Transfer.create({ reference, amount, date, time, fromBrand: from._id, fromBrandName: from.name, toBrand: to._id, toBrandName: to.name, note, createdBy: req.admin._id, createdByName: req.admin.name });
    const common = { amount, date, time, status: 'completed', category: 'Internal transfer', note: `${note}${note ? ' · ' : ''}Transfer reference: ${reference}`, counterparty: '', isInternalTransfer: true, transferId: transfer._id, createdBy: req.admin._id, createdByName: req.admin.name };
    debit = await Transaction.create({ ...common, brand: from._id, brandName: from.name, type: 'debit', title: `Transfer to ${to.name} (${reference})` });
    credit = await Transaction.create({ ...common, brand: to._id, brandName: to.name, type: 'credit', title: `Transfer from ${from.name} (${reference})` });
    transfer.debitTransaction = debit._id;
    transfer.creditTransaction = credit._id;
    await transfer.save();
    await Notification.create({ type: 'transaction_created', title: 'Internal brand transfer recorded', message: `${req.admin.name} transferred ₹${amount.toFixed(2)} from ${from.name} to ${to.name}. Group-wide cash is unchanged. Reference: ${reference}.`, brand: from._id, transactionId: debit._id, actorId: req.admin._id, actorName: req.admin.name });
    res.status(201).json({ item: transfer });
  } catch (error) {
    // Compensate partial writes if any operation fails.
    if (debit?._id) await Transaction.deleteOne({ _id: debit._id }).catch(() => {});
    if (credit?._id) await Transaction.deleteOne({ _id: credit._id }).catch(() => {});
    if (transfer?._id) await Transfer.deleteOne({ _id: transfer._id }).catch(() => {});
    res.status(500).json({ message: 'Transfer could not be completed. No partial transfer was retained.' });
  }
}


export async function reverseTransfer(req, res) {
  const original = await Transfer.findById(req.params.id);
  if (!original) return res.status(404).json({ message: 'Transfer not found.' });
  if (original.reversedBy) return res.status(409).json({ message: 'This transfer has already been reversed.' });
  const now = new Date();
  const reference = `REV-${original.reference}-${Date.now().toString(36).toUpperCase()}`;
  let reversal;
  let debit;
  let credit;
  try {
    reversal = await Transfer.create({ reference, amount: original.amount, date: now, time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, fromBrand: original.toBrand, fromBrandName: original.toBrandName, toBrand: original.fromBrand, toBrandName: original.fromBrandName, note: `Reversal of ${original.reference}. ${String(req.body.note || '').trim()}`.slice(0,1000), reversesTransfer: original._id, createdBy: req.admin._id, createdByName: req.admin.name });
    const common = { amount: original.amount, date: now, time: reversal.time, status: 'completed', category: 'Internal transfer reversal', note: `Reversal of ${original.reference}; transfer reference ${reference}`, counterparty: '', isInternalTransfer: true, transferId: reversal._id, createdBy: req.admin._id, createdByName: req.admin.name };
    debit = await Transaction.create({ ...common, brand: original.toBrand, brandName: original.toBrandName, type: 'debit', title: `Transfer reversal to ${original.fromBrandName} (${reference})` });
    credit = await Transaction.create({ ...common, brand: original.fromBrand, brandName: original.fromBrandName, type: 'credit', title: `Transfer reversal from ${original.toBrandName} (${reference})` });
    reversal.debitTransaction = debit._id;
    reversal.creditTransaction = credit._id;
    await reversal.save();
    original.reversedBy = reversal._id;
    await original.save();
    await Notification.create({ type: 'transaction_created', title: 'Internal transfer reversed', message: `${req.admin.name} reversed transfer ${original.reference} for ₹${original.amount.toFixed(2)}. Reversal reference: ${reference}.`, brand: original.fromBrand, transactionId: credit._id, actorId: req.admin._id, actorName: req.admin.name });
    res.status(201).json({ item: reversal, message: 'Transfer reversal recorded.' });
  } catch (error) {
    if (debit?._id) await Transaction.deleteOne({ _id: debit._id }).catch(() => {});
    if (credit?._id) await Transaction.deleteOne({ _id: credit._id }).catch(() => {});
    if (reversal?._id) await Transfer.deleteOne({ _id: reversal._id }).catch(() => {});
    original.reversedBy = null;
    await original.save().catch(() => {});
    res.status(500).json({ message: 'Transfer reversal failed; no partial reversal was retained.' });
  }
}
