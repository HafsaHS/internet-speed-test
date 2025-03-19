import React, { useState, useEffect } from "react";
import SpeedTest from "@cloudflare/speedtest";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import SpeedMeter from "./components/SpeedMeter";

function App() {
  const [speedTestResults, setSpeedTestResults] = useState();
  const [downloadBandwidths, setDownloadBandwidths] = useState([]);
  const [averageDownloadSpeed, setAverageDownloadSpeed] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('download'); // Default to download
  const [testRunning, setTestRunning] = useState(false);

  const config = {
    measureDownloadLoadedLatency: true,
    autoStart: false,
    measurements: [
      { type: "latency", numPackets: 1 }, // initial latency estimation
      { type: "download", bytes: 1e5, count: 1, bypassMinDuration: true }, // initial download estimation
      { type: "latency", numPackets: 20 },
      { type: "download", bytes: 1e5, count: 9 },
      { type: "download", bytes: 1e6, count: 8 },
      { type: "upload", bytes: 1e5, count: 8 },
      { type: "packetLoss", numPackets: 1e3, responsesWaitTime: 3000 },
      { type: "upload", bytes: 1e6, count: 6 },
      { type: "download", bytes: 1e7, count: 6 },
      { type: "upload", bytes: 1e7, count: 4 },
      { type: "download", bytes: 2.5e7, count: 4 },
      { type: "upload", bytes: 2.5e7, count: 4 },
      { type: "download", bytes: 1e8, count: 3 },
      { type: "upload", bytes: 5e7, count: 3 },
      { type: "download", bytes: 2.5e8, count: 2 },
    ],
  };

  const safeFetch = async (url, options = {}) => {
    try {
      const request = await fetch(url, options);
      const json = JSON.parse(await request.text());
      const headers = request.headers;
      return { json, headers };
    } catch (_) {
      return {};
    }
  };

  const runSpeedTest = async () => {
    setTestRunning(true);
    const ua = { user_agent: window.navigator.userAgent };
    const meta = (await safeFetch("https://speed.cloudflare.com/meta")).json;
    const now = new Date();
    const ts = {
      epoch: Math.floor(now.getTime() / 1000),
      dateTime: now.toISOString(),
    };

    const engine = new SpeedTest(config);

    // Add a timeout to stop the test after 30 seconds
    const timeoutId = setTimeout(() => {
      if (engine && engine.status !== "finished") {
        console.log("Speed test automatically stopped after 30 seconds");
        engine.pause();
        setTestRunning(false);
      }
    }, 60000);

    engine.onResultsChange = (results) => {
      const summary = engine.results.getSummary();
      setSpeedTestResults({ ...summary, ...meta, ...ts, ...ua });
    };

    engine.onFinish = (results) => {
      // Clear the timeout when test finishes naturally
      clearTimeout(timeoutId);
      setTestRunning(false);

      const summary = results.getSummary();
      const scores = results.getScores();
      const downloadedLatency = results.getDownLoadedLatency();
      const downloadBandwidth = results.getDownloadBandwidth();

      setSpeedTestResults({ ...scores, ...summary, ...meta, ...ts, ...ua });
      const finishedElement = document.createElement("div");
      finishedElement.id = "speedtest-finished";
      document.body.appendChild(finishedElement);
    };

    console.log("running");
    engine.play();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-6 md:p-24">
      {/* Metric Selection UI */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Network Speed Test</h1>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedMetric('download')}
            className={`px-6 py-2 rounded-lg font-medium ${
              selectedMetric === 'download' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Download Speed
          </button>
          <button 
            onClick={() => setSelectedMetric('latency')}
            className={`px-6 py-2 rounded-lg font-medium ${
              selectedMetric === 'latency' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Network Latency
          </button>
        </div>
        
        {!speedTestResults && !testRunning && (
          <button
            onClick={runSpeedTest}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Start Speed Test
          </button>
        )}
        
        {testRunning && (
          <div className="text-lg">Running speed test...</div>
        )}
      </div>

      {speedTestResults && (
        <SpeedMeter 
          speedTestResults={speedTestResults} 
          selectedMetric={selectedMetric} 
        />
      )}
      
      {/* Optional: Show raw data for debugging */}
      {speedTestResults && (
        <div className="mt-10 w-full max-w-3xl text-sm">
          <details>
            <summary className="cursor-pointer text-blue-600 mb-2">Show Raw Test Results</summary>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(speedTestResults, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default App;
