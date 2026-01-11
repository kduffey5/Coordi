"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Service = {
  name: string;
  description?: string;
  quotingType?: "starting_at" | "range_estimate" | "manual_quote_only";
  startingPrice?: number;
  priceRange?: { min: number; max: number };
  questions?: Array<{ question: string; type?: "boolean" | "text" | "number" }>;
  addOns?: string[];
};

type LocalKnowledgeEntry = {
  text: string;
  locationTag?: string;
};

export default function BusinessProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Company Info
  const [businessName, setBusinessName] = useState("");
  const [greetingFormat, setGreetingFormat] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [serviceHours, setServiceHours] = useState("");
  const [afterHoursBehavior, setAfterHoursBehavior] = useState<"take_lead_info" | "send_booking_link" | "escalate_emergency_only" | "">("");

  // Service Area
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [zipCodeInput, setZipCodeInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [outOfAreaResponse, setOutOfAreaResponse] = useState<"collect_and_escalate" | "politely_decline" | "offer_referral" | "">("");

  // Services
  const [services, setServices] = useState<Service[]>([]);

  // Pricing Philosophy
  const [pricingPhilosophy, setPricingPhilosophy] = useState<"soft_ranges" | "quote_with_photos" | "never_discuss_price" | "">("");

  // Policies
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [reschedulePolicy, setReschedulePolicy] = useState("");
  const [rainPolicy, setRainPolicy] = useState("");
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [paymentTypeInput, setPaymentTypeInput] = useState("");
  const [petGateAccess, setPetGateAccess] = useState("");
  const [satisfactionGuarantee, setSatisfactionGuarantee] = useState("");

  // Local Knowledge
  const [localKnowledge, setLocalKnowledge] = useState<LocalKnowledgeEntry[]>([]);

  // Voice Behavior
  const [tone, setTone] = useState<"casual" | "friendly" | "professional" | "authoritative" | "">("");
  const [empathy, setEmpathy] = useState<"low" | "medium" | "high" | "">("");
  const [preferredWords, setPreferredWords] = useState<Record<string, string>>({});
  const [referToTeamByName, setReferToTeamByName] = useState(false);

  // Lawn Expert Mode
  const [lawnExpertMode, setLawnExpertMode] = useState(false);

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }
    loadProfile();
  }, [router]);

  const loadProfile = async () => {
    try {
      const result = await api.getBusinessProfile();
      if (result.data) {
        setProfile(result.data);
        // Populate form fields from profile
        if (result.data.companyInfo) {
          setBusinessName(result.data.companyInfo.businessName || "");
          setGreetingFormat(result.data.companyInfo.greetingFormat || "");
          setPhoneNumber(result.data.companyInfo.phoneNumber || "");
          setServiceHours(result.data.companyInfo.serviceHours || "");
          setAfterHoursBehavior(result.data.companyInfo.afterHoursBehavior || "");
        }
        if (result.data.serviceAreaConfig) {
          setZipCodes(result.data.serviceAreaConfig.zipCodes || []);
          setCities(result.data.serviceAreaConfig.cities || []);
          setOutOfAreaResponse(result.data.serviceAreaConfig.outOfAreaResponse || "");
        }
        if (result.data.servicesConfig) {
          setServices(Array.isArray(result.data.servicesConfig) ? result.data.servicesConfig : []);
        }
        setPricingPhilosophy(result.data.pricingPhilosophy || "");
        if (result.data.policiesConfig) {
          setCancellationPolicy(result.data.policiesConfig.cancellationPolicy || "");
          setReschedulePolicy(result.data.policiesConfig.reschedulePolicy || "");
          setRainPolicy(result.data.policiesConfig.rainPolicy || "");
          setPaymentTypes(result.data.policiesConfig.paymentTypes || []);
          setPetGateAccess(result.data.policiesConfig.petGateAccess || "");
          setSatisfactionGuarantee(result.data.policiesConfig.satisfactionGuarantee || "");
        }
        if (result.data.localKnowledge) {
          setLocalKnowledge(Array.isArray(result.data.localKnowledge) ? result.data.localKnowledge : []);
        }
        if (result.data.voiceBehavior) {
          setTone(result.data.voiceBehavior.tone || "");
          setEmpathy(result.data.voiceBehavior.empathy || "");
          setPreferredWords(result.data.voiceBehavior.preferredWords || {});
          setReferToTeamByName(result.data.voiceBehavior.referToTeamByName || false);
        }
        setLawnExpertMode(result.data.lawnExpertMode || false);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        companyName: businessName || profile?.companyName,
        companyInfo: {
          businessName,
          greetingFormat,
          phoneNumber,
          serviceHours,
          afterHoursBehavior: afterHoursBehavior || undefined,
        },
        serviceAreaConfig: {
          zipCodes,
          cities,
          outOfAreaResponse: outOfAreaResponse || undefined,
        },
        servicesConfig: services,
        pricingPhilosophy: pricingPhilosophy || undefined,
        policiesConfig: {
          cancellationPolicy,
          reschedulePolicy,
          rainPolicy,
          paymentTypes,
          petGateAccess,
          satisfactionGuarantee,
        },
        localKnowledge,
        voiceBehavior: {
          tone: tone || undefined,
          empathy: empathy || undefined,
          preferredWords: Object.keys(preferredWords).length > 0 ? preferredWords : undefined,
          referToTeamByName,
        },
        lawnExpertMode,
      };

      const result = await api.updateBusinessProfile(updateData);
      if (result.data) {
        alert("Business profile saved successfully!");
      } else {
        alert("Error saving: " + (result.error || "Unknown error"));
      }
    } catch (error: any) {
      alert("Error saving: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const addZipCode = () => {
    if (zipCodeInput.trim()) {
      setZipCodes([...zipCodes, zipCodeInput.trim()]);
      setZipCodeInput("");
    }
  };

  const removeZipCode = (index: number) => {
    setZipCodes(zipCodes.filter((_, i) => i !== index));
  };

  const addCity = () => {
    if (cityInput.trim()) {
      setCities([...cities, cityInput.trim()]);
      setCityInput("");
    }
  };

  const removeCity = (index: number) => {
    setCities(cities.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([...services, { name: "" }]);
  };

  const updateService = (index: number, field: keyof Service, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const addPaymentType = () => {
    if (paymentTypeInput.trim()) {
      setPaymentTypes([...paymentTypes, paymentTypeInput.trim()]);
      setPaymentTypeInput("");
    }
  };

  const removePaymentType = (index: number) => {
    setPaymentTypes(paymentTypes.filter((_, i) => i !== index));
  };

  const addLocalKnowledge = () => {
    setLocalKnowledge([...localKnowledge, { text: "", locationTag: "" }]);
  };

  const updateLocalKnowledge = (index: number, field: keyof LocalKnowledgeEntry, value: string) => {
    const updated = [...localKnowledge];
    updated[index] = { ...updated[index], [field]: value };
    setLocalKnowledge(updated);
  };

  const removeLocalKnowledge = (index: number) => {
    setLocalKnowledge(localKnowledge.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold text-gray-900">Business Profile Configuration</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Tabs defaultValue="company" className="space-y-6">
            <TabsList>
              <TabsTrigger value="company">Company Info</TabsTrigger>
              <TabsTrigger value="service-area">Service Area</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="knowledge">Local Knowledge</TabsTrigger>
              <TabsTrigger value="voice">Voice Behavior</TabsTrigger>
              <TabsTrigger value="expert">Expert Mode</TabsTrigger>
            </TabsList>

            {/* Company Info Tab */}
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Basic business details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Green Lawn Care"
                    />
                  </div>
                  <div>
                    <Label htmlFor="greetingFormat">Greeting Format</Label>
                    <Input
                      id="greetingFormat"
                      value={greetingFormat}
                      onChange={(e) => setGreetingFormat(e.target.value)}
                      placeholder="Thanks for calling {businessName}"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceHours">Service Hours</Label>
                    <Input
                      id="serviceHours"
                      value={serviceHours}
                      onChange={(e) => setServiceHours(e.target.value)}
                      placeholder="Monday-Friday: 8am-6pm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="afterHours">After-Hours Behavior</Label>
                    <Select value={afterHoursBehavior} onValueChange={(value: any) => setAfterHoursBehavior(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select behavior" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="take_lead_info">Take lead info and promise follow-up</SelectItem>
                        <SelectItem value="send_booking_link">Send booking link via SMS</SelectItem>
                        <SelectItem value="escalate_emergency_only">Escalate emergency jobs only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Area Tab */}
            <TabsContent value="service-area">
              <Card>
                <CardHeader>
                  <CardTitle>Service Area</CardTitle>
                  <CardDescription>Define your service coverage area</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Zip Codes Served</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={zipCodeInput}
                        onChange={(e) => setZipCodeInput(e.target.value)}
                        placeholder="12345"
                        onKeyPress={(e) => e.key === "Enter" && addZipCode()}
                      />
                      <Button type="button" onClick={addZipCode}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {zipCodes.map((zip, index) => (
                        <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <span>{zip}</span>
                          <button type="button" onClick={() => removeZipCode(index)} className="text-red-600">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Cities Served</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        placeholder="City name"
                        onKeyPress={(e) => e.key === "Enter" && addCity()}
                      />
                      <Button type="button" onClick={addCity}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {cities.map((city, index) => (
                        <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <span>{city}</span>
                          <button type="button" onClick={() => removeCity(index)} className="text-red-600">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="outOfArea">Out-of-Area Response</Label>
                    <Select value={outOfAreaResponse} onValueChange={(value: any) => setOutOfAreaResponse(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select response" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collect_and_escalate">Still collect info + escalate</SelectItem>
                        <SelectItem value="politely_decline">Politely decline and end call</SelectItem>
                        <SelectItem value="offer_referral">Offer to refer another provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Services Offered</CardTitle>
                  <CardDescription>Define your services with quoting options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {services.map((service, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold">Service {index + 1}</h3>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeService(index)}>
                            Remove
                          </Button>
                        </div>
                        <div>
                          <Label>Service Name *</Label>
                          <Input
                            value={service.name}
                            onChange={(e) => updateService(index, "name", e.target.value)}
                            placeholder="Lawn Mowing"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={service.description || ""}
                            onChange={(e) => updateService(index, "description", e.target.value)}
                            placeholder="Regular lawn maintenance service"
                          />
                        </div>
                        <div>
                          <Label>Quoting Type</Label>
                          <Select
                            value={service.quotingType || ""}
                            onValueChange={(value: any) => updateService(index, "quotingType", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select quoting type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starting_at">Starting at price</SelectItem>
                              <SelectItem value="range_estimate">Range estimate</SelectItem>
                              <SelectItem value="manual_quote_only">Manual quote only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {service.quotingType === "starting_at" && (
                          <div>
                            <Label>Starting Price ($)</Label>
                            <Input
                              type="number"
                              value={service.startingPrice || ""}
                              onChange={(e) => updateService(index, "startingPrice", parseFloat(e.target.value) || undefined)}
                              placeholder="50"
                            />
                          </div>
                        )}
                        {service.quotingType === "range_estimate" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>Min Price ($)</Label>
                              <Input
                                type="number"
                                value={service.priceRange?.min || ""}
                                onChange={(e) => updateService(index, "priceRange", {
                                  ...service.priceRange,
                                  min: parseFloat(e.target.value) || undefined,
                                  max: service.priceRange?.max,
                                })}
                                placeholder="50"
                              />
                            </div>
                            <div>
                              <Label>Max Price ($)</Label>
                              <Input
                                type="number"
                                value={service.priceRange?.max || ""}
                                onChange={(e) => updateService(index, "priceRange", {
                                  ...service.priceRange,
                                  min: service.priceRange?.min,
                                  max: parseFloat(e.target.value) || undefined,
                                })}
                                placeholder="100"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <Button type="button" onClick={addService}>Add Service</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Philosophy Tab */}
            <TabsContent value="pricing">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Philosophy</CardTitle>
                  <CardDescription>How should the AI handle pricing discussions?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="pricingPhilosophy">Pricing Approach</Label>
                    <Select value={pricingPhilosophy} onValueChange={(value: any) => setPricingPhilosophy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing approach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft_ranges">Provide soft ranges on call</SelectItem>
                        <SelectItem value="quote_with_photos">Quote only with photos</SelectItem>
                        <SelectItem value="never_discuss_price">Never discuss price over phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies">
              <Card>
                <CardHeader>
                  <CardTitle>Policies & Preferences</CardTitle>
                  <CardDescription>Business policies and procedures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                    <Textarea
                      id="cancellationPolicy"
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      placeholder="24-hour notice required for cancellations"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reschedulePolicy">Reschedule Policy</Label>
                    <Textarea
                      id="reschedulePolicy"
                      value={reschedulePolicy}
                      onChange={(e) => setReschedulePolicy(e.target.value)}
                      placeholder="Rescheduling available with 48-hour notice"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rainPolicy">Rain Policy</Label>
                    <Textarea
                      id="rainPolicy"
                      value={rainPolicy}
                      onChange={(e) => setRainPolicy(e.target.value)}
                      placeholder="Services rescheduled automatically due to weather"
                    />
                  </div>
                  <div>
                    <Label>Payment Types Accepted</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={paymentTypeInput}
                        onChange={(e) => setPaymentTypeInput(e.target.value)}
                        placeholder="Cash, Credit Card"
                        onKeyPress={(e) => e.key === "Enter" && addPaymentType()}
                      />
                      <Button type="button" onClick={addPaymentType}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {paymentTypes.map((type, index) => (
                        <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <span>{type}</span>
                          <button type="button" onClick={() => removePaymentType(index)} className="text-red-600">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="petGateAccess">Pet/Gate Access Instructions</Label>
                    <Textarea
                      id="petGateAccess"
                      value={petGateAccess}
                      onChange={(e) => setPetGateAccess(e.target.value)}
                      placeholder="Please secure pets and ensure gate access is available"
                    />
                  </div>
                  <div>
                    <Label htmlFor="satisfactionGuarantee">Satisfaction Guarantee</Label>
                    <Textarea
                      id="satisfactionGuarantee"
                      value={satisfactionGuarantee}
                      onChange={(e) => setSatisfactionGuarantee(e.target.value)}
                      placeholder="100% satisfaction guarantee or we'll make it right"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Local Knowledge Tab */}
            <TabsContent value="knowledge">
              <Card>
                <CardHeader>
                  <CardTitle>Local Knowledge</CardTitle>
                  <CardDescription>Area-specific knowledge and context</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {localKnowledge.map((entry, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold">Entry {index + 1}</h3>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeLocalKnowledge(index)}>
                            Remove
                          </Button>
                        </div>
                        <div>
                          <Label>Knowledge Text</Label>
                          <Textarea
                            value={entry.text}
                            onChange={(e) => updateLocalKnowledge(index, "text", e.target.value)}
                            placeholder="We do a lot of work in Westwood HOA"
                          />
                        </div>
                        <div>
                          <Label>Location Tag (Optional)</Label>
                          <Input
                            value={entry.locationTag || ""}
                            onChange={(e) => updateLocalKnowledge(index, "locationTag", e.target.value)}
                            placeholder="Westwood HOA"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button type="button" onClick={addLocalKnowledge}>Add Knowledge Entry</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Behavior Tab */}
            <TabsContent value="voice">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Behavior Preferences</CardTitle>
                  <CardDescription>Configure how the AI voice agent communicates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="empathy">Empathy Level</Label>
                    <Select value={empathy} onValueChange={(value: any) => setEmpathy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select empathy level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="referToTeamByName"
                      checked={referToTeamByName}
                      onCheckedChange={(checked) => setReferToTeamByName(checked === true)}
                    />
                    <Label htmlFor="referToTeamByName">Refer to team by name</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expert Mode Tab */}
            <TabsContent value="expert">
              <Card>
                <CardHeader>
                  <CardTitle>Lawn Care Expert Mode</CardTitle>
                  <CardDescription>Enable expert knowledge mode for the AI agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lawnExpertMode"
                      checked={lawnExpertMode}
                      onCheckedChange={(checked) => setLawnExpertMode(checked === true)}
                    />
                    <div>
                      <Label htmlFor="lawnExpertMode">Enable Lawn Care Expert Mode</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, the AI will act as a knowledgeable lawn care expert and provide helpful advice
                        on questions like "What should I do about yellow spots?" or "How often should I mow?"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
