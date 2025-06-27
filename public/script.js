// Global variables
let socket;
let currentUser = null;
let currentRoom = null;
let mediaElement = null;
let isHost = false;
let peerConnection = null;
let localStream = null;
let remoteStreams = new Map();

// DOM elements
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomInfo = document.getElementById('roomInfo');
const currentRoomId = document.getElementById('currentRoomId');
const userCount = document.getElementById('userCount');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const mediaSection = document.getElementById('mediaSection');
const voiceChat = document.getElementById('voiceChat');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const playPauseBtn = document.getElementById('playPauseBtn');
const syncBtn = document.getElementById('syncBtn');
const mediaPlayer = document.getElementById('mediaPlayer');
const audioPlayer = document.getElementById('audioPlayer');
const progressBar = document.getElementById('progressBar');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const micToggle = document.getElementById('micToggle');
const speakerToggle = document.getElementById('speakerToggle');
const voiceUsers = document.getElementById('voiceUsers');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// Initialize the application
function init() {
    setupEventListeners();
    socket = io();
    setupSocketListeners();
}

function setupEventListeners() {
    // Authentication
    joinBtn.addEventListener('click', joinApp);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinApp();
    });

    // Room management
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    leaveRoomBtn.addEventListener('click', leaveRoom);

    // Media controls
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    playPauseBtn.addEventListener('click', togglePlayPause);
    syncBtn.addEventListener('click', syncMedia);

    // Voice chat
    micToggle.addEventListener('click', toggleMic);
    speakerToggle.addEventListener('click', toggleSpeaker);

    // Chat
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Disconnected from server', 'error');
    });

    socket.on('userJoined', (data) => {
        updateUserCount(data.userCount);
        addChatMessage(`${data.username} joined the room`, 'system');
    });

    socket.on('userLeft', (data) => {
        updateUserCount(data.userCount);
        addChatMessage(`${data.username} left the room`, 'system');
    });

    socket.on('roomCreated', (data) => {
        currentRoom = data.roomId;
        isHost = true;
        showRoomInfo(data.roomId, data.userCount);
        showNotification(`Room ${data.roomId} created!`);
    });

    socket.on('roomJoined', (data) => {
        currentRoom = data.roomId;
        isHost = false;
        showRoomInfo(data.roomId, data.userCount);
        showNotification(`Joined room ${data.roomId}!`);
    });

    socket.on('roomError', (data) => {
        showNotification(data.message, 'error');
    });

    socket.on('mediaSync', (data) => {
        syncMediaWithData(data);
    });

    socket.on('mediaPlay', () => {
        if (mediaElement && !isHost) {
            mediaElement.play();
            playPauseBtn.textContent = 'Pause';
        }
    });

    socket.on('mediaPause', () => {
        if (mediaElement && !isHost) {
            mediaElement.pause();
            playPauseBtn.textContent = 'Play';
        }
    });

    socket.on('mediaSeek', (data) => {
        if (mediaElement && !isHost) {
            mediaElement.currentTime = data.time;
        }
    });

    socket.on('chatMessage', (data) => {
        addChatMessage(data.message, 'user', data.username, data.timestamp);
    });

    socket.on('voiceOffer', async (data) => {
        await handleVoiceOffer(data);
    });

    socket.on('voiceAnswer', async (data) => {
        await handleVoiceAnswer(data);
    });

    socket.on('voiceIceCandidate', async (data) => {
        await handleVoiceIceCandidate(data);
    });
}

function joinApp() {
    const username = usernameInput.value.trim();
    if (!username) {
        showNotification('Please enter a username', 'error');
        return;
    }

    currentUser = username;
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    socket.emit('setUsername', username);
}

function createRoom() {
    const roomId = roomIdInput.value.trim() || generateRoomId();
    socket.emit('createRoom', { roomId });
}

function joinRoom() {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
        showNotification('Please enter a room ID', 'error');
        return;
    }
    socket.emit('joinRoom', { roomId });
}

function leaveRoom() {
    socket.emit('leaveRoom');
    currentRoom = null;
    isHost = false;
    hideRoomInfo();
    showNotification('Left the room');
}

function showRoomInfo(roomId, count) {
    currentRoomId.textContent = roomId;
    userCount.textContent = count;
    roomInfo.style.display = 'block';
    mediaSection.style.display = 'block';
    voiceChat.style.display = 'block';
}

