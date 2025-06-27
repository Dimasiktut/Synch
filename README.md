# Sync Watch App 🎵🎬

A real-time web application for synchronous music listening and movie watching with friends. Features include room-based collaboration, voice chat, and synchronized media playback.

## Features

### 🎵 **Enhanced Media Support**
- **Local File Upload**: Support for audio (MP3, WAV, etc.) and video (MP4, WebM, etc.) files
- **🆕 URL Media Loading**: Load videos and audio directly from any URL
- **🆕 YouTube Integration**: Watch YouTube videos together with embedded player
- **🆕 Music Search**: Search and play music tracks from online sources (Jamendo API)
- **Real-time Sync**: Automatic synchronization of play/pause/seek across all users

### 🗣️ **Improved Voice Chat**
- **🆕 Fixed Microphone Issues**: Microphone now works on first press (no double-click needed!)
- **Enhanced WebRTC**: Better connection handling and audio quality
- **Connection Status**: Real-time feedback on voice chat connections
- **Auto Audio Settings**: Echo cancellation, noise suppression, auto gain control

### 🏠 **Room Management**
- **Create/Join Rooms**: Easy room creation with custom or auto-generated IDs
- **User Presence**: See who's online in your room
- **Host Controls**: Room creators get additional control privileges
- **Seamless Switching**: Leave and join different rooms easily

### 💬 **Communication**
- **Live Text Chat**: Real-time messaging within rooms
- **System Messages**: Notifications for user joins/leaves
- **Message History**: Persistent chat during session

### 📱 **User Experience**
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **🆕 Modal Interfaces**: Clean popups for URL input and music search
- **Error Handling**: Comprehensive error messages and user guidance
- **Notifications**: Real-time feedback for all actions

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO
- **Voice Chat**: WebRTC
- **Media Support**: HTML5 Audio/Video APIs

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Modern web browser with WebRTC support

## Installation

1. **Clone or download the project**
   ```bash
   cd sync-watch-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Or start the production server:
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Getting Started

1. **Enter your username** on the landing page
2. **Create a new room** or **join an existing room** using a room ID
3. **Upload media files** (audio or video) to share with the room
4. **Control playback** - play, pause, and seek will sync across all users
5. **Enable voice chat** by clicking the microphone button
6. **Chat with friends** using the text chat feature

### Room Management

- **Creating a Room**: Click "Create Room" with an optional custom room ID
- **Joining a Room**: Enter an existing room ID and click "Join Room"  
- **Room Host**: The first person to create a room becomes the host
- **Auto-Host Transfer**: If the host leaves, hosting automatically transfers

### Media Controls

#### 📁 **File Upload**
- **Upload**: Support for audio (MP3, WAV, etc.) and video (MP4, WebM, etc.) files
- **Play/Pause**: Synchronized across all room members
- **Sync Button**: Manually sync your playback with the room
- **Progress Bar**: Visual indicator of playback progress

#### 🔗 **URL Media Loading (NEW)**
- **Add URL Button**: Click "🔗 Add URL" to load media from any direct link
- **Supported Formats**: Direct video/audio links (MP4, MP3, WebM, etc.)
- **YouTube Videos**: Paste any YouTube URL to watch together
- **Auto-Detection**: Automatically determines if URL is video or audio
- **Error Handling**: Fallback options if URL fails to load

#### 🎵 **Music Search (NEW)**
- **Search Music Button**: Click "🎵 Search Music" to find tracks
- **Free Music Database**: Search through Jamendo's free music library
- **Track Information**: See song title, artist, and duration
- **One-Click Play**: Click any search result to load and play
- **YouTube Fallback**: If no results found, option to search YouTube

#### 📺 **YouTube Integration (NEW)**
- **Full YouTube Support**: Embedded YouTube player with all controls
- **URL Formats**: Supports youtube.com and youtu.be links
- **Shared Viewing**: All users see the same video simultaneously
- **Native Controls**: Use YouTube's built-in player controls

### Voice Chat

- **WebRTC-based**: Peer-to-peer voice communication
- **Microphone Toggle**: Enable/disable your microphone
- **Automatic Setup**: No additional configuration required

## File Structure

```
sync-watch-app/
├── public/
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Application styles
│   └── script.js           # Frontend JavaScript
├── server.js               # Node.js server with Socket.IO
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables
└── README.md              # This file
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
```

## Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-restart
- `npm run build` - Build the application (if using webpack)

### Adding Features

The application is designed to be easily extensible:

- **Media Support**: Add new media formats in `script.js`
- **Chat Features**: Extend chat functionality in both client and server
- **UI Improvements**: Modify `styles.css` for visual enhancements
- **Server Features**: Add new Socket.IO events in `server.js`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

WebRTC features require HTTPS in production environments.

## Deployment

### Local Network

To allow access from other devices on your network:

1. Find your local IP address
2. Start the server: `npm start`
3. Access from other devices: `http://YOUR_IP:3000`

### Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Configure reverse proxy (nginx/Apache)
4. Enable HTTPS for WebRTC functionality
5. Consider using a TURN server for better connectivity

## Troubleshooting

### Common Issues

**Media not syncing:**
- Check if all users are in the same room
- Use the "Sync" button to manually synchronize
- Ensure media file is properly loaded

**Voice chat not working:**
- Allow microphone permissions in browser
- Check network connectivity
- Ensure HTTPS in production

**Connection issues:**
- Check firewall settings
- Verify Socket.IO connection in browser console
- Ensure port 3000 is available

### Performance Tips

- Use compressed media files for better streaming
- Limit room size for optimal voice chat performance
- Close unused browser tabs to free resources

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- User authentication and profiles
- Playlist management
- Screen sharing capabilities
- Mobile app versions
- Advanced room permissions
- Media streaming from URLs
- Recording functionality

---

**Happy watching together! 🎬🍿**
