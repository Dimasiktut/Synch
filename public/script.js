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

// New elements for URL and music search
const urlBtn = document.getElementById('urlBtn');
const musicSearchBtn = document.getElementById('musicSearchBtn');
const movieSearchBtn = document.getElementById('movieSearchBtn');
const urlModal = document.getElementById('urlModal');
const musicModal = document.getElementById('musicModal');
const movieModal = document.getElementById('movieModal');
const mediaUrlInput = document.getElementById('mediaUrlInput');
const musicSearchInput = document.getElementById('musicSearchInput');
const movieSearchInput = document.getElementById('movieSearchInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const cancelUrlBtn = document.getElementById('cancelUrlBtn');
const searchBtn = document.getElementById('searchBtn');
const movieSearchSubmitBtn = document.getElementById('movieSearchSubmitBtn');
const searchResults = document.getElementById('searchResults');
const movieResults = document.getElementById('movieResults');

// Current media info
let currentMediaType = 'file'; // 'file', 'url', 'youtube'

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
    
    // URL and Media Search
    urlBtn.addEventListener('click', openUrlModal);
    musicSearchBtn.addEventListener('click', openMusicModal);
    movieSearchBtn.addEventListener('click', openMovieModal);
    loadUrlBtn.addEventListener('click', loadMediaFromUrl);
    cancelUrlBtn.addEventListener('click', closeUrlModal);
    searchBtn.addEventListener('click', searchMusic);
    movieSearchSubmitBtn.addEventListener('click', searchMovies);
    musicSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMusic();
    });
    movieSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMovies();
    });
    
    // Modal close functionality
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
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
    
    // Handle media loaded by other users
    socket.on('mediaLoaded', (data) => {
        handleRemoteMediaLoaded(data);
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
            // Request microphone access
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            micToggle.textContent = '🎤 Mic On';
            micToggle.classList.add('active');
            
            // Initialize voice chat immediately
            await initVoiceChat();
            
            // Notify other users that voice is available
            socket.emit('voiceReady', { roomId: currentRoom });
            
            showNotification('Microphone activated!', 'success');
        } catch (error) {
            console.error('Microphone access error:', error);
            showNotification('Could not access microphone. Please check permissions.', 'error');
        }
    } else {
        // Stop all audio tracks
        localStream.getAudioTracks().forEach(track => {
            track.stop();
        });
        localStream = null;
        micToggle.textContent = '🎤 Mic Off';
        micToggle.classList.remove('active');
        
        // Close voice chat connection
        closeVoiceChat();
        
        // Notify other users that voice is no longer available
        socket.emit('voiceDisconnected', { roomId: currentRoom });
        
        showNotification('Microphone deactivated', 'info');
    }
}

function toggleSpeaker() {
    // Toggle speaker functionality would go here
    showNotification('Speaker toggle not implemented yet', 'warning');
}

async function initVoiceChat() {
    if (!currentRoom || !localStream) return;

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // Close existing connection if any
    if (peerConnection) {
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        console.log('Received remote stream');
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

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            showNotification('Voice chat connected!', 'success');
        } else if (peerConnection.connectionState === 'failed') {
            showNotification('Voice chat connection failed', 'error');
        }
    };

    // Always create offer to initiate connection
    try {
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true
        });
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('voiceOffer', {
            roomId: currentRoom,
            offer: offer
        });
        
        console.log('Voice offer sent');
    } catch (error) {
        console.error('Error creating voice offer:', error);
        showNotification('Failed to initialize voice chat', 'error');
    }
}

async function handleVoiceOffer(data) {
    console.log('Received voice offer');
    
    // Initialize voice chat if not already done
    if (!peerConnection && localStream) {
        await initVoiceChat();
    }
    
    if (!peerConnection) {
        console.log('No peer connection available');
        return;
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('voiceAnswer', {
            roomId: currentRoom,
            answer: answer
        });
        
        console.log('Voice answer sent');
    } catch (error) {
        console.error('Error handling voice offer:', error);
    }
}

