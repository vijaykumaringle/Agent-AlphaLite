// src/components/chat-agent-section.tsx
"use client";

import type { ChatMessage } from "@/lib/types";
import { runChatAgentFlow } from "@/lib/actions";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, User, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatAgentSectionProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

export function ChatAgentSection({ messages, setMessages, isProcessing, setIsProcessing }: ChatAgentSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    // Focus input when tab is active and not processing
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);


  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: "user",
      text: trimmedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const result = await runChatAgentFlow({ message: trimmedInput, history: messages });
      if ("error" in result) {
        toast({
          title: "Chat Error",
          description: result.error,
          variant: "destructive",
        });
        const agentErrorMessage: ChatMessage = {
          id: Date.now().toString() + '-agent-error',
          sender: "agent",
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentErrorMessage]);
      } else {
        const agentResponseMessage: ChatMessage = {
          id: Date.now().toString() + '-agent',
          sender: "agent",
          text: result.reply,
          timestamp: new Date(),
          // Optionally add structured data if the flow returns it
          // data: result.data 
        };
        setMessages((prev) => [...prev, agentResponseMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Chat Error",
        description: "Could not connect to the chat agent.",
        variant: "destructive",
      });
       const agentErrorMessage: ChatMessage = {
          id: Date.now().toString() + '-agent-error-catch',
          sender: "agent",
          text: "Sorry, I couldn't connect to the server. Please check your connection and try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentErrorMessage]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-260px)] bg-card shadow-lg rounded-lg border">
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end space-x-2 mb-4",
              message.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.sender === "agent" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><Brain size={18} /></AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "p-3 rounded-lg max-w-[70%]",
                message.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-muted-foreground rounded-bl-none"
              )}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
              <p className="text-xs opacity-70 mt-1 text-right">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
             {message.sender === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback><User size={18} /></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-end space-x-2 mb-4 justify-start">
            <Avatar className="h-8 w-8">
              <AvatarFallback><Brain size={18} className="animate-pulse" /></AvatarFallback>
            </Avatar>
            <div className="p-3 rounded-lg bg-muted text-muted-foreground rounded-bl-none">
              <p className="text-sm italic">Typing...</p>
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t flex items-center space-x-2 bg-background rounded-b-lg">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Button is wrapped in a span for Tooltip compatibility when disabled */}
              <span> 
                <Button variant="ghost" size="icon" className="text-muted-foreground" disabled>
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>File attachment coming soon!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !isProcessing && handleSendMessage()}
          disabled={isProcessing}
          className="flex-grow"
        />
        <Button onClick={handleSendMessage} disabled={isProcessing || !inputValue.trim()} size="icon">
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  );
}
