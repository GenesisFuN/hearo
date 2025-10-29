/**
 * Test Page for TTS Service Integration
 * Navigate to http://localhost:3002/test-tts to use this page
 */

"use client";

import { useState, useEffect } from "react";
import { listAvailableVoices } from "@/lib/tts-service";

export default function TestTTSPage() {
  const [testText, setTestText] = useState(
    "Hello! This is a test of the Coqui TTS integration."
  );
  const [subscription, setSubscription] = useState<"free" | "creator">("free");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [voices, setVoices] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  useEffect(() => {
    const fetchVoices = async () => {
      const availableVoices = await listAvailableVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0]); // Set default selected voice
      }
    };

    fetchVoices();
  }, []);

  const testTTSService = async () => {
    setLoading(true);
    setResult("");
    setAudioUrl("");

    try {
      // Add timestamp to make each test unique (avoid duplicate detection)
      const uniqueText = `${testText}\n\n[Test timestamp: ${new Date().toISOString()}]`;

      // Create a test file
      const blob = new Blob([uniqueText], { type: "text/plain" });
      const file = new File([blob], "test.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "aiSettings",
        JSON.stringify({
          voiceId: selectedVoice, // Use selected voice
          stability: 0.75,
          similarityBoost: 0.75,
        })
      );

      const response = await fetch("/api/upload/text", {
        method: "POST",
        body: formData,
        headers: {
          "x-subscription-tier": subscription, // Pass subscription in header for testing
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(
          `✅ Success! Check server logs to see which provider was used.\n\n${JSON.stringify(data, null, 2)}`
        );

        // Audio file will be generated in background
        // In real app, you'd poll for completion or use websockets
      } else {
        setResult(`❌ Error: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testCoquiHealth = async () => {
    setLoading(true);
    setResult("");

    try {
      // Use our API route to avoid CORS issues
      const response = await fetch("/api/coqui/health");
      const data = await response.json();

      if (response.ok) {
        setResult(
          `✅ Coqui Server is Running!\n\n${JSON.stringify(data, null, 2)}`
        );
      } else {
        setResult(
          `⚠️  Coqui Server Issue:\n\n${JSON.stringify(data, null, 2)}`
        );
      }
    } catch (error) {
      setResult(`❌ Coqui server not reachable: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          TTS Service Integration Test
        </h1>

        {/* Coqui Server Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Check Coqui Server</h2>
          <button
            onClick={testCoquiHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Coqui Health
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Server should be running on http://localhost:8000
          </p>
        </div>

        {/* TTS Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            2. Test TTS Integration
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Subscription Tier:
            </label>
            <select
              value={subscription}
              onChange={(e) =>
                setSubscription(e.target.value as "free" | "creator")
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="free">Free (uses Coqui)</option>
              <option value="creator">Creator (uses Coqui)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test Text:</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-3 py-2 border rounded h-24"
              placeholder="Enter text to convert to speech..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select Voice:
            </label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              {voices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={testTTSService}
            disabled={loading || !testText}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Generate Speech"}
          </button>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-semibold text-blue-800">💡 Note:</p>
            <p className="text-blue-700 mt-1">
              Each test automatically adds a unique timestamp to avoid duplicate
              detection. This allows you to test multiple times with the same
              text.
            </p>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-semibold">Expected behavior:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>All tiers:</strong> Use Coqui (self-hosted) by default
              </li>
              <li>
                <strong>Fallback:</strong> Uses ElevenLabs if Coqui is
                unavailable
              </li>
            </ul>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {result}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold mb-2">📝 Testing Instructions:</h3>
          <ol className="list-decimal ml-5 space-y-2 text-sm">
            <li>
              Make sure Coqui TTS server is running:{" "}
              <code className="bg-white px-2 py-1 rounded">
                conda activate coqui-tts && python coqui-server.py
              </code>
            </li>
            <li>Click "Test Coqui Health" to verify server is running</li>
            <li>Select subscription tier (both use Coqui by default)</li>
            <li>Choose a voice from the dropdown menu</li>
            <li>Click "Generate Speech"</li>
            <li>Check server terminal logs to see which provider was used</li>
            <li>
              Audio will be saved to{" "}
              <code className="bg-white px-2 py-1 rounded">uploads/audio/</code>
            </li>
          </ol>
        </div>

        {/* Server Logs Reminder */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold mb-2">👀 Check Server Logs:</h3>
          <p className="text-sm">
            The TTS provider selection happens on the server side. Look for
            these log messages:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-sm font-mono">
            <li>👤 User subscription: [tier]</li>
            <li>🎙️ Using TTS provider: [provider]</li>
            <li>✅ [Provider] speech generation completed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
