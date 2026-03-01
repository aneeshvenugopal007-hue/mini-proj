// tracking.js - Handles Webcam and MediaPipe Face Tracking for Eye Movement

class EyeTracker {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');

        this.saccadesPerSec = 0;
        this.lastEyeX = 0;
        this.saccadeCount = 0;
        this.trackingActive = false;

        // MediaPipe setup
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // Needed for iris tracking
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults(this.onResults.bind(this));

        // Start 1-second interval to calculate saccades per second
        setInterval(() => {
            this.saccadesPerSec = this.saccadeCount;
            this.saccadeCount = 0;
            // Update UI if element exists
            const saccadeEl = document.getElementById('saccadeRate');
            if (saccadeEl) saccadeEl.innerText = this.saccadesPerSec;
        }, 1000);
    }

    async start() {
        // Start Webcam
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" }
                });
                this.video.srcObject = stream;

                // Once returning true, tell app it is connected
                this.video.onloadeddata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;

                    // Start MediaPipe
                    const camera = new Camera(this.video, {
                        onFrame: async () => {
                            if (this.trackingActive) {
                                await this.faceMesh.send({ image: this.video });
                            }
                        },
                        width: 640,
                        height: 480
                    });
                    camera.start();
                    this.trackingActive = true;
                };
                return true;
            } catch (err) {
                console.error("Error accessing webcam: ", err);
                return false;
            }
        }
    }

    stop() {
        this.trackingActive = false;
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }

    onResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw basic mesh
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Draw mesh
            drawConnectors(this.ctx, landmarks, FACEMESH_TESSELATION,
                { color: '#00f3ff22', lineWidth: 0.5 });

            // Draw eyes outlines
            drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#ff2a2a' });
            drawConnectors(this.ctx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#ff2a2a' });
            drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#00f3ff' });
            drawConnectors(this.ctx, landmarks, FACEMESH_LEFT_IRIS, { color: '#00f3ff' });

            // Calculate eye movement (Saccades detect rapid eye shifts)
            // Left Iris Center is index 468, Right Iris Center is 473
            if (landmarks[468]) {
                const currentEyeX = landmarks[468].x;
                const movement = Math.abs(currentEyeX - this.lastEyeX);

                // Threshold for a saccade (rapid shift)
                if (movement > 0.01) {
                    this.saccadeCount++;
                    // Trigger flash effect on canvas
                    this.ctx.fillStyle = 'rgba(255, 42, 42, 0.2)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }

                this.lastEyeX = currentEyeX;
            }
        }
    }
}

window.EyeTracker = EyeTracker;
