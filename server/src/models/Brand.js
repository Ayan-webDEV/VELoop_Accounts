import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:100,unique:true},slug:{type:String,required:true,trim:true,lowercase:true,unique:true},description:{type:String,trim:true,default:'',maxlength:500},color:{type:String,default:'#059669'},createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'Admin',required:true},createdByName:{type:String,required:true},archived:{type:Boolean,default:false}},{timestamps:true});
export default mongoose.model('Brand',schema);
