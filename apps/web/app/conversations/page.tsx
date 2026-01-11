"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Conversation } from "@/lib/api";

type StatusFilter = "all" | "lead" | "missed" | "booked" | "escalated" | "new" | "followed_up";

function ConversationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }

    // Get filter from URL params
    const filter = (searchParams?.get("filter") as StatusFilter) || "all";
    setStatusFilter(filter);
    loadConversations(filter);
  }, [router, searchParams]);

  const loadConversations = async (filter: StatusFilter = statusFilter) => {
    try {
      let result;
      if (filter === "all") {
        result = await api.getConversations(50, 0);
      } else if (filter === "lead") {
        result = await api.getConversations(50, 0, undefined, true);
      } else {
        result = await api.getConversations(50, 0, filter);
      }

      if (result.data) {
        setConversations(result.data.conversations || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    loadConversations(filter);
    // Update URL without reload
    const newUrl = filter === "all" ? "/conversations" : `/conversations?filter=${filter}`;
    router.push(newUrl);
  };

  const handleToggleLead = async (conversation: Conversation) => {
    try {
      await api.updateConversation(conversation.id, {
        isLead: !conversation.isLead,
      });
      await loadConversations(statusFilter);
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation({ ...selectedConversation, isLead: !conversation.isLead });
      }
    } catch (error: any) {
      alert("Error updating conversation: " + (error.message || "Unknown error"));
    }
  };

  const handleStatusChange = async (conversation: Conversation, newStatus: string) => {
    try {
      await api.updateConversation(conversation.id, {
        status: newStatus,
      });
      await loadConversations(statusFilter);
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation({ ...selectedConversation, status: newStatus });
      }
    } catch (error: any) {
      alert("Error updating conversation: " + (error.message || "Unknown error"));
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

  const getStatusColor = (status: string, isLead: boolean) => {
    if (isLead) {
      return "bg-green-100 text-green-800";
    }
    switch (status) {
      case "booked":
        return "bg-blue-100 text-blue-800";
      case "escalated":
        return "bg-purple-100 text-purple-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "followed_up":
        return "bg-yellow-100 text-yellow-800";
      case "new":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCallerName = (fromNumber?: string) => {
    if (!fromNumber) return "Unknown";
    // Format phone number for display
    const cleaned = fromNumber.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return fromNumber;
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
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            <p className="text-sm text-gray-600">{total} total conversations</p>
          </div>
          <a href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filter Tabs */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px" aria-label="Tabs">
                {[
                  { id: "all", label: "All" },
                  { id: "lead", label: "Leads" },
                  { id: "new", label: "New" },
                  { id: "missed", label: "Missed" },
                  { id: "booked", label: "Booked" },
                  { id: "escalated", label: "Escalated" },
                  { id: "followed_up", label: "Followed Up" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleStatusFilterChange(tab.id as StatusFilter)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      statusFilter === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">
                No conversations yet. Conversations will appear here after calls are received.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCallerName(conversation.fromNumber)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md truncate">
                          {conversation.summary || "No summary available"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              conversation.status,
                              conversation.isLead
                            )}`}
                          >
                            {conversation.isLead ? "Lead" : conversation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {conversation.tags && conversation.tags.length > 0 ? (
                            conversation.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(conversation.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedConversation(conversation)}
                          className="text-indigo-600 hover:text-indigo-500 mr-4"
                        >
                          View ▶
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Conversation Detail Modal */}
          {selectedConversation && (
            <ConversationDetailModal
              conversation={selectedConversation}
              onToggleLead={handleToggleLead}
              onStatusChange={handleStatusChange}
              onClose={() => setSelectedConversation(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <ConversationsContent />
    </Suspense>
  );
}

function ConversationDetailModal({
  conversation,
  onToggleLead,
  onStatusChange,
  onClose,
}: {
  conversation: Conversation;
  onToggleLead: (conv: Conversation) => void;
  onStatusChange: (conv: Conversation, status: string) => void;
  onClose: () => void;
}) {
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
          <h3 className="text-lg font-bold text-gray-900">Conversation Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">From</label>
              <p className="mt-1 text-sm text-gray-900">{conversation.fromNumber || "—"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">To</label>
              <p className="mt-1 text-sm text-gray-900">{conversation.toNumber || "—"}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(conversation.startTime)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <p className="mt-1 text-sm text-gray-900">
                {conversation.durationSeconds
                  ? `${Math.floor(conversation.durationSeconds / 60)}:${(
                      conversation.durationSeconds % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "—"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mark as Lead</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={conversation.isLead}
                onChange={() => onToggleLead(conversation)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">This is a lead</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={conversation.status}
              onChange={(e) => onStatusChange(conversation, e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="new">New</option>
              <option value="booked">Booked</option>
              <option value="followed_up">Followed Up</option>
              <option value="escalated">Escalated</option>
              <option value="missed">Missed</option>
            </select>
          </div>

          {conversation.summary && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Summary</label>
              <p className="mt-1 text-sm text-gray-900">{conversation.summary}</p>
            </div>
          )}

          {conversation.transcript && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Transcript</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {conversation.transcript}
                </p>
              </div>
            </div>
          )}

          {conversation.tags && conversation.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {conversation.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conversation.recordingUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Recording</label>
              <audio controls className="mt-1 w-full">
                <source src={conversation.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {conversation.lead && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Related Lead</label>
              <p className="mt-1 text-sm text-gray-900">
                {conversation.lead.name || conversation.lead.id.substring(0, 8)}
              </p>
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
