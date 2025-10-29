"use client";

import { useState } from "react";
import AnalyticsView from "../../components/AnalyticsView";
import UploadManager from "../../components/UploadManager";
import SubscriberManager from "../../components/SubscriberManager";
import SubscriptionGate from "../../components/SubscriptionGate";
import BookLibrary from "../../components/BookLibrary";

type TabType = "analytics" | "books" | "upload" | "subscribers";

export default function StudioPage() {
  return (
    <SubscriptionGate feature="Creator Studio" requiredTier="creator">
      <StudioContent />
    </SubscriptionGate>
  );
}

function StudioContent() {
  const [activeTab, setActiveTab] = useState<TabType>("analytics");

  const renderTabContent = () => {
    switch (activeTab) {
      case "books":
        return <BookLibrary />;
      case "upload":
        return <UploadManager />;
      case "analytics":
        return <AnalyticsView />;
      case "subscribers":
        return <SubscriberManager />;
    }
  };

  return (
    <div className="min-h-screen px-8 py-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-accent mb-4">
            Creator Studio
          </h1>
          <p className="text-text-light/80 text-lg">
            Manage your audiobooks, track analytics, and grow your audience
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-6 mb-8 border-b border-surface">
          {[
            { key: "analytics", label: "Analytics", icon: "�" },
            { key: "books", label: "My Books", icon: "📚" },
            { key: "upload", label: "Upload", icon: "📤" },
            { key: "subscribers", label: "Subscribers", icon: "👥" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 pb-4 px-2 font-medium transition ${
                activeTab === tab.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-text-light/70 hover:text-text-light"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}
