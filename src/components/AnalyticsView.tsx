"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalPlays: number;
    totalCompletions: number;
    completionRate: number;
    totalBooks: number;
    publishedBooks: number;
    averageRating: number;
    followersCount: number;
    followingCount: number;
  };
  chartData: Array<{
    date: string;
    views: number;
    plays: number;
    completions: number;
  }>;
  topBooks: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    rating: number;
  }>;
  recentActivity: Array<{
    eventType: string;
    workId: string;
    timestamp: string;
    data: any;
  }>;
}

export default function AnalyticsView() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90" | "all">("30");

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      const daysParam = timeRange === "all" ? "10000" : timeRange;
      
      // Add 8 second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`/api/analytics?days=${daysParam}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Analytics fetch timed out - showing empty state');
      } else {
        console.error("Failed to fetch analytics:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-bold text-text-light mb-2">
          No Analytics Data
        </h3>
        <p className="text-text-light/60">
          Start creating content to see your analytics!
        </p>
      </div>
    );
  }

  const { overview, chartData, topBooks } = analytics;

  return (
    <div>
      <div className="flex justify-end gap-2 mb-6">
        {(["7", "30", "90", "all"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              timeRange === range
                ? "bg-accent text-background border-accent"
                : "bg-surface/50 text-text-light hover:bg-surface border-transparent hover:border-highlight/50"
            }`}
          >
            {range === "all" ? "All Time" : `${range} Days`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface/80 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-accent rounded"></div>
            </div>
            <h3 className="font-medium text-text-light">Total Views</h3>
          </div>
          <p className="text-2xl font-bold text-accent">
            {overview.totalViews.toLocaleString()}
          </p>
          <p className="text-sm text-text-light/60">
            {timeRange === "all" ? "All time" : `Last ${timeRange} days`}
          </p>
        </div>

        <div className="bg-surface/80 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
            </div>
            <h3 className="font-medium text-text-light">Total Likes</h3>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {overview.totalLikes.toLocaleString()}
          </p>
          <p className="text-sm text-text-light/60">
            {timeRange === "all" ? "All time" : `Last ${timeRange} days`}
          </p>
        </div>

        <div className="bg-surface/80 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
            </div>
            <h3 className="font-medium text-text-light">Followers</h3>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {overview.followersCount.toLocaleString()}
          </p>
          <p className="text-sm text-text-light/60">Current total</p>
        </div>

        <div className="bg-surface/80 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
            </div>
            <h3 className="font-medium text-text-light">Published</h3>
          </div>
          <p className="text-2xl font-bold text-orange-500">
            {overview.publishedBooks || overview.totalBooks}
          </p>
          <p className="text-sm text-text-light/60">Books & chapters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-xl font-bold text-text-light mb-4">
            Performance Over Time
          </h3>
          <div className="h-64 flex items-end gap-2">
            {(() => {
              // Generate complete date range based on time period
              const today = new Date();
              const dataPoints: any[] = [];

              if (timeRange === "7") {
                // Last 7 days - show all 7 days
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(today);
                  date.setDate(date.getDate() - i);
                  const dateStr = date.toISOString().split("T")[0];
                  const existingData = chartData.find(
                    (d) => d.date === dateStr
                  );
                  dataPoints.push({
                    date: dateStr,
                    views: existingData?.views || 0,
                    plays: existingData?.plays || 0,
                    completions: existingData?.completions || 0,
                  });
                }
              } else if (timeRange === "30") {
                // Current month - from 1st to last day of current month
                const firstDayOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1
                );
                const lastDayOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  0
                );

                for (
                  let d = new Date(firstDayOfMonth);
                  d <= lastDayOfMonth;
                  d.setDate(d.getDate() + 1)
                ) {
                  const dateStr = d.toISOString().split("T")[0];
                  const existingData = chartData.find(
                    (data) => data.date === dateStr
                  );
                  dataPoints.push({
                    date: dateStr,
                    views: existingData?.views || 0,
                    plays: existingData?.plays || 0,
                    completions: existingData?.completions || 0,
                  });
                }
              } else if (timeRange === "90") {
                // Last 3 months - show 3 bars (one per month)
                const monthlyData: Record<string, any> = {};

                // Generate 3 month keys (previous 2 months + current month)
                for (let i = 2; i >= 0; i--) {
                  const monthDate = new Date(
                    today.getFullYear(),
                    today.getMonth() - i,
                    1
                  );
                  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
                  monthlyData[monthKey] = {
                    date: monthKey,
                    views: 0,
                    plays: 0,
                    completions: 0,
                  };
                }

                // Aggregate data into these 3 months
                chartData.forEach((d) => {
                  const date = new Date(d.date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                  if (monthlyData[monthKey]) {
                    monthlyData[monthKey].views += d.views;
                    monthlyData[monthKey].plays += d.plays;
                    monthlyData[monthKey].completions += d.completions;
                  }
                });

                dataPoints.push(...Object.values(monthlyData));
              } else {
                // All time - show current year (January through December)
                const monthlyData: Record<string, any> = {};
                const currentYear = today.getFullYear();

                // Generate all 12 months of the current year (Jan-Dec)
                for (let month = 0; month < 12; month++) {
                  const monthKey = `${currentYear}-${String(month + 1).padStart(2, "0")}`;
                  monthlyData[monthKey] = {
                    date: monthKey,
                    views: 0,
                    plays: 0,
                    completions: 0,
                  };
                }

                // Aggregate data into these 12 months
                chartData.forEach((d) => {
                  const date = new Date(d.date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                  if (monthlyData[monthKey]) {
                    monthlyData[monthKey].views += d.views;
                    monthlyData[monthKey].plays += d.plays;
                    monthlyData[monthKey].completions += d.completions;
                  }
                });

                dataPoints.push(...Object.values(monthlyData));
              }

              const maxValue = Math.max(
                ...(dataPoints.length > 0
                  ? dataPoints.map((d) => d.views)
                  : [1]),
                1
              );

              return dataPoints.map((day, i) => {
                const height = maxValue > 0 ? (day.views / maxValue) * 100 : 0;
                let date: Date;
                let dateLabel = "";

                // Handle different date formats
                if (timeRange === "90" || timeRange === "all") {
                  // Month format (YYYY-MM)
                  const [year, month] = day.date.split("-");
                  date = new Date(parseInt(year), parseInt(month) - 1, 1);
                  dateLabel = date.toLocaleDateString("en-US", {
                    month: "short",
                  });
                } else {
                  date = new Date(day.date);

                  // Format date label based on time range
                  if (timeRange === "7") {
                    // Show day of week (Sun, Mon, Tue, etc.)
                    dateLabel = date.toLocaleDateString("en-US", {
                      weekday: "short",
                    });
                  } else if (timeRange === "30") {
                    // Show day of month (1, 2, 3, etc.)
                    dateLabel = date.getDate().toString();
                  }
                }

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2"
                    style={{
                      minWidth:
                        timeRange === "90"
                          ? "6px"
                          : timeRange === "30"
                            ? "10px"
                            : "auto",
                    }}
                  >
                    <div className="w-full bg-accent/20 rounded-t relative group cursor-pointer hover:bg-accent/30 transition">
                      <div
                        className="w-full bg-accent rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(height * 2, 4)}px`,
                          minHeight: "4px",
                        }}
                      ></div>
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background/90 text-text-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                        {day.views} views on{" "}
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    {dateLabel && (
                      <span className="text-xs text-text-light/60">
                        {dateLabel}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-xl font-bold text-text-light mb-4">
            Playback Stats
          </h3>
          <div className="space-y-3">
            {(() => {
              // Show last 5-10 entries based on time range
              const recentData =
                timeRange === "7"
                  ? chartData.slice(-7)
                  : timeRange === "30"
                    ? chartData.slice(-10)
                    : timeRange === "90"
                      ? chartData.slice(-10)
                      : chartData.slice(-10); // all time

              return recentData.map((day, i) => {
                const completionRate =
                  day.plays > 0 ? (day.completions / day.plays) * 100 : 0;
                const date = new Date(day.date);

                // Format date label based on time range (same logic as Performance chart)
                let dateLabel = "";
                if (timeRange === "7") {
                  dateLabel = date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                } else if (timeRange === "30") {
                  dateLabel = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                } else if (timeRange === "90") {
                  dateLabel = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                } else {
                  dateLabel = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-background/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-text-light/60 mb-1">
                        {dateLabel}
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div
                          className="bg-green-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-text-light">
                        {day.plays} plays
                      </div>
                      <div className="text-xs text-green-400">
                        {day.completions} completed
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="bg-surface/50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-text-light mb-4">
          Top Performing Books
        </h2>
        <div className="space-y-3">
          {topBooks.slice(0, 5).map((book, i) => (
            <div
              key={book.id}
              className="flex items-center justify-between p-3 bg-background/30 rounded-lg hover:bg-background/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center text-accent font-bold">
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium text-text-light">
                    {book.title}
                  </div>
                  <div className="text-sm text-text-light/60">
                    {book.views.toLocaleString()} views {book.likes} likes{" "}
                    {book.comments} comments
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-light/60">Rating</div>
                <div className="text-lg font-semibold text-accent">
                  {" "}
                  {book.rating ? book.rating.toFixed(1) : "—"}
                </div>
              </div>
            </div>
          ))}
          {topBooks.length === 0 && (
            <p className="text-center py-8 text-text-light/60">
              No books yet. Upload your first book to see analytics!
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-light mb-4">
            Follower Tiers
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-light/70">Free Followers</span>
              <span className="text-accent font-bold">
                {Math.floor(overview.followersCount * 0.8)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-light/70">Paid Subscribers</span>
              <span className="text-green-400 font-bold">
                {Math.floor(overview.followersCount * 0.2)}
              </span>
            </div>
            <div className="pt-2 border-t border-surface">
              <div className="text-sm text-text-light/60">Total Followers</div>
              <div className="text-2xl font-bold text-accent">
                {overview.followersCount}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-light mb-4">
            Completion Rate
          </h3>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-purple-500">
                {overview.completionRate
                  ? overview.completionRate.toFixed(1)
                  : "0.0"}
                %
              </div>
              <div className="text-sm text-text-light/60 mt-1">
                of listeners finish books
              </div>
            </div>
            <div className="w-full bg-surface rounded-full h-3 mb-2">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overview.completionRate, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-text-light/60">Total Plays</div>
                <div className="text-text-light font-semibold">
                  {overview.totalPlays}
                </div>
              </div>
              <div className="text-right">
                <div className="text-text-light/60">Completions</div>
                <div className="text-purple-500 font-semibold">
                  {overview.totalCompletions}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-light mb-4">Engagement</h3>
          <div className="space-y-4">
            {(() => {
              // Calculate engagement percentages relative to views
              const maxEngagement = Math.max(
                overview.totalViews,
                overview.totalLikes,
                overview.totalComments
              );
              const viewPercent =
                maxEngagement > 0
                  ? (overview.totalViews / maxEngagement) * 100
                  : 0;
              const likePercent =
                maxEngagement > 0
                  ? (overview.totalLikes / maxEngagement) * 100
                  : 0;
              const commentPercent =
                maxEngagement > 0
                  ? (overview.totalComments / maxEngagement) * 100
                  : 0;

              return (
                <>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-text-light/70 text-sm">Views</span>
                      <span className="text-text-light text-sm">
                        {overview.totalViews}
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${viewPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-text-light/70 text-sm">Likes</span>
                      <span className="text-text-light text-sm">
                        {overview.totalLikes}
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-red-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${likePercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-text-light/70 text-sm">
                        Comments
                      </span>
                      <span className="text-text-light text-sm">
                        {overview.totalComments}
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${commentPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="bg-surface/50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-light mb-4">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-light/70">Avg. Rating</span>
              <span className="text-accent font-bold">
                {overview.averageRating
                  ? overview.averageRating.toFixed(1)
                  : "0.0"}{" "}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-light/70">Total Books</span>
              <span className="text-accent font-bold">
                {overview.totalBooks}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-light/70">Comments</span>
              <span className="text-accent font-bold">
                {overview.totalComments}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
