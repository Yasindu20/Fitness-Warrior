import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decode as base64Decode } from 'base-64';
import { MODEL_JSON } from '../modelData';
import { MODEL_WEIGHTS_BASE64 } from '../modelWeights';

class ModelService {
    constructor() {
        this.model = null;
        this.isModelReady = false;
        this.lastStepTime = 0;
        this.refractoryPeriod = 600; // Balanced value between original and strict
        this.predictionThreshold = 0.18; // Lowered to match your device's typical values (based on logs)
        this.consecutiveHighPredictions = 0;
        this.requiredConsecutiveHighs = 1; // Back to 1 to ensure steps are detected
        this.motionDetectionThreshold = 0.008; // Keep this the same as it's working
        this.motionBuffer = []; // Buffer to store recent motion intensity values
        this.motionBufferSize = 8; // Increased from 5 to 8 for more stable motion detection
        this.isInMotion = false; // Track if user is in motion
        this.debugMode = true; // Set to true to see more detailed logs

        // New: Add peak detection to identify real steps
        this.peakDetection = {
            values: [],
            bufferSize: 15,
            minPeakHeight: 0.12, // Lowered to detect more peaks
            minPeakDistance: 6 // Reduced to detect steps that are closer together
        };

        // New: Add step pattern matching
        this.stepPatternMatching = {
            enabled: true,
            minAccelPeak: 0.2, // Minimum acceleration peak for potential step
            timeBetweenSteps: {
                min: 400, // Minimum time between steps in ms
                max: 2000  // Maximum time between steps in ms
            }
        };
    }

    async loadModel() {
        try {
            // Wait for TensorFlow.js to be ready
            await tf.ready();
            console.log('TensorFlow.js is ready');
            console.log('TensorFlow.js version:', tf.version.tfjs);

            // Fix the input layer issue and weight mapping by modifying the model topology
            const fixedModelJSON = this.fixModelConfig(MODEL_JSON);

            // Convert base64 weights to array buffer
            const weightsBuffer = this.base64ToArrayBuffer(MODEL_WEIGHTS_BASE64);

            // Create model artifacts with fixed model topology
            const modelArtifacts = {
                modelTopology: fixedModelJSON.modelTopology,
                format: fixedModelJSON.format,
                generatedBy: fixedModelJSON.generatedBy,
                convertedBy: fixedModelJSON.convertedBy,
                weightSpecs: fixedModelJSON.weightsManifest[0].weights,
                weightData: weightsBuffer
            };

            // Log structure for debugging
            console.log('Model structure:', JSON.stringify({
                format: fixedModelJSON.format,
                modelTopologyKeys: Object.keys(fixedModelJSON.modelTopology),
                weightsManifestLength: fixedModelJSON.weightsManifest.length,
                weightSpecs: fixedModelJSON.weightsManifest[0].weights.map(w => w.name)
            }));

            // Load the model
            this.model = await tf.loadLayersModel(tf.io.fromMemory(modelArtifacts));

            console.log('Model loaded successfully');

            // Warm up the model
            const dummyInput = tf.ones([1, 50, 6]);
            const warmupResult = this.model.predict(dummyInput);
            warmupResult.dispose();
            dummyInput.dispose();

            this.isModelReady = true;
            return true;
        } catch (error) {
            console.error('Failed to load model:', error);
            console.error('Error details:', error.message);
            return false;
        }
    }

    // Fix the model configuration including input layer and weight mapping
    fixModelConfig(modelJSON) {
        // Create a deep copy of the model JSON
        const fixedModelJSON = JSON.parse(JSON.stringify(modelJSON));

        try {
            // Fix input layer shape
            if (fixedModelJSON.modelTopology &&
                fixedModelJSON.modelTopology.model_config &&
                fixedModelJSON.modelTopology.model_config.config &&
                fixedModelJSON.modelTopology.model_config.config.layers) {

                const layers = fixedModelJSON.modelTopology.model_config.config.layers;

                // Find input layer and fix its config
                const inputLayer = layers.find(layer => layer.class_name === "InputLayer");
                if (inputLayer && inputLayer.config) {
                    // Convert batch_shape to batchInputShape if needed
                    if (inputLayer.config.batch_shape && !inputLayer.config.batchInputShape) {
                        inputLayer.config.batchInputShape = inputLayer.config.batch_shape;
                    }

                    // Remove inputShape if it exists (to avoid the error from before)
                    if (inputLayer.config.inputShape) {
                        delete inputLayer.config.inputShape;
                    }

                    console.log('Fixed InputLayer config:', inputLayer.config);
                }

                // Fix layer names to match the weight names in the manifest
                layers.forEach(layer => {
                    if (layer.config && layer.config.name) {
                        // Store original name for debugging
                        layer.config.original_name = layer.config.name;
                    }
                });
            }

            // Fix the weights manifest to match the expected pattern
            if (fixedModelJSON.weightsManifest && fixedModelJSON.weightsManifest.length > 0) {
                // Get the weights array
                const weights = fixedModelJSON.weightsManifest[0].weights;

                // Update each weight name to remove the "sequential_1/" prefix if needed
                weights.forEach(weight => {
                    // Store original name for debugging
                    const originalName = weight.name;

                    // Remove the "sequential_1/" prefix if it exists
                    weight.name = weight.name.replace('sequential_1/', '');

                    console.log(`Weight mapping: ${originalName} -> ${weight.name}`);
                });
            }
        } catch (err) {
            console.error('Error fixing model config:', err);
        }

        return fixedModelJSON;
    }

