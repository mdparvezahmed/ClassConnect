


//global variables
let peerConnection = null;
let ws = null;
let viewerId = 'viewer_' + Math.random().toString(36).substring(2, 9);

//DOM elements
const remoteVideo = document.getElementById('remoteVideo');
const connectionStatusElement = document.getElementById('connectionStatus');
const streamStatusElement = document.getElementById('streamStatus');
const fullscreenButton = document.getElementById('fullscreenButton');
const videoContainer = document.getElementById('videoContainer');

//WebRTC configuration with public STUN servers
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

//initialize WebSocket connection

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/viewer/`;
    console.log("Connecting to WebSocket:", wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connection established');
        connectionStatusElement.textContent = 'Connected';
        connectionStatusElement.style.color = 'green';

        ws.send(JSON.stringify({
            type: 'viewer-joined',
            viewerId: viewerId
        }));

        streamStatusElement.textContent = 'Streaming';
        streamStatusElement.style.color = 'green';
    }

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        await handleSignalMessage(data);
    }

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        connectionStatusElement.textContent = 'Disconnected';
        connectionStatusElement.style.color = 'red';
        streamStatusElement.textContent = 'Connection Lost';
        streamStatusElement.style.color = 'red';

        setTimeout(connectWebSocket, 2000);

    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatusElement.textContent = 'Error';
        connectionStatusElement.style.color = 'red';

    };
}


//Handle incoming WebRTC signaling messages

async function handleSignalMessage(data) {
    const { type, offer, candidate, viewerId } = data;

    if (type === 'offer') {
        console.log(`Received offer from host`);
        await handleOffer(offer);
    } else if (type === 'ice-candidate' && candidate) {
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added ICE candidate from host');
            } catch (error) {
                console.log('Error adding ICE candidate:', error);
            }
        } else {
            console.log('PeerConnection not established yet. Cannot add ICE candidate.');
        }

    } else if (type === 'host-ready') {
        console.log('Host is ready. Sending viewer-joined message.');
        streamStatusElement.textContent = 'Streaming';
        streamStatusElement.style.color = 'green';
    } else if (type === 'host-stopped') {
        console.log('Host has stopped the stream.');
        streamStatusElement.textContent = 'Host Stopped sharing';
        streamStatusElement.style.color = 'red';

        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        setTimeout(() => {
            streamStatusElement.textContent = 'Waiting for Host...';
            streamStatusElement.style.color = 'orange';
        }, 2000);

    }
}

//handle offer form host and create answer
async function handleOffer(offer) {
    try {
        console.log("Processing offer form host");
        if (!peerConnection) {
            createPeerConnection();
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Set remote description with offer from host");

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log("Created and set local description with answer");

        console.log("Sending answer back to host");
        ws.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            viewerId: viewerId
        }));

        streamStatusElement.textContent = 'Connecting to stream...';
        streamStatusElement.style.color = 'orange';


    } catch (error) {
        console.error("Error handling offer:", error);
        streamStatusElement.textContent = 'Error connecting to stream';
        streamStatusElement.style.color = 'red';
    }
}


//create peer connection and setup event handlers
function createPeerConnection() {
    console.log("Creating PeerConnection");
    peerConnection = new RTCPeerConnection(configuration);


    peerConnection.ontrack = (event) => {
        console.log("Received remote track from host");
        remoteVideo.srcObject = event.streams[0];
        streamStatusElement.textContent = 'Streaming';
        streamStatusElement.style.color = 'green';
    };


    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate to host");
            ws.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate,
                viewerId: viewerId
            }));
        } else {
            console.log("All ICE candidates have been sent");
        }

    };

    peerConnection.onconnectionstatechange = () => {
        console.log("PeerConnection state changed to:", peerConnection.connectionState);

        switch (peerConnection.connectionState) {
            case 'connected':
                streamStatusElement.textContent = 'Connected';
                streamStatusElement.style.color = 'green';
                break;
            case 'disconnected':
                streamStatusElement.textContent = 'Disconnected';
                streamStatusElement.style.color = 'red';
                break;
            case 'failed':
                streamStatusElement.textContent = 'Connection failed';
                streamStatusElement.style.color = 'red';
                // Try to reconnect
                setTimeout(() => {
                    if (peerConnection) {
                        peerConnection.close();
                        peerConnection = null;
                    }
                }, 3000);
                break;
            case 'closed':
                streamStatusElement.textContent = 'Connection closed';
                streamStatusElement.style.color = 'lightgray';
                break;
        }

    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state changed to:", peerConnection.iceConnectionState);
    }

}


//fullscreen button handler

function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitFullscreenElement) {
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) {
            videoContainer.msRequestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) {
            videoContainer.mozRequestFullScreen();
        }
        fullscreenButton.textContent = '⛶';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
        fullscreenButton.textContent = '⛶';
    }
}

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenButton.textContent = '✕';
    } else {
        fullscreenButton.textContent = '⛶';
    }
});

document.addEventListener('webkitfullscreenchange', () => {
    if (document.webkitFullscreenElement) {
        fullscreenButton.textContent = '✕';
    } else {
        fullscreenButton.textContent = '⛶';
    }
});


fullscreenButton.addEventListener('click', toggleFullscreen);

//auto-connect on page load
window.addEventListener('load', () => {
    console.log('viewer.js loaded');
    connectWebSocket(); 
});

