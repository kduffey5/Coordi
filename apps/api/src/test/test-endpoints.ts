/**
 * Simple endpoint testing script
 * Run with: npx tsx src/test/test-endpoints.ts
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:3001";

async function testEndpoint(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error: any) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log("🧪 Testing Coordi API Endpoints\n");
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Health Check
  console.log("1. Testing Health Check...");
  const health = await testEndpoint("GET", "/health");
  console.log(`   Status: ${health.status} ${health.ok ? "✅" : "❌"}`);
  if (health.data) console.log(`   Response:`, health.data);
  console.log();

  // Test 2: Register (creates test user)
  console.log("2. Testing Registration...");
  const register = await testEndpoint("POST", "/api/auth/register", {
    email: `test_${Date.now()}@coordi.test`,
    password: "testpassword123",
    organizationName: "Test Organization",
  });
  console.log(`   Status: ${register.status} ${register.ok ? "✅" : "❌"}`);
  const registerData = register.data as { token?: string } | undefined;
  if (registerData?.token) {
    console.log(`   Token received: ${registerData.token.substring(0, 20)}...`);
    const token = registerData.token;

    // Test 3: Get Agent Profile (authenticated)
    console.log("\n3. Testing Get Agent Profile (authenticated)...");
    const profile = await testEndpoint("GET", "/api/profile/agent", undefined, token);
    console.log(`   Status: ${profile.status} ${profile.ok ? "✅" : "❌"}`);
    const profileData = profile.data as { voice?: string; tone?: string } | undefined;
    if (profileData) {
      console.log(`   Voice: ${profileData.voice}, Tone: ${profileData.tone}`);
    }

    // Test 4: Get Metrics
    console.log("\n4. Testing Get Metrics...");
    const metrics = await testEndpoint("GET", "/api/metrics", undefined, token);
    console.log(`   Status: ${metrics.status} ${metrics.ok ? "✅" : "❌"}`);
    const metricsData = metrics.data as { calls?: { total?: number }; leads?: { total?: number } } | undefined;
    if (metricsData) {
      console.log(`   Total Calls: ${metricsData.calls?.total || 0}`);
      console.log(`   Total Leads: ${metricsData.leads?.total || 0}`);
    }

    // Test 5: Get Leads
    console.log("\n5. Testing Get Leads...");
    const leads = await testEndpoint("GET", "/api/leads", undefined, token);
    console.log(`   Status: ${leads.status} ${leads.ok ? "✅" : "❌"}`);
    const leadsData = leads.data as { total?: number } | undefined;
    if (leadsData) {
      console.log(`   Total Leads: ${leadsData.total || 0}`);
    }
  }

  console.log("\n✅ Tests completed!");
}

runTests().catch(console.error);
