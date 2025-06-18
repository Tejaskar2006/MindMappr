const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MY_SECRET';

const authenticationMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication token is missing' });
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            console.log('Decoded JWT payload:', decoded);
            req.user = decoded;
            next();
        } catch (jwtError) {
            return res.status(401).json({ message: 'Invalid authentication token' });
        }

    } catch (error) {
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

module.exports = authenticationMiddleware;