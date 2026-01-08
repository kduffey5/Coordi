"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }

    loadMetrics();
  }, [router]);

  const loadMetrics = async () => {
    const result = await api.getMetrics(30);
    if (result.data) {
      setMetrics(result.data);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    api.logout();
    router.push("/login");
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
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Coordi Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <MetricCard
              title="Total Calls"
              value={metrics?.calls?.total || 0}
              subtitle="Last 30 days"
            />
            <MetricCard
              title="Leads Captured"
              value={metrics?.leads?.total || 0}
              subtitle={`${metrics?.calls?.conversionRate?.toFixed(1) || 0}% conversion`}
            />
            <MetricCard
              title="Appointments"
              value={metrics?.leads?.withAppointments || 0}
              subtitle="Booked"
            />
            <MetricCard
              title="Missed Calls"
              value={metrics?.calls?.missed || 0}
              subtitle="No lead captured"
            />
          </div>

          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {metrics?.calls?.conversionRate?.toFixed(1) || 0}%
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Booking Rate</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">
                  {metrics?.leads?.bookingRate?.toFixed(1) || 0}%
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <LinkCard href="/calls" title="Call Log" description="View all calls" />
            <LinkCard href="/leads" title="Leads" description="Manage leads" />
            <LinkCard href="/agent" title="Agent Tuning Studio" description="Configure AI agent" />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0"></div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </dd>
              <dd className="text-sm text-gray-500">{subtitle}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </a>
  );
}
