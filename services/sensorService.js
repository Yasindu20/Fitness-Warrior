//sensorService.js
import { Accelerometer, Gyroscope } from 'expo-sensors';

class SensorService {
  constructor() {
    this.accelerometerData = { x: 0, y: 0, z: 0 };
    this.gyroscopeData = { x: 0, y: 0, z: 0 };
    this.dataBuffer = [];
    this.windowSize = 50;
    this.stepSize = 25;
    this.sensorUpdateInterval = 50; // ms (20 Hz)
    this.isCollecting = false;
    
    // Subscribers
    this.accelerometerSubscription = null;
    this.gyroscopeSubscription = null;
    
    // Callbacks
    this.onWindowComplete = null;
    
    // Debug counter
    this.dataPointCounter = 0;
  }

  setWindowCompleteCallback(callback) {
    this.onWindowComplete = callback;
  }

  async start() {
    if (this.isCollecting) return;
    
    try {
      // Check if sensors are available
      const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
      const isGyroscopeAvailable = await Gyroscope.isAvailableAsync();
      
      if (!isAccelerometerAvailable || !isGyroscopeAvailable) {
        console.error('Required sensors are not available on this device');
        return;
      }
      
      this.isCollecting = true;
      this.dataBuffer = [];
      this.dataPointCounter = 0;
      
      // Configure sensor update intervals
      Accelerometer.setUpdateInterval(this.sensorUpdateInterval);
      Gyroscope.setUpdateInterval(this.sensorUpdateInterval);
      
      // Subscribe to accelerometer
      this.accelerometerSubscription = Accelerometer.addListener(data => {
        this.accelerometerData = data;
        this._processData();
      });
      
      // Subscribe to gyroscope
      this.gyroscopeSubscription = Gyroscope.addListener(data => {
        this.gyroscopeData = data;
      });
      
      console.log('Sensor collection started successfully');
    } catch (error) {
      console.error('Error starting sensors:', error);
    }
  }

  stop() {
    if (!this.isCollecting) return;
    
    // Unsubscribe from sensors
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }
    
    this.isCollecting = false;
    this.dataBuffer = [];
    console.log('Sensor collection stopped');
  }

  _processData() {
    // Combine accelerometer and gyroscope data
    const combinedData = [
      this.accelerometerData.x,
      this.accelerometerData.y,
      this.accelerometerData.z,
      this.gyroscopeData.x,
      this.gyroscopeData.y,
      this.gyroscopeData.z
    ];
    
    // Add to buffer
    this.dataBuffer.push(combinedData);
    this.dataPointCounter++;
    
    // Log data points collected occasionally
    if (this.dataPointCounter % 20 === 0) {
      console.log(`Collected ${this.dataPointCounter} data points. Buffer size: ${this.dataBuffer.length}`);
    }
    
    // Check if we have enough data for a window
    if (this.dataBuffer.length >= this.windowSize) {
      // Extract window
      const window = this.dataBuffer.slice(0, this.windowSize);
      
      // Call callback with the window
      if (this.onWindowComplete && typeof this.onWindowComplete === 'function') {
        console.log('Window complete, calling prediction callback');
        this.onWindowComplete(window);
      }
      
      // Apply step size (sliding window)
      if (this.stepSize < this.windowSize) {
        this.dataBuffer = this.dataBuffer.slice(this.stepSize);
      } else {
        this.dataBuffer = [];
      }
    }
  }
}

export default new SensorService();