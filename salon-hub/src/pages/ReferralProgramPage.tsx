import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Gift, 
  Copy, 
  CheckCircle, 
  Clock, 
  XCircle,
  Loader2,
  ArrowLeft,
  Share2,
  BarChart3
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { referralService, ReferralCode, ReferralAnalytics, ReferralUsage } from "@/services/referralService";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useNavigation } from "@/utils/navigationUtils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReferralProgramPage() {
  const navigate = useNavigate();
  const businessId = useBusinessId();
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const { getPath } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [usages, setUsages] = useState<ReferralUsage[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get the universal referral code for this business
      const [codeData, analyticsData] = await Promise.all([
        referralService.getBusinessUniversalCode(businessId),
        referralService.getAnalytics(businessId).catch(() => null),
      ]);
      setReferralCode(codeData);
      setAnalytics(analyticsData);
      
      // Try to load usages if endpoint exists
      try {
        const usagesData = await referralService.getReferralUsages(businessId);
        setUsages(usagesData);
      } catch (e) {
        // Endpoint might not exist yet
        console.log("Referral usages endpoint not available");
      }
    } catch (error: any) {
      // Referral service may not be deployed yet — suppress toast, show inline notice
      console.warn("Referral service unavailable:", error?.message || error);
      setServiceUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "£0.00";
    return `£${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">Inactive</Badge>;
      case "EXPIRED":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUsageStatusBadge = (status: string) => {
    switch (status) {
      case "REWARDED":
        return <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Rewarded</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };


  return (
    <AppLayout>
      <PageHeader
        title="Referral Program"
        subtitle="Grow your business by rewarding referrals"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(getPath("marketing"))}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {serviceUnavailable && !referralCode && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <Gift className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Referral Program — Coming Soon</p>
                    <p className="text-xs text-yellow-700 mt-0.5">
                      The referral program service is not yet available. This feature will be enabled in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Analytics Overview */}
            {analytics && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                      Total Codes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.totalReferralCodes}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.activeReferralCodes} active
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                      Total Uses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{analytics.totalUsages}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.successfulUsages} successful
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                      Rewards Given
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-appointment-purple">
                      {formatCurrency(analytics.totalRewardsGiven)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalPointsGiven} points
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                      Referrals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics.totalReferredClients + analytics.totalReferredBusinesses}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.totalReferredClients} clients, {analytics.totalReferredBusinesses} businesses
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Referral Code and Statistics */}
            <Tabs defaultValue="code" className="space-y-4">
              <TabsList>
                <TabsTrigger value="code">My Referral Code</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="usages">Usage History</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="space-y-4">
                {/* Universal Referral Code */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-appointment-purple" />
                          Your Referral Code
                        </CardTitle>
                        <CardDescription>
                          Use this code to invite clients or businesses. Created automatically when you registered.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!referralCode ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-4">
                          No referral code found. Your code will be created automatically when you register.
                        </div>
                        <Button onClick={loadData} variant="outline">
                          Refresh
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Main Code Display */}
                        <div className="p-6 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Your Unique Referral Code</p>
                              <code className="text-3xl font-mono font-bold text-primary">
                                {referralCode.code}
                              </code>
                            </div>
                            {getStatusBadge(referralCode.status)}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="lg"
                              className="gap-2 flex-1"
                              onClick={() => copyToClipboard(referralCode.code)}
                            >
                              {copiedCode === referralCode.code ? (
                                <>
                                  <CheckCircle className="h-5 w-5" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-5 w-5" />
                                  Copy Code
                                </>
                              )}
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="gap-2 flex-1"
                              onClick={() => {
                                const shareText = `Join me on this platform! Use my referral code: ${referralCode.code}`;
                                if (navigator.share) {
                                  navigator.share({ text: shareText });
                                } else {
                                  copyToClipboard(shareText);
                                }
                              }}
                            >
                              <Share2 className="h-5 w-5" />
                              Share
                            </Button>
                          </div>
                        </div>

                        {/* Code Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="border-border/60">
                            <CardHeader>
                            <CardTitle className="text-sm">Reward Information</CardTitle>
                          </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">You Get:</span>
                                <span className="font-semibold">{formatCurrency(referralCode.rewardAmount)} + {referralCode.rewardPoints} points</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">New User Gets:</span>
                                <span className="font-semibold">{formatCurrency(referralCode.newUserReward)} + {referralCode.newUserPoints} points</span>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-border/60">
                            <CardHeader>
                              <CardTitle className="text-sm">Usage Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Uses:</span>
                                <span className="font-semibold">
                                  {referralCode.currentUses}{referralCode.maxUses ? ` / ${referralCode.maxUses}` : " (unlimited)"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Code Type:</span>
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                                  Universal (Client & Business)
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Usage Instructions */}
                        <Card className="border-border/60 bg-muted/30">
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              How to Use
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              • Share this code with clients to invite them to book appointments
                            </p>
                            <p className="text-muted-foreground">
                              • Share this code with other businesses to invite them to join the platform
                            </p>
                            <p className="text-muted-foreground">
                              • You'll earn rewards when someone uses your code to register
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistics" className="space-y-4">
                {analytics ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Performance Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span className="font-bold text-lg">
                            {analytics.totalUsages > 0
                              ? ((analytics.successfulUsages / analytics.totalUsages) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Rewards Given</span>
                          <span className="font-bold text-lg text-green-600">
                            {formatCurrency(analytics.totalRewardsGiven)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Points Given</span>
                          <span className="font-bold text-lg">{analytics.totalPointsGiven}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Rewards Earned</span>
                          <span className="font-bold text-lg text-appointment-purple">
                            {formatCurrency(analytics.totalRewardsEarned)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Referral Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Referred Clients</span>
                          <span className="font-bold text-lg">{analytics.totalReferredClients}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Referred Businesses</span>
                          <span className="font-bold text-lg">{analytics.totalReferredBusinesses}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Active Codes</span>
                          <span className="font-bold text-lg text-green-600">
                            {analytics.activeReferralCodes}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Codes</span>
                          <span className="font-bold text-lg">{analytics.totalReferralCodes}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No analytics data available
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="usages" className="space-y-4">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Usage History</CardTitle>
                    <CardDescription>Track all referral code usages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {usages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No referral usages yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {usages.map((usage) => (
                          <div
                            key={usage.id}
                            className="p-4 border border-border/60 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getUsageStatusBadge(usage.status)}
                                <span className="text-sm text-muted-foreground">
                                  Used on {new Date(usage.usedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {usage.rewardedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Rewarded on {new Date(usage.rewardedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                              {usage.referredClientId && (
                                <div>
                                  <span className="text-muted-foreground">Client ID: </span>
                                  <span className="font-semibold">{usage.referredClientId}</span>
                                </div>
                              )}
                              {usage.referredBusinessId && (
                                <div>
                                  <span className="text-muted-foreground">Business ID: </span>
                                  <span className="font-semibold">{usage.referredBusinessId}</span>
                                </div>
                              )}
                              {usage.rewardAmount && (
                                <div>
                                  <span className="text-muted-foreground">Reward: </span>
                                  <span className="font-semibold">{formatCurrency(usage.rewardAmount)}</span>
                                </div>
                              )}
                              {usage.rewardPoints && (
                                <div>
                                  <span className="text-muted-foreground">Points: </span>
                                  <span className="font-semibold">{usage.rewardPoints}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

    </AppLayout>
  );
}

