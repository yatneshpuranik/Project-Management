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
        enum: ['ADMIN', 'OWNER', 'MEMBER'],
        default: 'MEMBER'
    },
    presenceStatus: {
        type: String,
        enum: ['Online', 'Offline', 'Away', 'Busy'],
        default: 'Online'
    },
    lastActive: {
        type: Date,
        default: Date.now
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
        if (this.email === 'yatnesh@admin.com') {
            this.role = 'ADMIN';
        } else if (this.email.endsWith('@admin.com')) {
            this.role = 'OWNER';
        } else {
            // Keep existing role if already set (e.g. if promoted/demoted)
            if (!this.role || (this.role !== 'OWNER' && this.role !== 'ADMIN')) {
                this.role = 'MEMBER';
            }
        }
    }
    if (typeof next === 'function') {
        next();
    }
});

const User = mongoose.model("User",userSchema);
export default User;