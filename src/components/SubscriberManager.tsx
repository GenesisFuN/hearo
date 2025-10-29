"use client";

import { useState } from "react";

interface Subscriber {
  id: string;
  username: string;
  email: string;
  tier: "free" | "premium" | "vip";
  joinDate: string;
  totalSpent: number;
  lastActive: string;
  avatar?: string;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  description: string;
  benefits: string[];
  subscriberCount: number;
  color: string;
}

export default function SubscriberManager() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "tiers" | "subscribers"
  >("overview");

  const tiers: SubscriptionTier[] = [
    {
      id: "free",
      name: "Free Followers",
      price: 0,
      description: "Basic access to your public content",
      benefits: ["Access to free audiobooks", "Basic community features"],
      subscriberCount: 1892,
      color: "text-text-light",
    },
    {
      id: "premium",
      name: "Premium Supporters",
      price: 5,
      description: "Enhanced access with early releases",
      benefits: [
        "Early access to new releases",
        "Exclusive monthly content",
        "Discord access",
        "No ads",
      ],
      subscriberCount: 387,
      color: "text-green-400",
    },
    {
      id: "vip",
      name: "VIP Inner Circle",
      price: 15,
      description: "Direct connection with behind-the-scenes access",
      benefits: [
        "All Premium benefits",
        "Monthly 1-on-1 calls",
        "Manuscript previews",
        "Character naming rights",
      ],
      subscriberCount: 62,
      color: "text-purple-400",
    },
  ];

  const subscribers: Subscriber[] = [
    {
      id: "1",
      username: "BookLover92",
      email: "booklover@email.com",
      tier: "vip",
      joinDate: "2024-08-15",
      totalSpent: 145,
      lastActive: "2 hours ago",
    },
    {
      id: "2",
      username: "AudioFanatic",
      email: "audiofan@email.com",
      tier: "premium",
      joinDate: "2024-09-22",
      totalSpent: 35,
      lastActive: "1 day ago",
    },
    {
      id: "3",
      username: "StorySeeker",
      email: "stories@email.com",
      tier: "premium",
      joinDate: "2024-07-03",
      totalSpent: 85,
      lastActive: "3 hours ago",
    },
    {
      id: "4",
      username: "CasualListener",
      email: "casual@email.com",
      tier: "free",
      joinDate: "2024-10-01",
      totalSpent: 0,
      lastActive: "5 days ago",
    },
  ];

  const recentDonations = [
    {
      id: "1",
      username: "BookLover92",
      amount: 25,
      message: "Amazing chapter! Can't wait for the next one!",
      date: "2 hours ago",
    },
    {
      id: "2",
      username: "MysteryFan",
      amount: 10,
      message: "Your voice acting is incredible",
      date: "1 day ago",
    },
    {
      id: "3",
      username: "AudioFanatic",
      amount: 15,
      message: "Keep up the great work!",
      date: "2 days ago",
    },
    {
      id: "4",
      username: "StorySeeker",
      amount: 5,
      message: "Thanks for the amazing stories",
      date: "3 days ago",
    },
  ];

  const getTierStyle = (tier: string) => {
    switch (tier) {
      case "vip":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "premium":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-surface/50 text-text-light/70 border-surface";
    }
  };

  return (
    <div className="bg-surface/50 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-light">
          Subscriber Management
        </h2>
        <button className="bg-accent hover:bg-accent/80 text-background px-4 py-2 rounded-lg font-medium transition">
          Send Broadcast
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-surface">
        {[
          { key: "overview", label: "Overview" },
          { key: "tiers", label: "Subscription Tiers" },
          { key: "subscribers", label: "Subscribers" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 px-1 font-medium transition ${
              activeTab === tab.key
                ? "text-accent border-b-2 border-accent"
                : "text-text-light/70 hover:text-text-light"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-accent">2,341</div>
              <div className="text-text-light/70">Total Subscribers</div>
              <div className="text-green-400 text-sm">+156 this week</div>
            </div>
            <div className="bg-background/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">$1,945</div>
              <div className="text-text-light/70">Monthly Recurring</div>
              <div className="text-green-400 text-sm">+23% vs last month</div>
            </div>
            <div className="bg-background/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">89%</div>
              <div className="text-text-light/70">Retention Rate</div>
              <div className="text-green-400 text-sm">+5% vs last month</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-medium text-text-light mb-4">
              Recent Donations & Tips
            </h3>
            <div className="space-y-3">
              {recentDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex justify-between items-start p-3 bg-background/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-light">
                        {donation.username}
                      </span>
                      <span className="text-green-400 font-bold">
                        ${donation.amount}
                      </span>
                      <span className="text-text-light/50 text-sm">
                        {donation.date}
                      </span>
                    </div>
                    <p className="text-text-light/70 text-sm">
                      "{donation.message}"
                    </p>
                  </div>
                  <button className="text-accent hover:text-accent/80 text-sm">
                    Reply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-text-light">
              Manage Subscription Tiers
            </h3>
            <button className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2 rounded-lg font-medium transition">
              Create New Tier
            </button>
          </div>

          <div className="grid gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="border border-surface rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className={`text-xl font-bold ${tier.color} mb-2`}>
                      {tier.name}
                      {tier.price > 0 && (
                        <span className="ml-2">${tier.price}/month</span>
                      )}
                    </h4>
                    <p className="text-text-light/70">{tier.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${tier.color}`}>
                      {tier.subscriberCount.toLocaleString()}
                    </div>
                    <div className="text-text-light/60 text-sm">
                      subscribers
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="font-medium text-text-light mb-2">
                    Benefits:
                  </h5>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, i) => (
                      <li
                        key={i}
                        className="text-text-light/70 text-sm flex items-center gap-2"
                      >
                        <span className="text-accent">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button className="bg-surface hover:bg-surface/80 text-text-light px-4 py-2 rounded font-medium transition">
                    Edit Tier
                  </button>
                  <button className="text-text-light/70 hover:text-text-light px-4 py-2 rounded font-medium transition">
                    View Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscribers Tab */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-text-light">
              All Subscribers
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search subscribers..."
                className="bg-background border border-surface rounded-lg px-3 py-2 text-text-light text-sm"
              />
              <select className="bg-background border border-surface rounded-lg px-3 py-2 text-text-light text-sm">
                <option value="">All Tiers</option>
                <option value="vip">VIP Only</option>
                <option value="premium">Premium Only</option>
                <option value="free">Free Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between p-4 bg-background/30 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent font-medium">
                      {subscriber.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-text-light">
                      {subscriber.username}
                    </div>
                    <div className="text-sm text-text-light/60">
                      {subscriber.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-text-light/70">
                      Joined {subscriber.joinDate}
                    </div>
                    <div className="text-sm text-text-light/50">
                      Active {subscriber.lastActive}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-green-400 font-medium">
                      ${subscriber.totalSpent}
                    </div>
                    <div className="text-sm text-text-light/60">
                      total spent
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getTierStyle(subscriber.tier)}`}
                  >
                    {subscriber.tier.toUpperCase()}
                  </div>

                  <button className="text-accent hover:text-accent/80 text-sm">
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
