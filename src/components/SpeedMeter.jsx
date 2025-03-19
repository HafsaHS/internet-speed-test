import React, { useEffect, useState } from 'react';
import ReactSpeedometer from "react-d3-speedometer";

const SpeedMeter = ({ speedTestResults, selectedMetric, testRunning, testCompleted, onStopTest }) => {
  // State to track real-time value displayed on the meter
  const [displayValue, setDisplayValue] = useState(0);
  
  // Final results after test completion
  const [finalResults, setFinalResults] = useState(null);
  
  // Track history of values for computing average
  const [valueHistory, setValueHistory] = useState([]);
  
  // Animation dots for "Test in progress..."
  const [loadingDots, setLoadingDots] = useState("");
  
  // State for selected tab in results
  const [selectedTab, setSelectedTab] = useState('main');
  
  // Animate the loading dots
  useEffect(() => {
    if (!testRunning) return;
    
    const intervalId = setInterval(() => {
      setLoadingDots(prev => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [testRunning]);
  
  // Get current value based on selected metric
  const getCurrentValue = () => {
    if (!speedTestResults) return 0;
    
    if (selectedMetric === 'download') {
      // Ensure we have a valid number
      const downloadValue = speedTestResults.download / 1000000;
      return isNaN(downloadValue) ? 0 : downloadValue;
    } else {
      const latencyValue = speedTestResults.latency;
      return isNaN(latencyValue) ? 0 : latencyValue;
    }
  };
  
  // Update display value when test is running
  useEffect(() => {
    if (testRunning && speedTestResults) {
      const currentValue = getCurrentValue();
      // Only update and record if we have a valid number
      if (!isNaN(currentValue) && currentValue > 0) {
        setDisplayValue(currentValue);
        // Store value in history for averaging
        setValueHistory(prev => [...prev, currentValue]);
      }
    }
  }, [speedTestResults, testRunning, selectedMetric]);
  
  // Reset display and calculate final results when test completes
  useEffect(() => {
    if (testCompleted && valueHistory.length > 0) {
      // Calculate average
      const total = valueHistory.reduce((sum, value) => sum + value, 0);
      const average = total / valueHistory.length;
      
      // Set final results
      setFinalResults({
        average: isNaN(average) ? 0 : average,
      });
      
      // Return meter to zero with animation
      const resetTimer = setTimeout(() => {
        setDisplayValue(0);
      }, 1000);
      
      return () => clearTimeout(resetTimer);
    }
  }, [testCompleted, valueHistory]);
  
  // Reset history when starting a new test
  useEffect(() => {
    if (testRunning && !testCompleted) {
      setValueHistory([]);
      setFinalResults(null);
      setSelectedTab('main');
    }
  }, [testRunning, testCompleted]);
  
  // Dynamic configurations based on selected metric
  const getConfig = () => {
    if (selectedMetric === 'download') {
      // Download speed config
      const maxValue = displayValue > 100 ? Math.ceil(displayValue / 100) * 100 : 100;
      
      return {
        value: displayValue,
        maxValue: maxValue,
        title: "Download Speed",
        unit: "Mbps",
        startColor: "green",
        endColor: "blue",
      };
    } else {
      // Latency config
      const maxValue = displayValue > 200 ? Math.ceil(displayValue / 50) * 50 : 200;
      
      return {
        value: displayValue,
        maxValue: maxValue,
        title: "Network Latency",
        unit: "ms",
        startColor: "green",
        endColor: "red",
      };
    }
  };
  
  const config = getConfig();
  
  // Get complementary value
  const getComplementaryValue = () => {
    if (!speedTestResults) return { value: 0, unit: "" };
    
    if (selectedMetric === 'download') {
      // Get upload speed
      const uploadValue = speedTestResults.upload / 1000000;
      return {
        title: "Upload Speed",
        value: isNaN(uploadValue) ? 0 : uploadValue,
        unit: "Mbps"
      };
    } else {
      // Get jitter
      const jitterValue = speedTestResults.jitter;
      return {
        title: "Jitter",
        value: isNaN(jitterValue) ? 0 : jitterValue,
        unit: "ms"
      };
    }
  };
  
  const complementaryConfig = getComplementaryValue();
  
  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
      {/* Test in Progress UI */}
      {testRunning && (
        <div className="w-full flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2 text-center">{config.title} Test</h2>
          <div className="mb-4">
            <ReactSpeedometer
              maxValue={config.maxValue}
              value={config.value}
              needleColor="red"
              startColor={config.startColor}
              endColor={config.endColor}
              segments={10}
              currentValueText={`${config.value.toFixed(2)} ${config.unit}`}
              textColor="#333"
              width={300}
              height={200}
              valueTextFontWeight="bold"
              ringWidth={20}
              needleTransition="easeElastic"
              needleTransitionDuration={500}
            />
          </div>
          <div className="text-center text-gray-500 mb-4 min-h-[24px]">
            <span className="inline-flex items-center">
              Test in progress<span className="w-[24px] text-left">{loadingDots}</span>
            </span>
          </div>
          
          {/* Stop Test Button */}
          <button
            onClick={onStopTest}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer"
          >
            Stop Test
          </button>
        </div>
      )}
      
      {/* Test Completed UI */}
      {testCompleted && finalResults && (
        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <h2 className="text-xl font-bold text-center">
              {selectedMetric === 'download' ? 'Download Speed' : 'Network Latency'} Result
            </h2>
          </div>
          
          {/* Tab Selector */}
          <div className="border-b border-gray-200">
            <div className="flex justify-center">
              <button
                onClick={() => setSelectedTab('main')}
                className={`py-2 px-4 text-sm font-medium cursor-pointer ${
                  selectedTab === 'main' 
                    ? 'border-b-2 border-blue-600 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {selectedMetric === 'download' ? 'Download' : 'Latency'}
              </button>
              <button
                onClick={() => setSelectedTab('complementary')}
                className={`py-2 px-4 text-sm font-medium cursor-pointer ${
                  selectedTab === 'complementary' 
                    ? 'border-b-2 border-blue-600 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {selectedMetric === 'download' ? 'Upload' : 'Jitter'}
              </button>
            </div>
          </div>
          
          {/* Main Tab Content */}
          {selectedTab === 'main' && (
            <div className="p-6">
              {/* Speedometer showing final result */}
              <div className="flex justify-center mb-6">
                <ReactSpeedometer
                  maxValue={selectedMetric === 'download' ? 
                    (finalResults.average > 100 ? Math.ceil(finalResults.average / 100) * 100 : 100) : 
                    (finalResults.average > 200 ? Math.ceil(finalResults.average / 50) * 50 : 200)
                  }
                  value={0} // Set to 0 as test is complete
                  needleColor="gray"
                  startColor={config.startColor}
                  endColor={config.endColor}
                  segments={10}
                  currentValueText={`${finalResults.average.toFixed(2)} ${config.unit}`}
                  textColor="#333"
                  width={300}
                  height={200}
                  valueTextFontWeight="bold"
                  ringWidth={20}
                />
              </div>
              
              {/* Big result display */}
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-600">
                  {finalResults.average.toFixed(2)} {config.unit}
                </div>
                <p className="text-gray-500 mt-2">Average {config.title}</p>
              </div>
            </div>
          )}
          
          {/* Complementary Tab Content */}
          {selectedTab === 'complementary' && (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-indigo-600">
                  {complementaryConfig.value.toFixed(2)} {complementaryConfig.unit}
                </div>
                <p className="text-gray-500 mt-2">{complementaryConfig.title}</p>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  {selectedMetric === 'download' 
                    ? "Upload speed measures how quickly you can send data from your device to the internet."
                    : "Jitter measures the variation in latency over time. Lower values indicate a more stable connection."}
                </p>
              </div>
            </div>
          )}
          
          {/* Additional info */}
          <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-4 mx-6 mb-4">
            <div className="text-sm text-gray-500 mb-2 sm:mb-0">
              Test completed at {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeedMeter;
