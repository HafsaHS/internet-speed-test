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
  Legend
} from "recharts";

function App() {
  const [speedTestResults, setSpeedTestResults] = useState();
  const [downloadBandwidths, setDownloadBandwidths] = useState([]);
  const [averageDownloadSpeed, setAverageDownloadSpeed] = useState(null);

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
      dateTime: now.toISOString(),
    };

    const engine = new SpeedTest(config);

    // Add a timeout to stop the test after 30 seconds
    const timeoutId = setTimeout(() => {
      if (engine && engine.status !== 'finished') {
        console.log('Speed test automatically stopped after 30 seconds');
        engine.pause();
      }
    }, 60000);

    engine.onResultsChange = (results) => {
      const summary = engine.results.getSummary();
      const scores = engine.results.getScores();
      const downloadedLatency = engine.results.getDownLoadedLatency();
      const downloadBandwidth = engine.results.getDownloadBandwidth();
      setSpeedTestResults({ ...scores, ...summary, ...meta, ...ts, ...ua });
      console.log(summary);

      // Only proceed if downloadBandwidth is a valid number
      if (typeof downloadBandwidth === "number" && !isNaN(downloadBandwidth)) {
        // Create an object with bandwidth and current timestamp
        const dataPoint = {
          downloadBandwidth: downloadBandwidth,
          time: Date.now(),
          // For display in chart, convert to Mbps
          value: downloadBandwidth / 1000000,
        };

        // Use the functional state update pattern to ensure we're working with the latest state
        setDownloadBandwidths((prev) => {
          const updatedBandwidths = [...prev, dataPoint];

          // Calculate and update the live average
          if (updatedBandwidths.length > 0) {
            const totalBandwidth = updatedBandwidths.reduce((sum, point) => {
              // Ensure we're only adding valid numbers
              const bandwidth = point.downloadBandwidth;
              return (
                sum +
                (typeof bandwidth === "number" && !isNaN(bandwidth)
                  ? bandwidth
                  : 0)
              );
            }, 0);

            const liveAverage = totalBandwidth / updatedBandwidths.length;

            // Only update if we have a valid average
            if (!isNaN(liveAverage) && liveAverage > 0) {
              setAverageDownloadSpeed((liveAverage / 1000000).toFixed(2));
            }
          }

          return updatedBandwidths;
        });
      }
    };

    engine.onFinish = (results) => {
      // Clear the timeout when test finishes naturally
      clearTimeout(timeoutId);
      
      const summary = results.getSummary();
      const scores = results.getScores();
      const downloadedLatency = results.getDownLoadedLatency();
      const downloadBandwidth = results.getDownloadBandwidth();
      console.log(downloadedLatency);

      setSpeedTestResults({ ...scores, ...summary, ...meta, ...ts, ...ua });

      // No need to calculate average here anymore

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

  // useEffect(() => {
  //   console.log(downloadBandwidths);
  // }, [downloadBandwidths]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      {averageDownloadSpeed && (
        <h1 className="text-2xl font-bold mb-4">
          Average Download Speed: {averageDownloadSpeed} Mbps
        </h1>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          width={400}
          height={200}
          data={downloadBandwidths}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            hide={true}
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            label={{ value: "Time", position: "insideBottomRight", offset: 0 }}
          />
          <YAxis
            label={{
              value: "Download Speed (Mbps)",
              angle: -90,
              position: "insideLeft",
            }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            labelFormatter={(time) => new Date(time).toLocaleTimeString()}
            formatter={(value) => [
              `${value.toFixed(2)} Mbps`,
              "Download Speed",
            ]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            name="Download Speed"
            stroke="#8884d8"
            fill="#8884d8"
            activeDot={{ r: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {averageDownloadSpeed && (
        <h1 className="text-2xl font-bold mb-4">
          Average Download Speed: {averageDownloadSpeed} Mbps
        </h1>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          width={400}
          height={200}
          data={downloadBandwidths}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            hide={true}
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            label={{ value: "Time", position: "insideBottomRight", offset: 0 }}
          />
          <YAxis
            label={{
              value: "Download Speed (Mbps)",
              angle: -90,
              position: "insideLeft",
            }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            labelFormatter={(time) => new Date(time).toLocaleTimeString()}
            formatter={(value) => [
              `${value.toFixed(2)} Mbps`,
              "Download Speed",
            ]}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            name="Download Speed"
            stroke="#8884d8"
            fill="#8884d8"
            activeDot={{ r: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
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
