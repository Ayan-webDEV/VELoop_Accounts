import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
export async function protect(req,res,next){
  try{
    const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
    if(!token) return res.status(401).json({message:'Please sign in to continue'});
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const admin=await Admin.findById(payload.id).select('_id name email role');
    if(!admin) return res.status(401).json({message:'Admin account not found'});
    req.admin=admin;next();
  }catch(e){return res.status(401).json({message:'Session expired. Please sign in again.'});}
}
