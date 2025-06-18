const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid email format.');
            }
        }
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'users'
});

userSchema.statics.register = async function (name, email, password) {
    try {
        if (!validator.isEmail(email)) {
            throw new Error('Invalid email format.');
        }

        if (!validator.isStrongPassword(password, {
            minLength: 8,
            minLowercase: 0,
            minUppercase: 0,
            minNumbers: 0,
            minSymbols: 0
        })) {
            throw new Error('Password is not strong enough. It must include at least 8 characters, uppercase, lowercase, number, and symbol.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new this({ name, email, password: hashedPassword });
        const newUser = await user.save();
        return newUser;
    } catch (error) {
        throw new Error('Error creating user: ' + error.message);
    }
};

userSchema.statics.login = async function (email, password) {
    try {
        console.log('Querying user with email:', email); // Debug log
        const user = await this.findOne({ email: email.toLowerCase() });
        console.log('User retrieved from database:', user); // Debug log
        if (!user) {
            throw new Error('User not found.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid password.');
        }

        return user;
    } catch (error) {
        throw new Error('Error logging in: ' + error.message);
    }
};

userSchema.statics.getUser = async function (email) {
    try {
        const user = await this.findOne({ email: email.toLowerCase() });
        if (!user) {
            throw new Error('User not found.');
        }
        return user;
    } catch (error) {
        throw new Error('Error fetching user: ' + error.message);
    }
};

const userModel = mongoose.model('users', userSchema);
module.exports = userModel;