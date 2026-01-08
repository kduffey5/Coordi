"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function CallsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }

    loadCalls();
  }, [router]);

  const loadCalls = async () => {
    try {
      const result = await api.getCalls(50, 0);
      if (result.data) {
        setCalls(result.data.calls || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error("Error loading calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "lead_captured":
        return "bg-green-100 text-green-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "transferred":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Log</h1>
            <p className="text-sm text-gray-600">{total} total calls</p>
          </div>
          <a href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {calls.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">No calls yet. Calls will appear here after they are received.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(call.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.fromNumber || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDuration(call.durationSeconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOutcomeColor(
                            call.outcome
                          )}`}
                        >
                          {call.outcome?.replace("_", " ") || "unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {call.lead ? (
                          <a
                            href={`/leads?id=${call.lead.id}`}
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            View Lead
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Call Detail Modal */}
          {selectedCall && (
            <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
          )}
        </div>
      </main>
    </div>
  );
}

function CallDetailModal({ call, onClose }: { call: any; onClose: () => void }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Call Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(call.startTime)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <p className="mt-1 text-sm text-gray-900">{call.fromNumber || "—"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <p className="mt-1 text-sm text-gray-900">{call.toNumber || "—"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Duration</label>
            <p className="mt-1 text-sm text-gray-900">
              {call.durationSeconds
                ? `${Math.floor(call.durationSeconds / 60)}:${(call.durationSeconds % 60)
                    .toString()
                    .padStart(2, "0")}`
                : "—"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Outcome</label>
            <p className="mt-1 text-sm text-gray-900">
              {call.outcome?.replace("_", " ") || "unknown"}
            </p>
          </div>

          {call.summary && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Summary</label>
              <p className="mt-1 text-sm text-gray-900">{call.summary}</p>
            </div>
          )}

          {call.transcript && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Transcript</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{call.transcript}</p>
              </div>
            </div>
          )}

          {call.recordingUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Recording</label>
              <audio controls className="mt-1 w-full">
                <source src={call.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {call.lead && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Related Lead</label>
              <a
                href={`/leads?id=${call.lead.id}`}
                className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
              >
                View Lead: {call.lead.name || call.lead.id.substring(0, 8)}
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
