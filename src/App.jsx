import React, { useState, useEffect } from "react";
import SpeedTest from "@cloudflare/speedtest";

function App() {
  const [speedTestResults, setSpeedTestResults] = useState();
  const [downloadLatency, setDownloadLatency] = useState([]);

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
    const ua = { user_agent: window.navigator.userAgent };
    const meta = (await safeFetch("https://speed.cloudflare.com/meta")).json;
    const now = new Date();
    const ts = { 
      epoch: Math.floor(now.getTime() / 1000),
      dateTime: now.toISOString()
    };

    const engine = new SpeedTest(config);

    engine.onResultsChange = (results) => {
      const summary = engine.results.getSummary();
      const scores = engine.results.getScores();
      const downloadedLatency = engine.results.getDownLoadedLatency();
      setSpeedTestResults({ ...scores, ...summary, ...meta, ...ts, ...ua });
      console.log(speedTestResults);
      setDownloadLatency(downloadedLatency);
      console.log(downloadLatency);
      
    };

    engine.onFinish = (results) => {
      const summary = results.getSummary();
      const scores = results.getScores();
      const downloadedLatency = results.getDownLoadedLatency();


      setSpeedTestResults({ ...scores, ...summary, ...meta, ...ts, ...ua });
      console.log(speedTestResults);
      const finishedElement = document.createElement("div");
      finishedElement.id = "speedtest-finished";
      document.body.appendChild(finishedElement);
      console.log("done");
      console.log(results.getDownloadBandwidth());
      console.log(results.getDownLoadedLatency());
    };

    console.log("running");

    engine.play();
  };

  useEffect(() => {
    runSpeedTest();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        {speedTestResults && (
          <div>
            <h1>Speed Test Results:</h1>
            <pre>{JSON.stringify(speedTestResults, null, 2)}</pre>
            {/* <pre>{JSON.stringify(speedTestResults.download.latency, null, 2)}</pre> */}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
