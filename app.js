// app.js - Main Application Controller combining UI, Serial, and Tracking

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const views = {
        setup: document.getElementById('setupView'),
        calibration: document.getElementById('calibrationView'),
        analysis: document.getElementById('analysisView'),
        results: document.getElementById('resultsView')
    };

    // Inputs
    const subjectNameInput = document.getElementById('subjectName');
    const crimeDetailsInput = document.getElementById('crimeDetails');

    // Buttons
    const btnConnectHardware = document.getElementById('btnConnectHardware');
    const btnStartCalibration = document.getElementById('btnStartCalibration');
    const btnNextCalibration = document.getElementById('btnNextCalibration');
    const btnBeginAnalysis = document.getElementById('btnBeginAnalysis');
    const btnNextAnalysis = document.getElementById('btnNextAnalysis');
    const btnEndAnalysis = document.getElementById('btnEndAnalysis');
    const btnReset = document.getElementById('btnReset');

    // UI Feedback
    const pulseCanvas = document.getElementById('pulseCanvas');
    const bpmValue = document.getElementById('bpmValue');
    const webcamVideo = document.getElementById('webcamVideo');
    const trackingCanvas = document.getElementById('trackingCanvas');
    const hardwareStatus = document.querySelector('.hardware-status .dot');
    const cameraStatus = document.querySelector('.camera-status .dot');
    const aiStatus = document.querySelector('.ai-status .dot');

    // App State Control
    let eyeTracker = null;
    let currentCalibQuestion = 0;
    let currentAnalysisQuestion = 0;
    let analysisInterval = null;

    // Canvas contexts
    const pulseCtx = pulseCanvas.getContext('2d');

    // Resize canvases
    function resizeCanvases() {
        pulseCanvas.width = pulseCanvas.parentElement.clientWidth;
        pulseCanvas.height = pulseCanvas.parentElement.clientHeight;
    }
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // --- Graph Rendering ---
    function drawPulseGraph(buffer) {
        pulseCtx.clearRect(0, 0, pulseCanvas.width, pulseCanvas.height);

        // Draw grid
        pulseCtx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
        pulseCtx.lineWidth = 1;
        pulseCtx.beginPath();
        for (let i = 0; i < pulseCanvas.height; i += 20) {
            pulseCtx.moveTo(0, i);
            pulseCtx.lineTo(pulseCanvas.width, i);
        }
        pulseCtx.stroke();

        // Draw data
        pulseCtx.strokeStyle = '#00f3ff';
        pulseCtx.lineWidth = 2;
        pulseCtx.beginPath();

        const step = pulseCanvas.width / buffer.length;

        // Find min/max to normalize
        let min = Math.min(...buffer.filter(v => v > 0));
        let max = Math.max(...buffer);
        if (min === max) { min = 0; max = 1023; } // fallback
        const range = max - min || 1;

        for (let i = 0; i < buffer.length; i++) {
            const val = buffer[i];
            const x = i * step;
            // Normalize and scale to height
            const normalized = (val - min) / range;
            const y = pulseCanvas.height - (normalized * (pulseCanvas.height - 20)) - 10;

            if (i === 0) pulseCtx.moveTo(x, y);
            else pulseCtx.lineTo(x, y);
        }
        pulseCtx.stroke();
    }

    // --- Hardware Events ---
    window.customSerial.onConnect(() => {
        hardwareStatus.className = 'dot green';
        hardwareStatus.parentElement.dataset.tooltip = 'Arduino Connected (COM Port)';
        btnConnectHardware.textContent = "[CONNECTED]";
        btnConnectHardware.classList.add('primary');
        btnConnectHardware.classList.remove('secondary');
        checkSetupReady();
    });

    window.customSerial.onDisconnect(() => {
        hardwareStatus.className = 'dot red';
        hardwareStatus.parentElement.dataset.tooltip = 'Hardware Disconnected';
        btnConnectHardware.textContent = "[+] CONNECT COM PORT";
        btnConnectHardware.classList.remove('primary');
        btnConnectHardware.classList.add('secondary');
        checkSetupReady();
    });

    window.customSerial.onData((bpm, buffer, raw) => {
        bpmValue.textContent = bpm;
        drawPulseGraph(buffer);
    });

    // --- UI Logic ---
    function switchView(viewName) {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
    }

    function checkSetupReady() {
        if (subjectNameInput.value.trim() !== '' &&
            crimeDetailsInput.value.trim() !== '' &&
            window.customSerial.connected) {
            btnStartCalibration.disabled = false;
        } else {
            // Enable it anyway for testing if fields are filled, even without hardware
            if (subjectNameInput.value.trim() !== '' && crimeDetailsInput.value.trim() !== '') {
                btnStartCalibration.disabled = false;
            } else {
                btnStartCalibration.disabled = true;
            }
        }
    }

    subjectNameInput.addEventListener('input', checkSetupReady);
    crimeDetailsInput.addEventListener('input', checkSetupReady);

    btnConnectHardware.addEventListener('click', async () => {
        if (!window.customSerial.connected) {
            // If the user cancels the serial prompt or browser doesn't support it,
            // fallback to mockup mode for demonstration purposes.
            try {
                if (navigator.serial) {
                    const success = await window.customSerial.connect();
                    if (!success) window.customSerial.testConnection();
                } else {
                    alert("Web Serial API not supported in this browser. Running in Simulation Mode.");
                    window.customSerial.testConnection();
                }
            } catch (e) {
                window.customSerial.testConnection();
            }
        }
    });

    btnStartCalibration.addEventListener('click', async () => {
        // Init AI Engine
        window.aiEngine.setContext(crimeDetailsInput.value);
        aiStatus.className = 'dot green';
        aiStatus.parentElement.dataset.tooltip = 'AI Engine Active';

        switchView('calibration');

        // Start Webcam if not started
        if (!eyeTracker) {
            eyeTracker = new window.EyeTracker(webcamVideo, trackingCanvas);
            const camSuccess = await eyeTracker.start();
            if (camSuccess) {
                cameraStatus.className = 'dot green';
                cameraStatus.parentElement.dataset.tooltip = 'Webcam Active';
            }
        }

        // Set first question
        const qEl = document.getElementById('calibrationQuestion');
        qEl.textContent = window.aiEngine.getQuestion(true, 0);
        updateCalibrationProgress();
    });

    function updateCalibrationProgress() {
        const total = window.aiEngine.baseQuestions.length;
        const percent = ((currentCalibQuestion) / total) * 100;
        document.getElementById('calibrationProgress').style.width = `${percent}%`;
        document.getElementById('calibrationProgressText').textContent = `${Math.round(percent)}%`;

        if (currentCalibQuestion >= total) {
            btnNextCalibration.classList.add('hidden');
            btnBeginAnalysis.classList.remove('hidden');
            document.getElementById('calibrationQuestion').textContent = "BASELINE ESTABLISHED. READY FOR INVESTIGATION.";
            document.getElementById('calibrationQuestion').style.color = "var(--neon-green)";
        } else {
            document.getElementById('calibrationQuestion').textContent = window.aiEngine.getQuestion(true, currentCalibQuestion);
        }
    }

    btnNextCalibration.addEventListener('click', () => {
        currentCalibQuestion++;
        updateCalibrationProgress();
        // Force calibrate sample on button click
        window.aiEngine.calibrateBaseline(
            window.customSerial.pulseBuffer,
            window.customSerial.currentBpm,
            eyeTracker ? eyeTracker.saccadesPerSec : 0
        );
    });

    // --- Active Analysis Phase ---
    btnBeginAnalysis.addEventListener('click', () => {
        switchView('analysis');
        currentAnalysisQuestion = 0;
        document.getElementById('analysisQuestion').textContent = window.aiEngine.getQuestion(false, 0);

        // Start realtime analysis tick loop
        startAnalysisLoop();
    });

    btnNextAnalysis.addEventListener('click', () => {
        currentAnalysisQuestion++;
        const nextQ = window.aiEngine.getQuestion(false, currentAnalysisQuestion);
        if (nextQ) {
            document.getElementById('analysisQuestion').textContent = nextQ;
        } else {
            // No more questions
            document.getElementById('analysisQuestion').textContent = "ALL QUESTIONS EXHAUSTED.";
            btnNextAnalysis.disabled = true;
        }
    });

    btnEndAnalysis.addEventListener('click', () => {
        clearInterval(analysisInterval);
        showResults();
    });

    function startAnalysisLoop() {
        const stressFill = document.getElementById('stressFill');
        const eyeShiftScore = document.getElementById('eyeShiftScore');
        const ptvScore = document.getElementById('ptvScore');

        analysisInterval = setInterval(() => {
            const saccades = eyeTracker ? eyeTracker.saccadesPerSec : 0;
            const bpm = window.customSerial.currentBpm;

            const stress = window.aiEngine.analyzeRealTme(bpm, saccades);

            // UI Updates
            stressFill.style.width = stress + '%';
            if (stress > 70) stressFill.style.background = 'var(--neon-red)';
            else if (stress > 30) stressFill.style.background = 'var(--neon-yellow)';
            else stressFill.style.background = '#00ff00';

            // Eye text
            if (saccades > 3) {
                eyeShiftScore.textContent = "ERRATIC";
                eyeShiftScore.style.color = "var(--neon-red)";
            } else {
                eyeShiftScore.textContent = "NORMAL";
                eyeShiftScore.style.color = "var(--neon-blue)";
            }

            // Pulse text
            const diff = bpm - window.aiEngine.avgBaselinePulse;
            if (diff > 15) {
                ptvScore.textContent = "PEAK";
                ptvScore.style.color = "var(--neon-red)";
            } else {
                ptvScore.textContent = "STABLE";
                ptvScore.style.color = "var(--neon-blue)";
            }

        }, 1000);
    }

    // --- Results Phase ---
    function showResults() {
        switchView('results');
        aiStatus.className = 'dot yellow';

        const resultData = window.aiEngine.calculateFinalProbability();
        const probText = document.getElementById('finalProbability');
        const probCircle = document.getElementById('probCircle');
        const rationaleList = document.getElementById('rationaleList');

        // Animate Probability Number
        let currentProb = 0;
        const targetProb = parseFloat(resultData.probability);
        const animInterval = setInterval(() => {
            currentProb += targetProb / 40; // 40 steps
            if (currentProb >= targetProb) {
                currentProb = targetProb;
                clearInterval(animInterval);
            }
            probText.textContent = currentProb.toFixed(1);
        }, 50);

        // Set Circle
        requestAnimationFrame(() => {
            probCircle.style.strokeDasharray = `${targetProb}, 100`;
            if (targetProb > 70) probCircle.style.stroke = "var(--neon-red)";
            else if (targetProb > 40) probCircle.style.stroke = "var(--neon-yellow)";
            else probCircle.style.stroke = "#00ff00";
        });

        // Set Rationale
        rationaleList.innerHTML = '';
        resultData.reasons.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            rationaleList.appendChild(li);
        });
    }

    btnReset.addEventListener('click', () => {
        location.reload(); // Quickest way to safely reset all states
    });

});
