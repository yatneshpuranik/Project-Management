import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name :{
         type:String,
         required:true
    },
    email :{
         type:String,
         required:true,
         unique:true
    },
    password :{
        type:String,
        required:true
    },
    role: {
        type: String,
        enum: ['OWNER', 'MEMBER'],
        default: 'MEMBER'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    reason: {
        type: String
    },
    blockedAt: {
        type: Date
    }
}, { timestamps: true });

userSchema.pre('save', function (next) {
    if (this.email) {
        this.email = this.email.toLowerCase().trim();
        if (this.email.endsWith('@admin.com')) {
            this.role = 'OWNER';
        } else {
            this.role = 'MEMBER';
        }
    }
    if (typeof next === 'function') {
        next();
    }
});

const User = mongoose.model("User",userSchema);
export default User;