async function handleVoiceAnswer(data) {
    console.log('Received voice answer');
    if (!peerConnection) return;
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Voice answer processed');
    } catch (error) {
        console.error('Error handling voice answer:', error);
    }
}

async function handleVoiceIceCandidate(data) {
    if (!peerConnection) return;
    
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('ICE candidate added');
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

function playRemoteStream(stream) {
    // Remove any existing remote audio elements
    const existingAudio = document.querySelectorAll('audio[data-remote]');
    existingAudio.forEach(audio => audio.remove());
    
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.setAttribute('data-remote', 'true');
    audio.volume = 1.0;
    
    // Hide the audio element
    audio.style.display = 'none';
    
    document.body.appendChild(audio);
    
    console.log('Playing remote stream');
    showNotification('Connected to voice chat!', 'success');
}

function closeVoiceChat() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Remove remote audio elements
    const remoteAudio = document.querySelectorAll('audio[data-remote]');
    remoteAudio.forEach(audio => audio.remove());
    
    console.log('Voice chat closed');
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

// URL Modal Functions
function openUrlModal() {
    urlModal.style.display = 'flex';
    mediaUrlInput.focus();
}

function closeUrlModal() {
    urlModal.style.display = 'none';
    mediaUrlInput.value = '';
}

function loadMediaFromUrl() {
    const url = mediaUrlInput.value.trim();
    if (!url) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }

    closeUrlModal();
    
    // Check if it's a YouTube URL
    if (isYouTubeUrl(url)) {
        loadYouTubeVideo(url);
    } else {
        loadDirectUrl(url);
    }
}

function isYouTubeUrl(url) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    return youtubeRegex.test(url);
}

function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function loadYouTubeVideo(url) {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        showNotification('Invalid YouTube URL', 'error');
        return;
    }

    // Create YouTube embed
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
    
    // Clear existing media
    mediaPlayer.style.display = 'none';
    audioPlayer.style.display = 'none';
    
    // Create iframe for YouTube
    let youtubeFrame = document.getElementById('youtubeFrame');
    if (youtubeFrame) {
        youtubeFrame.remove();
    }
    
    youtubeFrame = document.createElement('iframe');
    youtubeFrame.id = 'youtubeFrame';
    youtubeFrame.src = embedUrl;
    youtubeFrame.width = '100%';
    youtubeFrame.height = '400';
    youtubeFrame.frameBorder = '0';
    youtubeFrame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    youtubeFrame.allowFullscreen = true;
    
    document.querySelector('.media-player').appendChild(youtubeFrame);
    
    currentMediaType = 'youtube';
    playPauseBtn.disabled = true; // YouTube controls handled by iframe
    syncBtn.disabled = false;
    
    showNotification('YouTube video loaded!', 'success');
    
    // Notify other users
    socket.emit('mediaLoaded', {
        roomId: currentRoom,
        mediaType: 'youtube',
        url: url
    });
}

function loadDirectUrl(url) {
    // Try to determine if it's video or audio
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    
    const isVideo = videoExtensions.some(ext => url.toLowerCase().includes(ext));
    const isAudio = audioExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (isVideo) {
        mediaElement = mediaPlayer;
        mediaPlayer.src = url;
        mediaPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        currentMediaType = 'url';
    } else if (isAudio) {
        mediaElement = audioPlayer;
        audioPlayer.src = url;
        audioPlayer.style.display = 'block';
        mediaPlayer.style.display = 'none';
        currentMediaType = 'url';
    } else {
        // Try as video first, fallback to audio
        mediaElement = mediaPlayer;
        mediaPlayer.src = url;
        mediaPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        currentMediaType = 'url';
        
        mediaElement.onerror = () => {
            // If video fails, try as audio
            mediaElement = audioPlayer;
            audioPlayer.src = url;
            audioPlayer.style.display = 'block';
            mediaPlayer.style.display = 'none';
        };
    }

    // Clear YouTube iframe if exists
    const youtubeFrame = document.getElementById('youtubeFrame');
    if (youtubeFrame) {
        youtubeFrame.remove();
    }

    mediaElement.addEventListener('loadedmetadata', () => {
        duration.textContent = formatTime(mediaElement.duration);
        playPauseBtn.disabled = false;
        syncBtn.disabled = false;
        
        showNotification('Media loaded from URL!', 'success');
        
        // Notify other users about the new media
        socket.emit('mediaLoaded', {
            roomId: currentRoom,
            mediaType: isVideo ? 'video' : 'audio',
            url: url,
            duration: mediaElement.duration
        });
    });

    mediaElement.addEventListener('timeupdate', updateProgress);
    mediaElement.addEventListener('ended', () => {
        playPauseBtn.textContent = 'Play';
        socket.emit('mediaEnded', { roomId: currentRoom });
    });
    
    mediaElement.addEventListener('error', () => {
        showNotification('Failed to load media from URL', 'error');
    });
}

