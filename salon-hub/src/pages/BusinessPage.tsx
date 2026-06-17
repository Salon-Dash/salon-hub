import { AppLayout } from "@/components/layout/AppLayout";
import { Check, ChevronRight, ExternalLink, Eye, MapPin, MessageSquare, Pencil, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { businessService, type Business } from "@/services/businessService";
import { serviceService, type Service } from "@/services/serviceService";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "@/utils/navigationUtils";

function formatMoney(value?: number) {
  if (typeof value !== "number") return "Price not set";
  return `${value.toFixed(2)} CZK`;
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function formatAddress(business: Business | null) {
  if (!business) return "Address not set";
  const parts = [
    business.address,
    business.buildingNumber,
    business.city,
    business.state,
    business.zipCode,
    business.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Address not set";
}

function getCompletenessChecks(business: Business | null, services: Service[]) {
  return [
    { label: "Business name", ok: Boolean(business?.name?.trim()) },
    { label: "Address", ok: Boolean(formatAddress(business) !== "Address not set") },
    { label: "Location coordinates", ok: typeof business?.latitude === "number" && typeof business?.longitude === "number" },
    { label: "Contact (phone/email)", ok: Boolean(business?.phone || business?.email) },
    { label: "At least one service", ok: services.length > 0 },
  ];
}

export default function BusinessPage() {
  const navigate = useNavigate();
  const { getPath } = useNavigation();
  const [copied, setCopied] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const publicUrl = useMemo(() => {
    if (!business?.name) return "";
    return `${business.name.toLowerCase().replace(/\s+/g, "-")}.booksy.com`;
  }, [business?.name]);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const businessIdRaw = localStorage.getItem("currentBusinessId");
    const businessId = businessIdRaw ? Number.parseInt(businessIdRaw, 10) : NaN;

    if (!accessToken || !Number.isFinite(businessId) || businessId <= 0) {
      setError("Missing business context. Please log in again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    Promise.all([
      businessService.getBusiness(businessId, accessToken),
      serviceService.getServicesByBusiness(businessId),
    ])
      .then(([businessPayload, servicePayload]) => {
        setBusiness(businessPayload);
        setServices(Array.isArray(servicePayload) ? servicePayload : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not load business data.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopyUrl = () => {
    if (!publicUrl) return;
    const normalized = publicUrl.startsWith("http") ? publicUrl : `https://${publicUrl}`;
    navigator.clipboard.writeText(normalized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditProfile = () => {
    navigate(`${getPath("setup")}?focus=business`);
  };

  const handlePreview = () => {
    if (!publicUrl) return;
    const normalized = publicUrl.startsWith("http") ? publicUrl : `https://${publicUrl}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const handleShare = async () => {
    if (!publicUrl) return;
    const normalized = publicUrl.startsWith("http") ? publicUrl : `https://${publicUrl}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: business?.name || "Business profile",
          text: "Check out our booking profile",
          url: normalized,
        });
        return;
      }
      await navigator.clipboard.writeText(normalized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore share errors (cancelled dialog, permission, etc.)
    }
  };

  const completenessChecks = useMemo(() => getCompletenessChecks(business, services), [business, services]);
  const completedCount = completenessChecks.filter((check) => check.ok).length;
  const completionPercent = Math.round((completedCount / completenessChecks.length) * 100);
  const completionTier = completionPercent >= 80 ? "Advanced" : completionPercent >= 50 ? "Growing" : "Novice";
  const hasCoords = typeof business?.latitude === "number" && typeof business?.longitude === "number";
  const locationLabel =
    hasCoords
      ? `${business.latitude!.toFixed(5)}, ${business.longitude!.toFixed(5)}`
      : "Location not set";
  const mapsUrl =
    hasCoords
      ? `https://www.google.com/maps?q=${business?.latitude},${business?.longitude}`
      : "";
  const mapsEmbedUrl =
    hasCoords
      ? `https://www.google.com/maps?q=${business?.latitude},${business?.longitude}&z=14&output=embed`
      : "";

  return (
    <AppLayout>
      <div className="h-full flex flex-col bg-white relative">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile</h1>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {business?.name || (isLoading ? "Loading..." : "Business")}
                      </h2>
                      <button
                        onClick={handleCopyUrl}
                        disabled={!publicUrl}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-60"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {publicUrl || "Public URL unavailable"}
                        </span>
                        {copied ? (
                          <Check size={14} className="text-green-600" />
                        ) : (
                          <ExternalLink size={14} className="text-gray-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={handleEditProfile}
                          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md"
                        >
                          <Pencil size={20} />
                        </button>
                        <span className="text-xs text-gray-600">Edit profile</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={handlePreview}
                          disabled={!publicUrl}
                          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md disabled:opacity-60"
                        >
                          <Eye size={20} />
                        </button>
                        <span className="text-xs text-gray-600">Preview</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={handleShare}
                          disabled={!publicUrl}
                          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md disabled:opacity-60"
                        >
                          <Share2 size={20} />
                        </button>
                        <span className="text-xs text-gray-600">Share</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-3 gap-0">
                    <div className="col-span-2">
                      <div className="h-64 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 opacity-90"></div>
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                          <div className="absolute left-8 top-8 w-16 h-16 bg-gray-500/30 rounded-full"></div>
                          <div className="absolute right-12 bottom-12 w-20 h-20 bg-gray-400/20 rounded-lg"></div>
                          <div className="text-center">
                            <div className="w-32 h-32 bg-white/10 rounded-lg mx-auto backdrop-blur-sm border border-white/20"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border-l border-gray-200 p-4">
                      <div className="h-full flex flex-col justify-between">
                        {mapsEmbedUrl ? (
                          <div className="rounded-lg overflow-hidden border border-gray-200 bg-white h-36">
                            <iframe
                              title="Business location map"
                              src={mapsEmbedUrl}
                              className="w-full h-full border-0"
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 h-36 flex items-center justify-center">
                            <div className="text-center px-3">
                              <MapPin size={22} className="text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">Location coordinates are not set yet</p>
                            </div>
                          </div>
                        )}
                        <div className="pt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                          <p className="text-xs text-gray-600 mt-1 break-all">{locationLabel}</p>
                        </div>
                        {hasCoords && mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center justify-center text-xs font-medium text-blue-700 hover:text-blue-800"
                          >
                            Open in Maps
                            <ExternalLink size={12} className="ml-1" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{business?.name || "Business"}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                      <MapPin size={16} />
                      <span>{formatAddress(business)}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-gray-900 mb-4">Services</h4>
                      {services.length ? (
                        <div className="space-y-3">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {[formatDuration(service.durationMinutes), service.categoryName]
                                    .filter(Boolean)
                                    .join(" · ") || "No duration"}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{formatMoney(service.price)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No services added yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h3>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-4">
                      <MessageSquare size={48} className="text-gray-300" />
                      <MessageSquare size={48} className="text-gray-300 absolute top-2 left-2 opacity-60" />
                    </div>
                    <p className="text-sm text-gray-600 max-w-md">
                      No reviews yet. Encourage clients to leave their first review.
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
              </div>

              <div className="col-span-1 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-green-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Profile Completeness</h3>
                      <ChevronRight size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-2xl font-bold text-gray-900">{completionTier}</h4>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {completedCount} of {completenessChecks.length} completed
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${completionPercent}%` }}></div>
                    </div>
                    <ul className="mt-4 space-y-1">
                      {completenessChecks.map((check) => (
                        <li key={check.label} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className={check.ok ? "text-emerald-600" : "text-gray-400"}>{check.ok ? "●" : "○"}</span>
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Create a social post and share it
                      </h3>
                      <p className="text-sm text-gray-600">
                        Use social media marketing to connect with clients
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center ml-4 flex-shrink-0">
                      <Share2 size={32} className="text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-sm text-gray-600">Loading business data...</div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