function hideRoomInfo() {
    roomInfo.style.display = 'none';
    mediaSection.style.display = 'none';
    voiceChat.style.display = 'none';
}

function updateUserCount(count) {
    userCount.textContent = count;
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    
    if (isVideo) {
        mediaElement = mediaPlayer;
        mediaPlayer.src = url;
        mediaPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
    } else {
        mediaElement = audioPlayer;
        audioPlayer.src = url;
        audioPlayer.style.display = 'block';
        mediaPlayer.style.display = 'none';
    }

    mediaElement.addEventListener('loadedmetadata', () => {
        duration.textContent = formatTime(mediaElement.duration);
        playPauseBtn.disabled = false;
        syncBtn.disabled = false;
        
        // Notify other users about the new media
        socket.emit('mediaLoaded', {
            roomId: currentRoom,
            mediaType: isVideo ? 'video' : 'audio',
            duration: mediaElement.duration
        });
    });

    mediaElement.addEventListener('timeupdate', updateProgress);
    mediaElement.addEventListener('ended', () => {
        playPauseBtn.textContent = 'Play';
        socket.emit('mediaEnded', { roomId: currentRoom });
    });
}

function togglePlayPause() {
    if (!mediaElement) return;

    if (mediaElement.paused) {
        mediaElement.play();
        playPauseBtn.textContent = 'Pause';
        socket.emit('mediaPlay', { roomId: currentRoom });
    } else {
        mediaElement.pause();
        playPauseBtn.textContent = 'Play';
        socket.emit('mediaPause', { roomId: currentRoom });
    }
}

function syncMedia() {
    if (!mediaElement) return;

    const syncData = {
        roomId: currentRoom,
        currentTime: mediaElement.currentTime,
        duration: mediaElement.duration,
        paused: mediaElement.paused
    };

    socket.emit('mediaSync', syncData);
    showNotification('Media synced with room!');
}

function syncMediaWithData(data) {
    if (!mediaElement || isHost) return;

    mediaElement.currentTime = data.currentTime;
    if (data.paused) {
        mediaElement.pause();
        playPauseBtn.textContent = 'Play';
    } else {
        mediaElement.play();
        playPauseBtn.textContent = 'Pause';
    }
}

function updateProgress() {
    if (!mediaElement) return;

    const progress = (mediaElement.currentTime / mediaElement.duration) * 100;
    progressBar.style.width = progress + '%';
    currentTime.textContent = formatTime(mediaElement.currentTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function toggleMic() {
    if (!localStream) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micToggle.textContent = '🎤 Mic On';
            micToggle.classList.add('active');
            initVoiceChat();
        } catch (error) {
            showNotification('Could not access microphone', 'error');
        }
    } else {
        localStream.getAudioTracks().forEach(track => track.stop());
        localStream = null;
        micToggle.textContent = '🎤 Mic Off';
        micToggle.classList.remove('active');
        closeVoiceChat();
    }
}

function toggleSpeaker() {
    // Toggle speaker functionality would go here
    showNotification('Speaker toggle not implemented yet', 'warning');
}

async function initVoiceChat() {
    if (!currentRoom) return;

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };

    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        playRemoteStream(remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('voiceIceCandidate', {
                roomId: currentRoom,
                candidate: event.candidate
            });
        }
    };

    // Create offer if host
    if (isHost) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('voiceOffer', {
            roomId: currentRoom,
            offer: offer
        });
    }
}

async function handleVoiceOffer(data) {
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('voiceAnswer', {
        roomId: currentRoom,
        answer: answer
    });
}

async function handleVoiceAnswer(data) {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(data.answer);
}

async function handleVoiceIceCandidate(data) {
    if (!peerConnection) return;
    await peerConnection.addIceCandidate(data.candidate);
}

function playRemoteStream(stream) {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);
}

function closeVoiceChat() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;

    socket.emit('chatMessage', {
        roomId: currentRoom,
        message: message
    });

    messageInput.value = '';
}

function addChatMessage(message, type, username = null, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type === 'user' && username === currentUser ? 'own' : ''}`;

    if (type === 'system') {
        messageDiv.innerHTML = `<em>${message}</em>`;
    } else {
        const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <div class="username">${username}</div>
            <div class="timestamp">${time}</div>
            <div>${message}</div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);
