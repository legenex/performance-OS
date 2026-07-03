import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import GlobalHeader from "@/components/layout/GlobalHeader";
import AskAiPanel from "@/components/ai/AskAiPanel";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [includeTest, setIncludeTest] = useState(false);

  return (
    <div className="h-screen flex bg-graphite-base overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalHeader includeTest={includeTest} setIncludeTest={setIncludeTest} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ includeTest }} />
        </main>
      </div>
      <AskAiPanel includeTest={includeTest} />
    </div>
  );
}