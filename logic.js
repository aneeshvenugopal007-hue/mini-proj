// logic.js - Core application logic, mock AI generation, and deception probability calculation

class AIEngine {
    constructor() {
        this.baseQuestions = [
            "What is your full name?",
            "What is your date of birth?",
            "Where do you live?",
            "Are you currently employed?"
        ];

        // Mock generative responses based on context
        this.investigationQuestions = [];
        this.currentContext = "";

        // Final metrics for probability
        this.avgBaselinePulse = 0;
        this.avgBaselineSaccades = 0;

        this.anomalyCount = 0;
        this.totalAnalysisTicks = 0;

        // Reasons for final report
        this.rationale = [];
    }

    setContext(context) {
        this.currentContext = context;
        this.generateContextualQuestions(context);
    }

    generateContextualQuestions(context) {
        // Mock generation based on keywords
        this.investigationQuestions = [
            "Can you describe your exact whereabouts during the time of the incident?",
            `You mentioned "${context.substring(0, 20)}...". Can you elaborate on that?`,
            "Have you ever met the individuals involved beforehand?",
            "Is there any reason your fingerprints or digital footprint would be found at the scene?",
            "Are you withholding any information regarding the events of that day?",
            "Look directly at the camera. Did you commit the act in question?"
        ];
    }

    getQuestion(isCalibration, index) {
        if (isCalibration) {
            return index < this.baseQuestions.length ? this.baseQuestions[index] : null;
        } else {
            return index < this.investigationQuestions.length ? this.investigationQuestions[index] : null;
        }
    }

    calibrateBaseline(pulseBuffer, currentBpm, saccadesPerSec) {
        // Average the buffer
        let sum = 0;
        let validPoints = 0;
        for (let p of pulseBuffer) {
            if (p > 0) { sum += p; validPoints++; }
        }
        const avgRaw = validPoints > 0 ? (sum / validPoints) : 0;

        // In a real scenario, baseline logic would run over ~30 seconds.
        this.avgBaselinePulse = currentBpm;
        this.avgBaselineSaccades = saccadesPerSec || 1;
    }

    analyzeRealTme(currentBpm, saccadesPerSec) {
        let stressScore = 0;
        this.totalAnalysisTicks++;

        // 1. Analyze Pulse
        const bpmDiff = currentBpm - this.avgBaselinePulse;
        if (bpmDiff > 15) {
            stressScore += 40; // High sudden spike
            if (this.totalAnalysisTicks % 10 === 0) this.rationale.push(`Sudden cardiovascular spike detected: +${bpmDiff} BPM above baseline.`);
        } else if (bpmDiff > 5) {
            stressScore += 15; // Moderate elevation
        }

        // 2. Analyze Eye Movement (Saccades)
        // High saccades during answering can indicate cognitive load / deception
        if (saccadesPerSec > this.avgBaselineSaccades * 2.5) {
            stressScore += 40;
            if (this.totalAnalysisTicks % 15 === 0) this.rationale.push(`Irregular eye shifts (saccadic rate: ${saccadesPerSec}/sec) indicating high cognitive load.`);
        } else if (saccadesPerSec > this.avgBaselineSaccades * 1.5) {
            stressScore += 20;
        }

        // Register anomaly
        if (stressScore > 50) {
            this.anomalyCount++;
        }

        // Cap stress score for UI
        return Math.min(100, Math.max(0, stressScore));
    }

    calculateFinalProbability() {
        // Base probability based on anomalies
        let prob = (this.anomalyCount / (this.totalAnalysisTicks || 1)) * 100 * 3.5; // Multiplier to make it look realistic

        // Ensure within bounds
        prob = Math.min(99.9, Math.max(0.1, prob));

        // Ensure unique rationale
        this.rationale = [...new Set(this.rationale)].slice(0, 4);

        if (prob > 75) {
            this.rationale.push("Overall biometric profile strongly correlates with deceptive behavior signatures.");
        } else if (prob > 40) {
            this.rationale.push("Inconclusive variations detected. Moderate stress responses observed.");
        } else {
            this.rationale.push("Biometric baseline remained stable. No significant indicators of deception.");
        }

        return {
            probability: prob.toFixed(1),
            reasons: this.rationale
        };
    }
}

window.aiEngine = new AIEngine();
