"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AgentTuningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }

    loadProfiles();
  }, [router]);

  const loadProfiles = async () => {
    try {
      const [agentResult, businessResult] = await Promise.all([
        api.getAgentProfile(),
        api.getBusinessProfile(),
      ]);

      if (agentResult.data) {
        setProfile(agentResult.data);
      }
      if (businessResult.data) {
        setBusinessProfile(businessResult.data);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAgentProfile(profile);
      alert("Settings saved successfully!");
    } catch (error: any) {
      alert("Error saving: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (field: string, value: number) => {
    setProfile({ ...profile, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const voiceOptions = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Tuning Studio</h1>
            <p className="text-sm text-gray-600">Customize your AI receptionist's personality</p>
          </div>
          <a href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Voice Selection */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Voice Selection</h2>
            <select
              value={profile?.voice || "alloy"}
              onChange={(e) => setProfile({ ...profile, voice: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {voiceOptions.map((voice) => (
                <option key={voice} value={voice}>
                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Choose the voice your AI receptionist will use
            </p>
          </div>

          {/* Personality Sliders */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Personality Settings</h2>

            <SliderControl
              label="Tone"
              value={profile?.tone || 50}
              onChange={(v) => updateValue("tone", v)}
              leftLabel="Casual"
              rightLabel="Formal"
              description="How casual or formal the agent sounds"
            />

            <SliderControl
              label="Pace"
              value={profile?.pace || 50}
              onChange={(v) => updateValue("pace", v)}
              leftLabel="Slow & Clear"
              rightLabel="Quick"
              description="How fast the agent speaks"
            />

            <SliderControl
              label="Energy"
              value={profile?.energy || 50}
              onChange={(v) => updateValue("energy", v)}
              leftLabel="Calm"
              rightLabel="Enthusiastic"
              description="Energy level of the agent's voice"
            />

            <SliderControl
              label="Confidence"
              value={profile?.confidence || 50}
              onChange={(v) => updateValue("confidence", v)}
              leftLabel="Tentative"
              rightLabel="Authoritative"
              description="How confident and decisive the agent sounds"
            />

            <SliderControl
              label="Empathy"
              value={profile?.empathyLevel || 50}
              onChange={(v) => updateValue("empathyLevel", v)}
              leftLabel="Matter-of-fact"
              rightLabel="Very Empathetic"
              description="How empathetic and understanding the agent is"
            />

            <SliderControl
              label="Formality"
              value={profile?.formality || 50}
              onChange={(v) => updateValue("formality", v)}
              leftLabel="Casual"
              rightLabel="Formal"
              description="Level of formality in language"
            />

            <SliderControl
              label="Filler Words"
              value={profile?.fillerLevel || 50}
              onChange={(v) => updateValue("fillerLevel", v)}
              leftLabel="None"
              rightLabel="Frequent"
              description="How often the agent uses filler words (um, uh)"
            />

            <SliderControl
              label="Interruption Sensitivity"
              value={profile?.interruptionSensitivity || 50}
              onChange={(v) => updateValue("interruptionSensitivity", v)}
              leftLabel="Low"
              rightLabel="High"
              description="How quickly the agent stops talking when caller interrupts"
            />
          </div>

          {/* Custom Welcome Prompt */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Custom Welcome Message</h2>
            <p className="text-sm text-gray-600 mb-4">
              Leave blank to use default: &quot;Hi, this is {businessProfile?.companyName || "your business"}, how can I help you?&quot;
            </p>
            <textarea
              value={profile?.welcomePrompt || ""}
              onChange={(e) => setProfile({ ...profile, welcomePrompt: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter custom greeting message (optional)"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}
