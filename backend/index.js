const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*'
    }
});
const connectToDatabase = require('./db');
const userRoutes = require('./routers/userRoutes');
const canvasRoutes = require('./routers/canvasRoutes');

connectToDatabase();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Canvas Collaboration API is running');
});

app.use('/users', userRoutes);
app.use('/canvas', canvasRoutes);

// Socket.IO Authentication Middleware
const JWT_SECRET = process.env.JWT_SECRET;
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication token is missing'));
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error('Invalid authentication token'));
    }
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}, Email: ${socket.user.email}, Name: ${socket.user.name || 'Unknown'}`);

    socket.on('joinCanvas', (canvasId) => {
        socket.join(canvasId);
        console.log(`User ${socket.id} (${socket.user.email}) joined canvas ${canvasId}`);
        socket.to(canvasId).emit('userJoined', {
            userId: socket.id,
            email: socket.user.email,
            name: socket.user.name || 'Unknown' // Fallback to 'Unknown'
        });
    });

    socket.on('cursorMove', ({ canvasId, x, y, userId }) => {
        socket.to(canvasId).emit('cursorUpdate', {
            userId,
            x,
            y,
            email: socket.user.email,
            name: socket.user.name || 'Unknown'
        });
    });

    socket.on('drawPoint', ({ canvasId, x, y, color, brushSize }) => {
        socket.to(canvasId).emit('drawPoint', {
            x,
            y,
            color,
            brushSize,
            email: socket.user.email,
            name: socket.user.name || 'Unknown'
        });
    });

    socket.on('addText', ({ canvasId, x, y, text, font }) => {
        socket.to(canvasId).emit('addText', {
            x,
            y,
            text,
            font,
            email: socket.user.email,
            name: socket.user.name || 'Unknown'
        });
    });

    socket.on('clearCanvas', (canvasId) => {
        socket.to(canvasId).emit('clearCanvas');
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        io.emit('userLeft', { userId: socket.id });
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Start the server
const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});