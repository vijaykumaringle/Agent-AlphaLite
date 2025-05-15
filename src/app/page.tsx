// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataInputSection } from "@/components/data-input-section";
import { DispatchDashboardSection } from "@/components/dispatch-dashboard-section";
import { ChatAgentSection } from "@/components/chat-agent-section";
import type { DispatchPlanResult, ChatMessage } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [planData, setPlanData] = useState<DispatchPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("chat-agent"); // Updated default tab
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState<boolean>(false);

  // Add initial greeting message from agent
  useEffect(() => {
    setChatMessages([
      {
        id: 'initial-greeting',
        sender: 'agent',
        text: "Hello! I'm AlphaLite, StockPilot's AI assistant. How can I assist you with inventory and orders today?",
        timestamp: new Date(),
      }
    ]);
  }, []);


  const handlePlanGenerated = (data: DispatchPlanResult) => {
    setPlanData(data);
    setActiveTab("dispatch-dashboard"); 
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex mb-6 shadow-sm">
            <TabsTrigger value="chat-agent">Chat Agent</TabsTrigger>
            <TabsTrigger value="dispatch-dashboard">Dispatch Dashboard</TabsTrigger>
            <TabsTrigger value="data-input">Data Input</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat-agent">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="pr-4">
                <ChatAgentSection 
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  isProcessing={isChatProcessing}
                  setIsProcessing={setIsChatProcessing}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="dispatch-dashboard">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="pr-4">
                <DispatchDashboardSection planData={planData} isLoading={isLoading} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="data-input">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="pr-4">
                <DataInputSection 
                  onPlanGenerated={handlePlanGenerated} 
                  setIsLoading={setIsLoading}
                  isLoading={isLoading}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
      <footer className="py-4 px-4 md:px-6 border-t text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AlphaLite. All rights reserved.
      </footer>
    </div>
  );
}

