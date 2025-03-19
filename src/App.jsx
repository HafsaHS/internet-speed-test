import React, { useState, useEffect, useRef } from "react";
import SpeedTest from "@cloudflare/speedtest";
import SpeedMeter from "./components/SpeedMeter";

function App() {
  const [speedTestResults, setSpeedTestResults] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("download");
  const [testRunning, setTestRunning] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [averageMetrics, setAverageMetrics] = useState({ download: 0, latency: 0 });
  const engineRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const testResultsRef = useRef([]);

  useEffect(() => {
    testResultsRef.current = testResults;
    // Calculate averages whenever testResults changes
    calculateAverages();
  }, [testResults]);

  // Function to calculate average download speed and latency
  const calculateAverages = () => {
    if (testResults.length === 0) {
      setAverageMetrics({ download: 0, latency: 0 });
      return;
    }

    // Filter out entries with invalid values
    const validDownloadResults = testResults.filter(
      result => result && !isNaN(result.download) && result.download > 0
    );
    
    const validLatencyResults = testResults.filter(
      result => result && !isNaN(result.latency) && result.latency > 0
    );

    // Calculate averages
    const avgDownload = validDownloadResults.length > 0
      ? validDownloadResults.reduce((sum, result) => sum + result.download, 0) / validDownloadResults.length
      : 0;
    
    const avgLatency = validLatencyResults.length > 0
      ? validLatencyResults.reduce((sum, result) => sum + result.latency, 0) / validLatencyResults.length
      : 0;

    setAverageMetrics({
      download: avgDownload,
      latency: avgLatency,
      downloadCount: validDownloadResults.length,
      latencyCount: validLatencyResults.length
    });
  };

  const config = {
    measureDownloadLoadedLatency: true,
    autoStart: false,
    measurements: [
      { type: "latency", numPackets: 1 },
      { type: "download", bytes: 1e5, count: 1, bypassMinDuration: true },
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

  const startNewTest = () => {
    // Reset all states for a new test
    setSpeedTestResults(null);
    setTestResults([]);
    setAverageMetrics({ download: 0, latency: 0, downloadCount: 0, latencyCount: 0 });
    setTestRunning(false);
    setTestCompleted(false);
    engineRef.current = null;
  };

  const stopTest = () => {
    if (engineRef.current) {
      engineRef.current.pause();

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      setTestRunning(false);
      setTestCompleted(true);
    }
  };

  const runSpeedTest = async () => {
    startNewTest();
    setTestRunning(true);

    const ua = { user_agent: window.navigator.userAgent };
    const meta = (await safeFetch("https://speed.cloudflare.com/meta")).json;
    const now = new Date();
    const ts = {
      epoch: Math.floor(now.getTime() / 1000),
      dateTime: now.toISOString(),
    };

    const engine = new SpeedTest(config);
    engineRef.current = engine;

    // Add a timeout to stop the test after 60 seconds
    timeoutIdRef.current = setTimeout(() => {
      if (engine && engine.status !== "finished") {
        engine.pause();
        setTestRunning(false);
        setTestCompleted(true);
      }
    }, 60000);

    engine.onResultsChange = (results) => {
      try {
        const summary = engine.results.getSummary();
        
        // Only add valid summary objects to the testResults array
        if (summary) {
          setTestResults((prev) => [...prev, summary]);
          
          // Validate that we have actual data before updating speedTestResults
          if ((selectedMetric === "download" && !isNaN(summary.download)) ||
              (selectedMetric === "latency" && !isNaN(summary.latency))) {
            setSpeedTestResults({ ...summary, ...meta, ...ts, ...ua });
          }
        }
      } catch (error) {
        console.error("Error in results processing:", error);
      }
    };

    engine.onFinish = (results) => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      try {
        const summary = results.getSummary();
        const scores = results.getScores();
        
        // Calculate final averages from all collected test results
        const finalAverages = { ...averageMetrics };
        
        // Create final results object with averages
        const finalResults = { 
          ...scores, 
          ...summary, 
          averageDownload: finalAverages.download,
          averageLatency: finalAverages.latency,
          ...meta, 
          ...ts, 
          ...ua 
        };

        setSpeedTestResults(finalResults);
        setTestRunning(false);
        setTestCompleted(true);
        
        // Keep the intermediate results for a moment for the user to see them
        // Then clear them after 2 seconds
        setTimeout(() => {
          setTestResults([]);
        }, 2000);
      } catch (error) {
        console.error("Error in finish processing:", error);
        setTestRunning(false);
        setTestCompleted(true);
      }
    };

    console.log("running");
    engine.play();
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Network Speed Test
          </h1>
          <p className="text-gray-500">
            Test your internet connection speed and quality
          </p>
        </header>

        {/* Main Content */}
        <main className="bg-white rounded-xl shadow-md p-6 mb-8">
          {/* Test Controls - Only show if test is not running */}
          {!testRunning && !testCompleted && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
                Select Test Type
              </h2>

              {/* Toggle Switch for Metric Selection */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 rounded-full p-1 flex">
                  <button
                    onClick={() => setSelectedMetric("download")}
                    className={`flex items-center justify-center px-8 py-3 rounded-full transition-all cursor-pointer ${
                      selectedMetric === "download"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedMetric("latency")}
                    className={`flex items-center justify-center px-8 py-3 rounded-full transition-all cursor-pointer ${
                      selectedMetric === "latency"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Latency
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <div className="flex justify-center">
                <button
                  onClick={runSpeedTest}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center cursor-pointer"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Start Speed Test
                </button>
              </div>
            </div>
          )}

          {/* Speed Meter Component */}
          <SpeedMeter
            speedTestResults={speedTestResults}
            selectedMetric={selectedMetric}
            testRunning={testRunning}
            testCompleted={testCompleted}
            onStopTest={stopTest}
          />

          {/* Average Metrics Display */}
          {(testRunning || testCompleted) && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-4">
                Average Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Speed Card */}
                <div className={`p-4 rounded-lg border ${selectedMetric === 'download' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Average Download Speed</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {(averageMetrics.download / 1000000).toFixed(2)} <span className="text-lg">Mbps</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {averageMetrics.downloadCount || 0} measurements
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Latency Card */}
                <div className={`p-4 rounded-lg border ${selectedMetric === 'latency' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Average Latency</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {averageMetrics.latency.toFixed(1)} <span className="text-lg">ms</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on {averageMetrics.latencyCount || 0} measurements
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Progress Indicator */}
              {testRunning && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Test in progress - Collecting measurements
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Test Completed Controls */}
          {testCompleted && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={startNewTest}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Run Another Test
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
