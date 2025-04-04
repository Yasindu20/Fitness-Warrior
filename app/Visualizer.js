//Visualizer.js
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');
const GRAPH_WIDTH = width - 40;
const GRAPH_HEIGHT = 150;
const PADDING = 10;

// Define colors for different sensor axes
const COLORS = {
  accelX: '#FF6384',
  accelY: '#36A2EB',
  accelZ: '#FFCE56',
  gyroX: '#4BC0C0',
  gyroY: '#9966FF',
  gyroZ: '#FF9F40',
};

const Visualizer = ({ data = [] }) => {
  // If no data, show empty graph
  if (!data.length) {
    return (
      <View style={styles.container}>
        <Svg height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
          {/* X and Y axes */}
          <Line
            x1={PADDING}
            y1={GRAPH_HEIGHT - PADDING}
            x2={GRAPH_WIDTH - PADDING}
            y2={GRAPH_HEIGHT - PADDING}
            stroke="#333"
            strokeWidth="1"
          />
          <Line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={GRAPH_HEIGHT - PADDING}
            stroke="#333"
            strokeWidth="1"
          />
          <SvgText
            x={GRAPH_WIDTH / 2}
            y={GRAPH_HEIGHT - PADDING / 2}
            fontSize="10"
            textAnchor="middle"
            fill="#666"
          >
            Time
          </SvgText>
          <SvgText
            x={PADDING / 2}
            y={GRAPH_HEIGHT / 2}
            fontSize="10"
            textAnchor="middle"
            fill="#666"
            rotation="-90"
            originX={PADDING / 2}
            originY={GRAPH_HEIGHT / 2}
          >
            Sensor Reading
          </SvgText>
        </Svg>
      </View>
    );
  }

  // Calculate scale factors for drawing the graph
  const dataLength = data.length;
  const xStep = (GRAPH_WIDTH - 2 * PADDING) / (dataLength - 1);
  
  // Functions to get coordinates
  const getX = (i) => PADDING + i * xStep;
  const getY = (value, minVal, maxVal) => {
    const range = Math.max(maxVal - minVal, 0.1); // Avoid division by zero
    const normalized = (value - minVal) / range;
    return GRAPH_HEIGHT - PADDING - normalized * (GRAPH_HEIGHT - 2 * PADDING);
  };
  
  // Extract data series
  const accelX = data.map(d => d[0]);
  const accelY = data.map(d => d[1]);
  const accelZ = data.map(d => d[2]);
  const gyroX = data.map(d => d[3]);
  const gyroY = data.map(d => d[4]);
  const gyroZ = data.map(d => d[5]);
  
  // Calculate min/max values for scaling
  const allValues = [...accelX, ...accelY, ...accelZ, ...gyroX, ...gyroY, ...gyroZ];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  
  // Function to generate points for a data series
  const renderSeries = (data, color) => {
    return data.map((value, i) => (
      <Circle
        key={`${color}-${i}`}
        cx={getX(i)}
        cy={getY(value, minVal, maxVal)}
        r="2"
        fill={color}
      />
    ));
  };
  
  // Create legend items
  const legendItems = [
    { label: 'AccelX', color: COLORS.accelX },
    { label: 'AccelY', color: COLORS.accelY },
    { label: 'AccelZ', color: COLORS.accelZ },
    { label: 'GyroX', color: COLORS.gyroX },
    { label: 'GyroY', color: COLORS.gyroY },
    { label: 'GyroZ', color: COLORS.gyroZ },
  ];
  
  return (
    <View style={styles.container}>
      <Svg height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
        {/* X and Y axes */}
        <Line
          x1={PADDING}
          y1={GRAPH_HEIGHT - PADDING}
          x2={GRAPH_WIDTH - PADDING}
          y2={GRAPH_HEIGHT - PADDING}
          stroke="#333"
          strokeWidth="1"
        />
        <Line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={GRAPH_HEIGHT - PADDING}
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Plot data series */}
        {renderSeries(accelX, COLORS.accelX)}
        {renderSeries(accelY, COLORS.accelY)}
        {renderSeries(accelZ, COLORS.accelZ)}
        {renderSeries(gyroX, COLORS.gyroX)}
        {renderSeries(gyroY, COLORS.gyroY)}
        {renderSeries(gyroZ, COLORS.gyroZ)}
        
        {/* Legend */}
        {legendItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <Circle
              cx={PADDING + 10}
              cy={PADDING + 10 + i * 15}
              r="3"
              fill={item.color}
            />
            <SvgText
              x={PADDING + 20}
              y={PADDING + 14 + i * 15}
              fontSize="8"
              fill="#333"
            >
              {item.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    marginBottom: 10,
  },
});

export default Visualizer;