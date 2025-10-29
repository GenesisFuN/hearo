"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import LoadingState from "./LoadingState";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_type: string;
  reward_data: any;
  unlocked: boolean;
  progress: number;
  currentValue: number;
  is_secret?: boolean; // Secret achievements hide details until unlocked
}

interface Stats {
  totalHours: number;
  totalMinutes: number;
  booksCompleted: number;
  booksStarted: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  unlockedCount: number;
}

export default function ListeningStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Stats data received:", {
          achievementsCount: data.achievements?.length || 0,
          hasError: !!data.error,
        });
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch stats:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your stats..." />;
  }

  // Show default stats if none exist yet
  const displayStats = stats || {
    totalHours: 0,
    totalMinutes: 0,
    booksCompleted: 0,
    booksStarted: 0,
    currentStreak: 0,
    longestStreak: 0,
    achievements: [],
    unlockedCount: 0,
  };

  const categories = ["all", "listening", "streak", "engagement"];

  // Separate unlocked and locked from ALL achievements first (before category filter)
  const allUnlockedAchievements = displayStats.achievements.filter(
    (a) => a.unlocked
  );
  const allLockedAchievements = displayStats.achievements.filter(
    (a) => !a.unlocked
  );

  // Progressive achievement display logic - works on ALL achievements
  const getProgressiveAchievements = () => {
    console.log(
      "Locked achievements:",
      allLockedAchievements.map((a) => ({
        name: a.name,
        category: a.category,
        requirement: a.requirement_value,
        type: a.requirement_type,
      }))
    );

    const achievementsByType: Record<string, Achievement[]> = {};

    // Group ALL locked achievements by BOTH category AND requirement_type
    allLockedAchievements.forEach((achievement) => {
      // Create unique key: "listening-books", "listening-hours", "streak-streak_days"
      const typeKey = `${achievement.category}-${achievement.requirement_type}`;
      if (!achievementsByType[typeKey]) {
        achievementsByType[typeKey] = [];
      }
      achievementsByType[typeKey].push(achievement);
    });

    console.log(
      "Grouped by type:",
      Object.keys(achievementsByType).map((type) => ({
        type: type,
        count: achievementsByType[type].length,
        achievements: achievementsByType[type].map((a) => a.name),
      }))
    );

    // For each type, sort by requirement_value and take only the first locked one
    const nextAchievements: Achievement[] = [];
    Object.keys(achievementsByType).forEach((type) => {
      // Sort by requirement value (lowest first)
      const typeAchievements = achievementsByType[type].sort(
        (a, b) => a.requirement_value - b.requirement_value
      );

      console.log(
        `Type ${type} sorted:`,
        typeAchievements.map((a) => ({
          name: a.name,
          value: a.requirement_value,
          unlocked: a.unlocked,
        }))
      );

      // Take the first one (lowest requirement value)
      if (typeAchievements.length > 0) {
        nextAchievements.push(typeAchievements[0]);
      }
    });

    console.log(
      "Final progressive achievements:",
      nextAchievements.map((a) => ({
        name: a.name,
        type: a.requirement_type,
        value: a.requirement_value,
        progress: a.progress,
      }))
    );
    return nextAchievements;
  };

  const progressiveLockedAchievements = getProgressiveAchievements();

  // NOW apply category filter for display
  const filteredUnlocked = allUnlockedAchievements.filter(
    (a) => selectedCategory === "all" || a.category === selectedCategory
  );
  const filteredProgressiveLocked = progressiveLockedAchievements.filter(
    (a) => selectedCategory === "all" || a.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Listening Time */}
        <div className="bg-surface rounded-lg p-6 border border-surface-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-light/70 text-sm font-medium">
              Total Listening
            </span>
            <span className="text-2xl">🎧</span>
          </div>
          <div className="text-3xl font-bold text-accent mb-1">
            {displayStats.totalHours}h {displayStats.totalMinutes}m
          </div>
          <div className="text-xs text-text-light/50">Time spent listening</div>
        </div>

        {/* Books Completed */}
        <div className="bg-surface rounded-lg p-6 border border-surface-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-light/70 text-sm font-medium">
              Completed
            </span>
            <span className="text-2xl">📚</span>
          </div>
          <div className="text-3xl font-bold text-accent mb-1">
            {displayStats.booksCompleted}
          </div>
          <div className="text-xs text-text-light/50">
            Books finished (95%+)
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-surface rounded-lg p-6 border border-surface-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-light/70 text-sm font-medium">
              Current Streak
            </span>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="text-3xl font-bold text-accent mb-1">
            {displayStats.currentStreak}
          </div>
          <div className="text-xs text-text-light/50">Days in a row</div>
        </div>

        {/* Longest Streak */}
        <div className="bg-surface rounded-lg p-6 border border-surface-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-light/70 text-sm font-medium">
              Best Streak
            </span>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-3xl font-bold text-accent mb-1">
            {displayStats.longestStreak}
          </div>
          <div className="text-xs text-text-light/50">Personal record</div>
        </div>
      </div>

      {/* Achievements Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-light mb-1">
              Achievements
            </h2>
            <p className="text-sm text-text-light/70">
              {displayStats.achievements.length === 0 ? (
                "Setting up achievements..."
              ) : (
                <>
                  {allUnlockedAchievements.length} of{" "}
                  {displayStats.achievements.length} unlocked
                </>
              )}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? "bg-accent text-background"
                    : "bg-surface text-text-light/70 hover:bg-surface-light"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* No achievements configured */}
        {displayStats.achievements.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg border border-surface-light">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-text-light mb-2">
              Achievements System Not Configured
            </h3>
            <p className="text-text-light/70 mb-4">
              Please run the database migration to set up achievements.
            </p>
            <code className="text-xs bg-background px-3 py-1 rounded text-accent">
              docs/listening-stats-schema.sql
            </code>
          </div>
        ) : (
          <>
            {/* Unlocked Achievements */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-text-light mb-4 flex items-center gap-2">
                <span>🎉 Unlocked</span>
                <span className="text-sm font-normal text-text-light/50">
                  ({filteredUnlocked.length})
                </span>
              </h3>
              {filteredUnlocked.length === 0 ? (
                <div className="text-center py-8 bg-surface rounded-lg border border-surface-light">
                  <p className="text-text-light/70">
                    No achievements unlocked yet. Keep listening to unlock your
                    first achievement!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUnlocked.map((achievement) => {
                    const isSecretRevealed = achievement.is_secret;

                    return (
                      <div
                        key={achievement.id}
                        className={`bg-surface rounded-lg p-4 border-2 relative overflow-hidden ${
                          isSecretRevealed
                            ? "border-purple-500/70 bg-gradient-to-br from-purple-500/10 to-transparent"
                            : "border-accent/50"
                        }`}
                      >
                        {/* Shine effect */}
                        <div
                          className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${
                            isSecretRevealed
                              ? "from-purple-400/20"
                              : "from-accent/20"
                          } to-transparent rounded-bl-full`}
                        />

                        {/* Secret badge */}
                        {isSecretRevealed && (
                          <div className="absolute top-2 left-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-400/30">
                            🔓 Secret Unlocked!
                          </div>
                        )}

                        <div className="flex items-start gap-3 relative mt-6">
                          <div className="text-4xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <h4
                              className={`font-bold mb-1 ${
                                isSecretRevealed
                                  ? "text-purple-300"
                                  : "text-text-light"
                              }`}
                            >
                              {achievement.name}
                            </h4>
                            <p className="text-sm text-text-light/70 mb-2">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-2">
                              {achievement.reward_type === "badge" && (
                                <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                                  🏅 Badge
                                </span>
                              )}
                              {achievement.reward_type === "theme" && (
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                  🎨 Theme
                                </span>
                              )}
                              {achievement.reward_type === "credits" && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                                  💰 {achievement.reward_data?.amount} Credits
                                </span>
                              )}
                              {achievement.reward_type === "avatar_border" && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                  ✨ Border
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next Achievements (Progressive Display) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-light flex items-center gap-2">
                  <span>🎯 Next Goals</span>
                  <span className="text-sm font-normal text-text-light/50">
                    ({filteredProgressiveLocked.length})
                  </span>
                </h3>
                <p className="text-xs text-text-light/60 italic">
                  Complete these to unlock the next tier!
                </p>
              </div>
              {filteredProgressiveLocked.length === 0 ? (
                <div className="text-center py-8 bg-surface rounded-lg border border-surface-light">
                  <p className="text-text-light/70">
                    🎉 You've unlocked all available achievements! Amazing work!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProgressiveLocked.map((achievement) => {
                    const isSecret = achievement.name === "???";

                    return (
                      <div
                        key={achievement.id}
                        className={`bg-surface rounded-lg p-4 border ${
                          isSecret
                            ? "border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent"
                            : "border-surface-light"
                        } opacity-75`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`text-4xl ${isSecret ? "animate-pulse" : "grayscale opacity-50"}`}
                          >
                            {isSecret ? "🔒" : achievement.icon}
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-bold mb-1 ${isSecret ? "text-purple-400" : "text-text-light"}`}
                            >
                              {achievement.name}
                            </h4>
                            <p className="text-sm text-text-light/70 mb-3">
                              {achievement.description}
                            </p>

                            {/* Progress Bar - only show for non-secret achievements */}
                            {!isSecret && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-text-light/70">
                                  <span>
                                    {achievement.currentValue} /{" "}
                                    {achievement.requirement_value}{" "}
                                    {achievement.requirement_type === "hours" &&
                                      "hours"}
                                    {achievement.requirement_type === "books" &&
                                      "books"}
                                    {achievement.requirement_type ===
                                      "streak_days" && "days"}
                                    {achievement.requirement_type === "likes" &&
                                      "likes"}
                                    {achievement.requirement_type ===
                                      "comments" && "comments"}
                                  </span>
                                  <span>
                                    {Math.floor(achievement.progress)}%
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all duration-300"
                                    style={{
                                      width: `${achievement.progress}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
