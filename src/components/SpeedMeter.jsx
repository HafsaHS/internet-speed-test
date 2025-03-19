import React from 'react';
import ReactSpeedometer from "react-d3-speedometer";

const SpeedMeter = ({ speedTestResults, selectedMetric }) => {
  if (!speedTestResults) {
    return <div className="text-center p-6">Running speed test...</div>;
  }

  // Values and configurations based on selected metric
  let value, maxValue, title, unit, startColor, endColor;
  
  if (selectedMetric === 'download') {
    // Download speed in Mbps
    value = speedTestResults.download / 1000000;
    title = "Download Speed";
    unit = "Mbps";
    startColor = "green";
    endColor = "blue";
    
    // Dynamic maximum based on download speed
    if (value < 50) maxValue = 50;
    else if (value < 100) maxValue = 100;
    else if (value < 250) maxValue = 250;
    else if (value < 500) maxValue = 500;
    else if (value < 1000) maxValue = 1000;
    else maxValue = Math.ceil(value / 1000) * 1000;
  } else {
    // Latency in ms
    value = speedTestResults.latency;
    title = "Network Latency";
    unit = "ms";
    startColor = "green";
    endColor = "red"; // Red typically indicates higher (worse) latency
    
    // Dynamic maximum based on latency
    if (value < 50) maxValue = 50;
    else if (value < 100) maxValue = 100;
    else if (value < 200) maxValue = 200;
    else if (value < 500) maxValue = 500;
    else maxValue = Math.ceil(value / 100) * 100;
  }
  
  return (
    <div className="flex flex-col items-center mx-auto my-5">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <ReactSpeedometer
        maxValue={maxValue}
        value={value}
        needleColor="red"
        startColor={startColor}
        endColor={endColor}
        segments={10}
        currentValueText={`${value.toFixed(2)} ${unit}`}
        textColor="#333"
        width={300}
        height={200}
        valueTextFontWeight="bold"
        ringWidth={20}
        needleTransition="easeElastic"
        needleTransitionDuration={500}
      />
      
      {/* Additional Network Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 text-center w-full max-w-md">
        {selectedMetric === 'download' ? (
          <>
            <div className="bg-gray-100 p-3 rounded shadow">
              <p className="text-sm text-gray-500">Upload Speed</p>
              <p className="font-bold">{(speedTestResults.upload / 1000000).toFixed(2)} Mbps</p>
            </div>
            <div className="bg-gray-100 p-3 rounded shadow">
              <p className="text-sm text-gray-500">Download Latency</p>
              <p className="font-bold">{speedTestResults.downLoadedLatency?.toFixed(1) || 'N/A'} ms</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-100 p-3 rounded shadow">
              <p className="text-sm text-gray-500">Jitter</p>
              <p className="font-bold">{speedTestResults?.jitter?.toFixed(1) || 'N/A'} ms</p>
            </div>
            <div className="bg-gray-100 p-3 rounded shadow">
              <p className="text-sm text-gray-500">Upload Latency</p>
              <p className="font-bold">{speedTestResults?.upLoadedLatency?.toFixed(1) || 'N/A'} ms</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeedMeter;
