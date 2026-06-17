import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mail, 
  MessageSquare, 
  Gift, 
  Megaphone, 
  Users, 
  TrendingUp,
  Plus,
  Send,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const campaigns = [
  { 
    id: "1", 
    name: "Summer Sale - 20% Off", 
    type: "Email", 
    status: "active", 
    sent: 847, 
    opened: 423, 
    clicked: 156,
    openRate: "50%",
    clickRate: "18%"
  },
  { 
    id: "2", 
    name: "New Client Welcome", 
    type: "SMS", 
    status: "active", 
    sent: 156, 
    opened: null, 
    clicked: null,
    openRate: null,
    clickRate: null
  },
  { 
    id: "3", 
    name: "Birthday Discount", 
    type: "Email", 
    status: "scheduled", 
    sent: 0, 
    opened: 0, 
    clicked: 0,
    openRate: "0%",
    clickRate: "0%"
  },
];

const marketingTools = [
  { 
    title: "Email Campaigns", 
    description: "Send promotional emails to clients", 
    icon: Mail,
    color: "bg-appointment-blue/10 text-appointment-blue",
    borderColor: "border-appointment-blue/20"
  },
  { 
    title: "SMS Marketing", 
    description: "Reach clients via text messages", 
    icon: MessageSquare,
    color: "bg-appointment-green/10 text-appointment-green",
    borderColor: "border-appointment-green/20"
  },
  { 
    title: "Loyalty Program", 
    description: "Reward returning customers", 
    icon: Gift,
    color: "bg-appointment-purple/10 text-appointment-purple",
    borderColor: "border-appointment-purple/20"
  },
  { 
    title: "Referral System", 
    description: "Encourage client referrals", 
    icon: Users,
    color: "bg-appointment-coral/10 text-appointment-coral",
    borderColor: "border-appointment-coral/20"
  },
];

export default function MarketingPage() {
  const navigate = useNavigate();
  
  return (
    <AppLayout>
      <PageHeader
        title="Marketing"
        subtitle="Grow your business with campaigns and promotions"
        actions={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md transition-all">
            <Plus size={16} />
            New Campaign
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Enhanced Marketing Tools */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {marketingTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Card 
                key={tool.title} 
                className={`border-border/60 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/95 backdrop-blur-sm group card-interactive ${tool.borderColor} hover:border-2`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  if (tool.title === "Referral System") {
                    navigate("/referral-program");
                  }
                }}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tool.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{tool.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Active Campaigns */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Active Campaigns</CardTitle>
                <CardDescription className="mt-1">Your running and scheduled campaigns</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
              >
                <TrendingUp size={14} />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign, index) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-5 rounded-xl border border-border/60 hover:border-accent/30 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 transition-all duration-300 group cursor-pointer"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${campaign.type === "Email" ? "bg-appointment-blue/10" : "bg-appointment-green/10"} group-hover:scale-110 transition-transform`}>
                      {campaign.type === "Email" ? (
                        <Mail className="h-5 w-5 text-appointment-blue" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-appointment-green" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{campaign.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={campaign.status === "active" 
                            ? "bg-status-completed/10 text-status-completed border-status-completed/20 text-[10px] px-2 py-0.5" 
                            : "bg-status-pending/10 text-status-pending border-status-pending/20 text-[10px] px-2 py-0.5"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{campaign.type} Campaign</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-base">{campaign.sent}</p>
                      <p className="text-xs text-muted-foreground font-medium">Sent</p>
                    </div>
                    {campaign.opened !== null && (
                      <div className="text-center">
                        <p className="font-bold text-base">{campaign.opened}</p>
                        <p className="text-xs text-muted-foreground font-medium">Opened</p>
                        <p className="text-xs text-status-completed font-semibold mt-0.5">{campaign.openRate}</p>
                      </div>
                    )}
                    {campaign.clicked !== null && (
                      <div className="text-center">
                        <p className="font-bold text-base">{campaign.clicked}</p>
                        <p className="text-xs text-muted-foreground font-medium">Clicked</p>
                        <p className="text-xs text-status-completed font-semibold mt-0.5">{campaign.clickRate}</p>
                      </div>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