// Music Search Functions
function openMusicModal() {
    musicModal.style.display = 'flex';
    musicSearchInput.focus();
}

function closeMusicModal() {
    musicModal.style.display = 'none';
    musicSearchInput.value = '';
    searchResults.innerHTML = '';
}

async function searchMusic() {
    const query = musicSearchInput.value.trim();
    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }

    searchResults.innerHTML = '<p>Searching music...</p>';
    
    try {
        // Try multiple music APIs
        let results = [];
        
        // First try iTunes API (works better)
        try {
            const iTunesResponse = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`);
            const iTunesData = await iTunesResponse.json();
            
            if (iTunesData.results && iTunesData.results.length > 0) {
                results = iTunesData.results.map(track => ({
                    name: track.trackName || track.collectionName,
                    artist_name: track.artistName,
                    duration: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 0,
                    audio: track.previewUrl,
                    source: 'iTunes'
                })).filter(track => track.audio); // Only tracks with preview
            }
        } catch (e) {
            console.log('iTunes API failed:', e);
        }
        
        // If no results, try Jamendo
        if (results.length === 0) {
            try {
                const jamendoResponse = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=10&search=${encodeURIComponent(query)}&include=musicinfo`);
                const jamendoData = await jamendoResponse.json();
                
                if (jamendoData.results && jamendoData.results.length > 0) {
                    results = jamendoData.results.map(track => ({
                        name: track.name,
                        artist_name: track.artist_name,
                        duration: track.duration,
                        audio: track.audio,
                        source: 'Jamendo'
                    }));
                }
            } catch (e) {
                console.log('Jamendo API failed:', e);
            }
        }
        
        if (results.length > 0) {
            displayMusicResults(results);
        } else {
            // Fallback to YouTube search
            searchYouTubeContent(query, 'music');
        }
    } catch (error) {
        console.error('Music search error:', error);
        searchYouTubeContent(query, 'music');
    }
}

function displayMusicResults(tracks) {
    searchResults.innerHTML = '';
    
    tracks.forEach(track => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result';
        resultDiv.innerHTML = `
            <h4>${track.name}</h4>
            <p>Artist: ${track.artist_name}</p>
            <p class="duration">Duration: ${formatTime(track.duration)}</p>
        `;
        
        resultDiv.addEventListener('click', () => {
            loadMusicTrack(track);
        });
        
        searchResults.appendChild(resultDiv);
    });
}

function loadMusicTrack(track) {
    closeMusicModal();
    
    mediaElement = audioPlayer;
    audioPlayer.src = track.audio;
    audioPlayer.style.display = 'block';
    mediaPlayer.style.display = 'none';
    currentMediaType = 'url';
    
    // Clear YouTube iframe if exists
    const youtubeFrame = document.getElementById('youtubeFrame');
    if (youtubeFrame) {
        youtubeFrame.remove();
    }

    audioPlayer.addEventListener('loadedmetadata', () => {
        duration.textContent = formatTime(audioPlayer.duration);
        playPauseBtn.disabled = false;
        syncBtn.disabled = false;
        
        showNotification(`Now playing: ${track.name} by ${track.artist_name}`, 'success');
        
        // Notify other users about the new media
        socket.emit('mediaLoaded', {
            roomId: currentRoom,
            mediaType: 'audio',
            url: track.audio,
            duration: audioPlayer.duration,
            title: track.name,
            artist: track.artist_name
        });
    });

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', () => {
        playPauseBtn.textContent = 'Play';
        socket.emit('mediaEnded', { roomId: currentRoom });
    });
}

