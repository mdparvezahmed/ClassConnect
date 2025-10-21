// Global variables
let localStream = null;
let peerConnection = {};
let ws = null;
let isHost = false;

//DOM
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const localVideo = document.getElementById('localVideo');
const statusElement = document.getElementById('status');
const connectionStatusElement = document.getElementById('connectionStatus');
const viewersCountElement = document.getElementById('viewerCount');

// WebRTC configuration with public STUN servers
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/host/`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connection established');
        connectionStatusElement.textContent = 'Connected';
        connectionStatusElement.style.color = 'green';
        ws.send(JSON.stringify({
            type: 'host-redy'
        }));

    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        await handleSignalMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        connectionStatusElement.textContent = 'Disconnected';
        connectionStatusElement.style.color = 'red';
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatusElement.textContent = 'Error';
        connectionStatusElement.style.color = 'red';
    };
}

//Handle incoming WebRTC signaling messages

async function handleSignalMessage(data) {
    const { type, answer, candidate, viewerId, count, message } = data;

    if (type === "error") {
        console.log("error: ", message);
    } else if (type === 'viewer-count') {
        console.log(`Viewers connected: ${count}`);
        if (viewersCountElement) {
            viewersCountElement.textContent = count;
            viewersCountElement.style.color = count > 0 ? 'green' : 'black';
        }
    } else if (type === 'viewer-joined') {
        console.log(`Viewer joined: ${viewerId}`);
        if (localStream) {
            await createPeerConnection(viewerId);
        }
    } else if (type === 'answer') {
        console.log(`Received answer from viewer: ${viewerId}`);
        const pc = peerConnection[viewerId];
        if (pc && pc.signalingState !== 'stable') {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`Remote description set for viewer ${viewerId}`);
            } catch (error) {
                console.error(`Error setting remote description for viewer ${viewerId}:`, error);
            }
        }
    } else if (type === 'ice-candidate' && candidate) {
        console.log(`Received ICE candidate from viewer: ${viewerId}`);
        const pc = peerConnection[viewerId];
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`ICE candidate added for viewer ${viewerId}`);
            } catch (error) {
                console.error(`Error adding ICE candidate for viewer ${viewerId}:`, error);
            }
        }
    }
}

//Create a peer connection for a viewer

createPeerConnection = async (viewerId) => {
    console.log(`Creating peer connection for viewer: ${viewerId}`);
    if (peerConnection[viewerId]) {
        console.log(`Peer connection already exists for viewer: ${viewerId}`);
        return;
    }
    const pc = new RTCPeerConnection(configuration);
    peerConnection[viewerId] = pc;

    localStream.getTracks().forEach(track => {
        console.log(`Adding track: ${track.kind}`);
        pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`Sending ICE candidate to viewer: ${viewerId}`);
            ws.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate,
                viewerId: viewerId
            }));
        }
    };

    pc.onconnectionstatechange = () => {
        console.log(`Connection state with viewer ${viewerId}: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            console.log(`Viewer ${viewerId} connected`);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            console.log(`Viewer ${viewerId} disconnected`);
            if (peerConnection[viewerId]) {
                peerConnection[viewerId].close();
                delete peerConnection[viewerId];
            }
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with viewer ${viewerId}: ${pc.iceConnectionState}`);
    };

    try {
        const offer = await pc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);
        console.log(`Sending offer to viewer: ${viewerId}`);
        ws.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            viewerId: viewerId
        }));

    } catch (error) {
        console.error(`Error creating offer for viewer ${viewerId}:`, error);
    }
};

//Start screen sharing
async function startScreenShare() {
    try {
        console.log('Starting screen share');
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: false
        });

        localVideo.srcObject = localStream;

        if (statusElement) {
            statusElement.textContent = 'Sharing';
            statusElement.style.color = 'green';
        }
        startButton.disabled = true;
        stopButton.disabled = false;

        connectWebSocket();

        localStream.getVideoTracks()[0].onended = () => {
            console.log('Screen sharing stopped by user');
            stopScreenShare();
        }
        console.log('Screen share started successfully');



    } catch (error) {
        console.error('Error starting screen share:', error);
        alert("Failed to start screen sharing. Please try again.");
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.style.color = 'red';
        }
    }
}

function stopScreenShare() {
    console.log('Stopping screen share');

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;

    Object.values(peerConnection).forEach(pc => pc.close());
    peerConnection = {};

    if (ws) {
        ws.close();
        ws = null;
    }
    if (statusElement) {
        statusElement.textContent = 'Not Sharing';
        statusElement.style.color = 'red';
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    connectionStatusElement.textContent = 'Disconnected';
    connectionStatusElement.style.color = 'red';
    viewersCountElement.textContent = '0';
    console.log('Screen share stopped');
}

// Add event listeners only if elements exist
if (startButton) {
    startButton.addEventListener('click', startScreenShare);
    console.log('Start button event listener added');
} else {
    console.error('Start button not found');
}

if (stopButton) {
    stopButton.addEventListener('click', stopScreenShare);
    console.log('Stop button event listener added');
} else {
    console.error('Stop button not found');
}

console.log('Host script loaded successfully');