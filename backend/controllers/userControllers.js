const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const normalizedEmail = email.toLowerCase(); // Normalize email
        const newUser = await userModel.register(name, normalizedEmail, password);
        const token = jwt.sign(
            { email: newUser.email, name: newUser.name || 'Unknown' },
            JWT_SECRET
        );
        res.status(201).json({ message: 'User registered successfully', user: newUser, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token missing or malformed' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const email = decoded.email;
        if (!email) {
            return res.status(400).json({ error: 'Invalid token payload' });
        }

        const user = await userModel.getUser(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'User profile fetched successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: ' + error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase(); // Normalize email
        console.log('Login attempt for email:', normalizedEmail);
        const user = await userModel.login(normalizedEmail, password);
        console.log('User before token generation:', user);
        const tokenPayload = { email: user.email, name: user.name || 'Unknown' };
        console.log('Token payload:', tokenPayload); // Log the token payload
        const token = jwt.sign(tokenPayload, JWT_SECRET);

        return res.status(200).json({
            message: 'Login successful',
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};