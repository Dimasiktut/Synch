const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms and users
const rooms = new Map();
const users = new Map();

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Set username
    socket.on('setUsername', (username) => {
        users.set(socket.id, {
            id: socket.id,
            username: username,
            room: null
        });
        console.log(`User ${username} connected`);
    });

    // Create room
    socket.on('createRoom', (data) => {
        const { roomId } = data;
        const user = users.get(socket.id);
        
        if (!user) return;

        if (rooms.has(roomId)) {
            socket.emit('roomError', { message: 'Room already exists' });
            return;
        }

        // Leave current room if in one
        if (user.room) {
            leaveRoom(socket, user.room);
        }

        // Create new room
        rooms.set(roomId, {
            id: roomId,
            host: socket.id,
            users: new Set([socket.id]),
            media: null
        });

        // Join room
        socket.join(roomId);
        user.room = roomId;
        users.set(socket.id, user);

        socket.emit('roomCreated', {
            roomId: roomId,
            userCount: rooms.get(roomId).users.size
        });

        console.log(`Room ${roomId} created by ${user.username}`);
    });

    // Join room
    socket.on('joinRoom', (data) => {
        const { roomId } = data;
        const user = users.get(socket.id);
        
        if (!user) return;

        if (!rooms.has(roomId)) {
            socket.emit('roomError', { message: 'Room does not exist' });
            return;
        }

        // Leave current room if in one
        if (user.room) {
            leaveRoom(socket, user.room);
        }

        // Join room
        const room = rooms.get(roomId);
        room.users.add(socket.id);
        socket.join(roomId);
        user.room = roomId;
        users.set(socket.id, user);

        socket.emit('roomJoined', {
            roomId: roomId,
            userCount: room.users.size
        });

        // Notify other users
        socket.to(roomId).emit('userJoined', {
            username: user.username,
            userCount: room.users.size
        });

        console.log(`${user.username} joined room ${roomId}`);
    });

    // Leave room
    socket.on('leaveRoom', () => {
        const user = users.get(socket.id);
        if (user && user.room) {
            leaveRoom(socket, user.room);
        }
    });

    // Media synchronization
    socket.on('mediaLoaded', (data) => {
        const { roomId, mediaType, duration } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.media = { type: mediaType, duration };
            socket.to(roomId).emit('mediaLoaded', data);
        }
    });

    socket.on('mediaPlay', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('mediaPlay');
    });

    socket.on('mediaPause', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('mediaPause');
    });

    socket.on('mediaSync', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('mediaSync', data);
    });

    socket.on('mediaSeek', (data) => {
        const { roomId, time } = data;
        socket.to(roomId).emit('mediaSeek', { time });
    });

    socket.on('mediaEnded', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('mediaEnded');
    });

    // Chat messages
    socket.on('chatMessage', (data) => {
        const { roomId, message } = data;
        const user = users.get(socket.id);
        
        if (user && user.room === roomId) {
            const chatData = {
                username: user.username,
                message: message,
                timestamp: new Date().toISOString()
            };
            
            io.to(roomId).emit('chatMessage', chatData);
        }
    });

    // Voice chat WebRTC signaling
    socket.on('voiceOffer', (data) => {
        const { roomId, offer } = data;
        socket.to(roomId).emit('voiceOffer', { offer, from: socket.id });
    });

    socket.on('voiceAnswer', (data) => {
        const { roomId, answer } = data;
        socket.to(roomId).emit('voiceAnswer', { answer, from: socket.id });
    });

    socket.on('voiceIceCandidate', (data) => {
        const { roomId, candidate } = data;
        socket.to(roomId).emit('voiceIceCandidate', { candidate, from: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`User ${user.username} disconnected`);
            
            if (user.room) {
                leaveRoom(socket, user.room);
            }
            
            users.delete(socket.id);
        }
    });
});

// Helper function to handle leaving rooms
function leaveRoom(socket, roomId) {
    const user = users.get(socket.id);
    const room = rooms.get(roomId);
    
    if (!user || !room) return;

    // Remove user from room
    room.users.delete(socket.id);
    socket.leave(roomId);
    user.room = null;
    users.set(socket.id, user);

    // If room is empty, delete it
    if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
    } else {
        // If host left, assign new host
        if (room.host === socket.id) {
            room.host = Array.from(room.users)[0];
            console.log(`New host assigned for room ${roomId}`);
        }
        
        // Notify remaining users
        socket.to(roomId).emit('userLeft', {
            username: user.username,
            userCount: room.users.size
        });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎵 Sync Watch server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT} to start watching together!`);
});