// Fallback YouTube music search
async function searchYouTubeMusic(query) {
    searchResults.innerHTML = `
        <div class="search-result">
            <h4>Search on YouTube</h4>
            <p>Click to search "${query}" on YouTube</p>
        </div>
    `;
    
    const resultDiv = searchResults.querySelector('.search-result');
    resultDiv.addEventListener('click', () => {
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}`;
        window.open(youtubeSearchUrl, '_blank');
    });
}

// Handle media loaded by other users
function handleRemoteMediaLoaded(data) {
    const { mediaType, url, duration, title, artist } = data;
    
    if (mediaType === 'youtube') {
        // Load YouTube video
        const videoId = extractYouTubeId(url);
        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
            
            // Clear existing media
            mediaPlayer.style.display = 'none';
            audioPlayer.style.display = 'none';
            
            // Create iframe for YouTube
            let youtubeFrame = document.getElementById('youtubeFrame');
            if (youtubeFrame) {
                youtubeFrame.remove();
            }
            
            youtubeFrame = document.createElement('iframe');
            youtubeFrame.id = 'youtubeFrame';
            youtubeFrame.src = embedUrl;
            youtubeFrame.width = '100%';
            youtubeFrame.height = '400';
            youtubeFrame.frameBorder = '0';
            youtubeFrame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            youtubeFrame.allowFullscreen = true;
            
            document.querySelector('.media-player').appendChild(youtubeFrame);
            
            currentMediaType = 'youtube';
            playPauseBtn.disabled = true;
            syncBtn.disabled = false;
            
            showNotification('YouTube video loaded by another user!', 'info');
        }
    } else if (url) {
        // Load direct URL
        const isVideo = mediaType === 'video';
        
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
        
        // Clear YouTube iframe if exists
        const youtubeFrame = document.getElementById('youtubeFrame');
        if (youtubeFrame) {
            youtubeFrame.remove();
        }
        
        currentMediaType = 'url';
        
        mediaElement.addEventListener('loadedmetadata', () => {
            duration.textContent = formatTime(mediaElement.duration);
            playPauseBtn.disabled = false;
            syncBtn.disabled = false;
        });
        
        mediaElement.addEventListener('timeupdate', updateProgress);
        mediaElement.addEventListener('ended', () => {
            playPauseBtn.textContent = 'Play';
        });
        
        const notificationText = title && artist 
            ? `Now playing: ${title} by ${artist}` 
            : `${isVideo ? 'Video' : 'Audio'} loaded by another user!`;
        
        showNotification(notificationText, 'info');
    } else {
        // File uploaded by another user
        showNotification('Media loaded by another user. They will control playback.', 'info');
        playPauseBtn.disabled = true;
        syncBtn.disabled = true;
    }
}

// Movie Search Functions
function openMovieModal() {
    movieModal.style.display = 'flex';
    movieSearchInput.focus();
}

function closeMovieModal() {
    movieModal.style.display = 'none';
    movieSearchInput.value = '';
    movieResults.innerHTML = '';
}

async function searchMovies() {
    const query = movieSearchInput.value.trim();
    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }

    movieResults.innerHTML = '<p>Searching movies...</p>';
    
    try {
        // Using free TMDB API alternative or search for Russian content
        let results = [];
        
        // Try to search for Russian content with different APIs
        await searchRussianMovies(query);
        
    } catch (error) {
        console.error('Movie search error:', error);
        searchYouTubeContent(query, 'movie');
    }
}

async function searchRussianMovies(query) {
    // Search for Russian movies and show popular options
    const russianMovies = [
        { title: '9 рота', year: '2005', genre: 'Военный', description: 'История о советских солдатах в Афганистане' },
        { title: 'Брат', year: '1997', genre: 'Драма', description: 'Культовый фильм о Данииле Багрове' },
        { title: 'Брат 2', year: '2000', genre: 'Драма', description: 'Продолжение истории Данила Багрова' },
        { title: 'Остров', year: '2006', genre: 'Драма', description: 'Духовная драма с Петром Мамоновым' },
        { title: 'Левиафан', year: '2014', genre: 'Драма', description: 'Современная русская драма' },
        { title: 'Дурак', year: '2014', genre: 'Драма', description: 'Социальная драма' },
        { title: 'Экипаж', year: '2016', genre: 'Катастрофа', description: 'Фильм о пилотах гражданской авиации' },
        { title: 'Движение вверх', year: '2017', genre: 'Спорт', description: 'О победе советской сборной по баскетболу' },
        { title: 'Т-34', year: '2018', genre: 'Военный', description: 'Военная драма о танкистах' },
        { title: 'Холоп', year: '2019', genre: 'Комедия', description: 'Комедия с Милошем Биковичем' }
    ];
    
    // Filter movies based on query
    const filteredMovies = russianMovies.filter(movie => 
        movie.title.toLowerCase().includes(query.toLowerCase()) ||
        movie.genre.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filteredMovies.length > 0) {
        displayMovieResults(filteredMovies);
    } else {
        // Show all popular movies if no specific match
        displayMovieResults(russianMovies.slice(0, 6));
    }
}

function displayMovieResults(movies) {
    movieResults.innerHTML = '';
    
    movies.forEach(movie => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result movie-result';
        resultDiv.innerHTML = `
            <h4>${movie.title} (${movie.year})</h4>
            <p><strong>Жанр:</strong> ${movie.genre}</p>
            <p>${movie.description}</p>
            <button class="search-movie-btn">🔍 Найти на YouTube</button>
            <button class="search-rutube-btn">🎬 Найти на RuTube</button>
        `;
        
        // YouTube search button
        const youtubeBtn = resultDiv.querySelector('.search-movie-btn');
        youtubeBtn.addEventListener('click', () => {
            const searchQuery = `${movie.title} ${movie.year} фильм полный`;
            const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            window.open(youtubeUrl, '_blank');
        });
        
        // RuTube search button
        const rutubeBtn = resultDiv.querySelector('.search-rutube-btn');
        rutubeBtn.addEventListener('click', () => {
            const searchQuery = `${movie.title} ${movie.year}`;
            const rutubeUrl = `https://rutube.ru/search/?query=${encodeURIComponent(searchQuery)}`;
            window.open(rutubeUrl, '_blank');
        });
        
        movieResults.appendChild(resultDiv);
    });
}