    // Helper function to convert base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        try {
            // For React Native
            if (typeof base64Decode === 'function') {
                const binaryString = base64Decode(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            }
            // For web
            else {
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            }
        } catch (error) {
            console.error('Error in base64 conversion:', error);
            throw error;
        }
    }

    // Calculate motion intensity from sensor data
    calculateMotionIntensity(windowData) {
        // Extract only accelerometer data (first 3 columns)
        const accelX = windowData.map(d => d[0]);
        const accelY = windowData.map(d => d[1]);
        const accelZ = windowData.map(d => d[2]);

        // Calculate variance for each axis
        const varX = this.calculateVariance(accelX);
        const varY = this.calculateVariance(accelY);
        const varZ = this.calculateVariance(accelZ);

        // Sum of variances as motion intensity
        const sumAccelVar = varX + varY + varZ;

        // New: Calculate vertical acceleration for better step detection
        const verticalAcceleration = this.calculateVerticalAcceleration(accelX, accelY, accelZ);

        if (this.debugMode) {
            console.log(`Motion details - varX: ${varX.toFixed(6)}, varY: ${varY.toFixed(6)}, varZ: ${varZ.toFixed(6)}, total: ${sumAccelVar.toFixed(6)}, vertical: ${verticalAcceleration.toFixed(6)}`);
        }

        // Update peak detection buffer
        this.updatePeakDetectionBuffer(verticalAcceleration);

        return sumAccelVar;
    }

    // New: Calculate vertical acceleration component
    calculateVerticalAcceleration(accelX, accelY, accelZ) {
        // Get the magnitude of total acceleration for each sample
        const magnitudes = accelX.map((x, i) => {
            const y = accelY[i];
            const z = accelZ[i];
            return Math.sqrt(x * x + y * y + z * z);
        });

        // Compute the mean
        const mean = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;

        // Remove gravity (1g) and compute variance of the resulting signal
        const verticalComponents = magnitudes.map(m => m - mean);

        // Return the variance of the vertical components
        return this.calculateVariance(verticalComponents);
    }

    // New: Update the peak detection buffer
    updatePeakDetectionBuffer(value) {
        this.peakDetection.values.push(value);

        // Keep buffer at desired size
        if (this.peakDetection.values.length > this.peakDetection.bufferSize) {
            this.peakDetection.values.shift();
        }
    }

    // New: Detect if there's a peak in the current buffer
    detectPeak() {
        // Need enough data
        if (this.peakDetection.values.length < this.peakDetection.bufferSize) {
            return false;
        }

        // Get center value (which we're checking if it's a peak)
        const centerIndex = Math.floor(this.peakDetection.bufferSize / 2);
        const centerValue = this.peakDetection.values[centerIndex];

        // Check if center value is high enough to be a potential peak
        if (centerValue < this.peakDetection.minPeakHeight) {
            return false;
        }

        // Check if center is higher than surrounding points
        for (let i = 1; i <= this.peakDetection.minPeakDistance; i++) {
            if (centerIndex - i >= 0) {
                if (this.peakDetection.values[centerIndex - i] >= centerValue) {
                    return false;
                }
            }

            if (centerIndex + i < this.peakDetection.values.length) {
                if (this.peakDetection.values[centerIndex + i] >= centerValue) {
                    return false;
                }
            }
        }

        // It's a peak!
        console.log(`Peak detected! Value: ${centerValue.toFixed(6)}`);
        return true;
    }

    // Helper function to calculate variance
    calculateVariance(array) {
        const n = array.length;
        if (n === 0) return 0;

        // Calculate mean
        const mean = array.reduce((sum, val) => sum + val, 0) / n;

        // Calculate sum of squared differences from mean
        const squaredDiffSum = array.reduce((sum, val) => {
            const diff = val - mean;
            return sum + (diff * diff);
        }, 0);

        // Return variance
        return squaredDiffSum / n;
    }

    // Check if user is in motion based on recent motion intensity
    updateMotionState(motionIntensity) {
        // Add to buffer and maintain buffer size
        this.motionBuffer.push(motionIntensity);
        if (this.motionBuffer.length > this.motionBufferSize) {
            this.motionBuffer.shift();
        }

        // Calculate average motion intensity
        const avgMotion = this.motionBuffer.reduce((sum, val) => sum + val, 0) /
            this.motionBuffer.length;

        // Update motion state
        const previousMotionState = this.isInMotion;
        this.isInMotion = avgMotion > this.motionDetectionThreshold;

        // Log motion state changes
        if (this.isInMotion !== previousMotionState) {
            console.log(`Motion state changed to: ${this.isInMotion ? 'MOVING' : 'STATIONARY'}, avg motion: ${avgMotion.toFixed(6)}, threshold: ${this.motionDetectionThreshold}`);
        }

        return this.isInMotion;
    }

    async predictStep(windowData) {
        if (!this.isModelReady || !this.model) {
            console.log('Model is not ready yet');
            return false;
        }

        try {
            
            // Ensure it's an array with shape [50, 6]
            if (!Array.isArray(windowData) || windowData.length !== 50) {
                console.warn('Input data must have 50 time steps, got', windowData.length);
                return false;
            }

            // Verify each time step has 6 features
            const allHaveSixFeatures = windowData.every(step =>
                Array.isArray(step) && step.length === 6);

            if (!allHaveSixFeatures) {
                console.warn('Each time step must have 6 features');
                return false;
            }

            // Calculate motion intensity and update motion state
            const motionIntensity = this.calculateMotionIntensity(windowData);
            const isInMotion = this.updateMotionState(motionIntensity);

            // Only process for step detection if in motion
            if (!isInMotion) {
                console.log('No significant motion detected, skipping step detection');
                this.consecutiveHighPredictions = 0;
                return false;
            }

            // Check if we have a peak in the signal
            const hasPeak = this.detectPeak();

            // Create tensor with explicit shape to ensure it's 3D
            const inputTensor = tf.tensor3d([windowData], [1, 50, 6]);
            const prediction = this.model.predict(inputTensor);
            const predictionValue = prediction.dataSync()[0];

            console.log('Step prediction value:', predictionValue,
                'Motion intensity:', motionIntensity.toFixed(6),
                'Consecutive highs:', this.consecutiveHighPredictions,
                'Has peak:', hasPeak);

            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();

            // Apply refractory period check - MODIFIED: Set to 700ms (balanced value)
            const currentTime = new Date().getTime();
            const timeCheck = (currentTime - this.lastStepTime) > 700;

            // Track consecutive high predictions
            if (predictionValue > this.predictionThreshold) {
                this.consecutiveHighPredictions++;
            } else {
                // Only reset if prediction is significantly below threshold
                if (predictionValue < this.predictionThreshold * 0.8) {
                    this.consecutiveHighPredictions = 0;
                }
            }

            const hasEnoughConsecutiveHighs = this.consecutiveHighPredictions >= 1; // Only need 1 consecutive reading

            let stepDetected = false;

            if (timeCheck) {
                // Primary detection method: prediction value above threshold
                if (predictionValue > this.predictionThreshold) {
                    if (hasEnoughConsecutiveHighs) {
                        stepDetected = true;
                        console.log('Step detected by prediction threshold!');
                    }
                }
                // Secondary method: strong peak with prediction close to threshold
                else if (hasPeak && predictionValue > (this.predictionThreshold * 0.9)) {
                    stepDetected = true;
                    console.log('Step detected by acceleration peak!');
                }
            }

            if (stepDetected) {
                this.lastStepTime = currentTime;
                this.consecutiveHighPredictions = 0; // Reset after detecting a step
                return true;
            }

            return false;
        } catch (error) {
            console.error('Prediction error:', error);
            return false;
        }
    }

    // Method to dynamically adjust thresholds based on observed data
    adjustThresholds(avgMotionIntensity, avgPredictionValue) {
        // This method could be used to auto-calibrate thresholds based on usage patterns
        // For now, it's just a placeholder for potential future enhancements
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isModelReady = false;
        }
    }
}

export default new ModelService();