import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ThumbsUp, MessageSquare, TrendingUp, Reply } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const reviewStats = {
  average: 4.8,
  total: 128,
  breakdown: [
    { stars: 5, count: 89, percent: 69 },
    { stars: 4, count: 28, percent: 22 },
    { stars: 3, count: 8, percent: 6 },
    { stars: 2, count: 2, percent: 2 },
    { stars: 1, count: 1, percent: 1 },
  ],
};

const recentReviews = [
  {
    id: "1",
    client: "Sarah Mitchell",
    rating: 5,
    date: "2 days ago",
    service: "Hair Cut & Color",
    staff: "Maria",
    comment: "Absolutely loved my experience! Maria is incredibly talented and understood exactly what I wanted. The salon is beautiful and the service was exceptional.",
  },
  {
    id: "2",
    client: "James Wilson",
    rating: 5,
    date: "3 days ago",
    service: "Swedish Massage",
    staff: "Amy",
    comment: "Best massage I've ever had. Amy is a true professional. The atmosphere was so relaxing. Will definitely be back!",
  },
  {
    id: "3",
    client: "Emily Brown",
    rating: 4,
    date: "5 days ago",
    service: "Manicure",
    staff: "Wendy",
    comment: "Great service and lovely results. The only reason for 4 stars is the wait time was a bit longer than expected.",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? "fill-appointment-yellow text-appointment-yellow" : "text-border"}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Reviews"
        subtitle="Monitor and respond to client feedback"
        actions={
          <Button 
            variant="outline" 
            className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
          >
            <MessageSquare size={16} />
            Request Reviews
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Enhanced Stats Overview */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Enhanced Rating Summary */}
          <Card className="lg:col-span-1 border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Overall Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl font-bold bg-gradient-to-br from-accent to-purple-600 bg-clip-text text-transparent">
                  {reviewStats.average}
                </span>
                <div>
                  <StarRating rating={5} />
                  <p className="text-sm text-muted-foreground font-medium mt-1">{reviewStats.total} reviews</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {reviewStats.breakdown.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-4">{item.stars}</span>
                    <Star size={12} className="fill-appointment-yellow text-appointment-yellow" />
                    <Progress value={item.percent} className="flex-1 h-2.5" />
                    <span className="text-sm text-muted-foreground font-medium w-8">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Quick Stats */}
          <Card className="lg:col-span-2 border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Review Insights</CardTitle>
                <CardDescription className="mt-1">Performance trends this month</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-status-completed/10 to-status-completed/5 border border-status-completed/20 hover:scale-105 transition-transform cursor-pointer">
                  <TrendingUp className="h-7 w-7 mx-auto mb-2 text-status-completed" />
                  <p className="text-3xl font-bold text-foreground">+12</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">New Reviews</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-appointment-blue/10 to-appointment-blue/5 border border-appointment-blue/20 hover:scale-105 transition-transform cursor-pointer">
                  <ThumbsUp className="h-7 w-7 mx-auto mb-2 text-appointment-blue" />
                  <p className="text-3xl font-bold text-foreground">92%</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Positive</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-gradient-to-br from-appointment-purple/10 to-appointment-purple/5 border border-appointment-purple/20 hover:scale-105 transition-transform cursor-pointer">
                  <MessageSquare className="h-7 w-7 mx-auto mb-2 text-appointment-purple" />
                  <p className="text-3xl font-bold text-foreground">100%</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Recent Reviews */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Recent Reviews</CardTitle>
              <CardDescription className="mt-1">Latest feedback from your clients</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentReviews.map((review, index) => (
                <div 
                  key={review.id} 
                  className="border-b border-border/60 pb-6 last:border-0 last:pb-0"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="ring-2 ring-background">
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-purple-600/20 text-foreground font-semibold">
                          {review.client.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{review.client}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {review.service} • {review.staff}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StarRating rating={review.rating} />
                      <p className="text-xs text-muted-foreground font-medium mt-1">{review.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{review.comment}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-border/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
                  >
                    <Reply size={14} />
                    Reply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}



