// Enhanced URL support for VK Video and RuTube
function isVKVideoUrl(url) {
    return url.includes('vk.com/video') || url.includes('vk.ru/video');
}

function isRuTubeUrl(url) {
    return url.includes('rutube.ru');
}

function extractVKVideoId(url) {
    const match = url.match(/video([0-9-_]+)/);
    return match ? match[1] : null;
}

function extractRuTubeId(url) {
    const match = url.match(/\/video\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

function loadVKVideo(url) {
    const videoId = extractVKVideoId(url);
    if (!videoId) {
        showNotification('Invalid VK Video URL', 'error');
        return;
    }

    // Clear existing media
    mediaPlayer.style.display = 'none';
    audioPlayer.style.display = 'none';
    
    // Create iframe for VK Video
    let vkFrame = document.getElementById('vkFrame');
    if (vkFrame) {
        vkFrame.remove();
    }
    
    vkFrame = document.createElement('iframe');
    vkFrame.id = 'vkFrame';
    vkFrame.src = `https://vk.com/video_ext.php?oid=${videoId.split('_')[0]}&id=${videoId.split('_')[1]}&hash=`;
    vkFrame.width = '100%';
    vkFrame.height = '400';
    vkFrame.frameBorder = '0';
    vkFrame.allowFullscreen = true;
    
    document.querySelector('.media-player').appendChild(vkFrame);
    
    currentMediaType = 'vk';
    playPauseBtn.disabled = true;
    syncBtn.disabled = false;
    
    showNotification('VK Video loaded!', 'success');
    
    // Notify other users
    socket.emit('mediaLoaded', {
        roomId: currentRoom,
        mediaType: 'vk',
        url: url
    });
}

function loadRuTubeVideo(url) {
    const videoId = extractRuTubeId(url);
    if (!videoId) {
        showNotification('Invalid RuTube URL', 'error');
        return;
    }

    // Clear existing media
    mediaPlayer.style.display = 'none';
    audioPlayer.style.display = 'none';
    
    // Create iframe for RuTube
    let rutubeFrame = document.getElementById('rutubeFrame');
    if (rutubeFrame) {
        rutubeFrame.remove();
    }
    
    rutubeFrame = document.createElement('iframe');
    rutubeFrame.id = 'rutubeFrame';
    rutubeFrame.src = `https://rutube.ru/play/embed/${videoId}`;
    rutubeFrame.width = '100%';
    rutubeFrame.height = '400';
    rutubeFrame.frameBorder = '0';
    rutubeFrame.allowFullscreen = true;
    
    document.querySelector('.media-player').appendChild(rutubeFrame);
    
    currentMediaType = 'rutube';
    playPauseBtn.disabled = true;
    syncBtn.disabled = false;
    
    showNotification('RuTube video loaded!', 'success');
    
    // Notify other users
    socket.emit('mediaLoaded', {
        roomId: currentRoom,
        mediaType: 'rutube',
        url: url
    });
}

// Enhanced loadMediaFromUrl function
function loadMediaFromUrlEnhanced() {
    const url = mediaUrlInput.value.trim();
    if (!url) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }

    closeUrlModal();
    
    // Check for different video platforms
    if (isYouTubeUrl(url)) {
        loadYouTubeVideo(url);
    } else if (isVKVideoUrl(url)) {
        loadVKVideo(url);
    } else if (isRuTubeUrl(url)) {
        loadRuTubeVideo(url);
    } else {
        loadDirectUrl(url);
    }
}

// YouTube content search fallback
function searchYouTubeContent(query, type) {
    const container = type === 'music' ? searchResults : movieResults;
    container.innerHTML = `
        <div class="search-result">
            <h4>Search on YouTube</h4>
            <p>Click to search "${query}" on YouTube</p>
        </div>
    `;
    
    const resultDiv = container.querySelector('.search-result');
    resultDiv.addEventListener('click', () => {
        const searchQuery = type === 'music' ? query + ' music' : query + ' фильм';
        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        window.open(youtubeSearchUrl, '_blank');
    });
}

// Session persistence
function saveSession() {
    const sessionData = {
        username: currentUser,
        roomId: currentRoom,
        timestamp: Date.now()
    };
    localStorage.setItem('syncWatchSession', JSON.stringify(sessionData));
}

function loadSession() {
    const savedSession = localStorage.getItem('syncWatchSession');
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            // Session expires after 24 hours
            if (Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
                if (sessionData.username) {
                    usernameInput.value = sessionData.username;
                }
                if (sessionData.roomId) {
                    roomIdInput.value = sessionData.roomId;
                }
                showNotification('Previous session restored!', 'info');
            } else {
                localStorage.removeItem('syncWatchSession');
            }
        } catch (e) {
            localStorage.removeItem('syncWatchSession');
        }
    }
}

// Update loadMediaFromUrl to use enhanced version
function updateLoadMediaFromUrl() {
    loadUrlBtn.removeEventListener('click', loadMediaFromUrl);
    loadUrlBtn.addEventListener('click', loadMediaFromUrlEnhanced);
}

// Enhanced initialization
function initEnhanced() {
    setupEventListeners();
    loadSession(); // Load previous session
    updateLoadMediaFromUrl(); // Use enhanced URL loading
    socket = io();
    setupSocketListeners();
    
    // Save session when user joins or creates room
    const originalCreateRoom = createRoom;
    const originalJoinRoom = joinRoom;
    
    window.createRoom = function() {
        originalCreateRoom();
        setTimeout(saveSession, 1000);
    };
    
    window.joinRoom = function() {
        originalJoinRoom();
        setTimeout(saveSession, 1000);
    };
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initEnhanced);
