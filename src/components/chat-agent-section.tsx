
// src/components/chat-agent-section.tsx
"use client";

import type { ChatMessage } from "@/lib/types";
import { runChatAgentFlow } from "@/lib/actions";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, User, Brain, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ChatAgentSectionProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

interface AttachedFileInfo {
  id: string; 
  name: string;
  type: string;
  content?: string; 
  dataUri?: string; 
}

const SUPPORTED_FILE_TYPES = [
  'text/plain', 
  'text/csv', 
  'text/markdown',
  'image/png',
  'image/jpeg',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];
const SUPPORTED_FILE_EXTENSIONS = '.png,.jpg,.jpeg,.xls,.xlsx,.txt,.csv,.md';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_COUNT = 5;

export function ChatAgentSection({ messages, setMessages, isProcessing, setIsProcessing }: ChatAgentSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [attachedFilesInfo, setAttachedFilesInfo] = useState<AttachedFileInfo[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (attachedFilesInfo.length + files.length > MAX_FILES_COUNT) {
        toast({
            title: "Too many files",
            description: `You can attach a maximum of ${MAX_FILES_COUNT} files.`,
            variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear selection
        return;
    }
    
    const newFilesInfo: AttachedFileInfo[] = [];
    let unsupportedFiles = false;
    let oversizedFiles = false;

    for (const file of Array.from(files)) {
        if (attachedFilesInfo.find(f => f.name === file.name && f.id.startsWith(file.lastModified.toString()))) {
            toast({ title: "File Already Added", description: `"${file.name}" is already attached.`, variant: "default" });
            continue;
        }

        if (!SUPPORTED_FILE_TYPES.includes(file.type) && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.csv') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
            unsupportedFiles = true;
            continue;
        }
        if (file.size > MAX_FILE_SIZE) {
            oversizedFiles = true;
            continue;
        }

        const fileId = `${file.lastModified}-${file.name}-${Math.random().toString(36).substring(2,9)}`;
        const fInfo: AttachedFileInfo = { id: fileId, name: file.name, type: file.type };

        if (file.type.startsWith('image/')) {
            fInfo.dataUri = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        } else { // For text, csv, md, and attempt for Excel
            fInfo.content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsText(file);
            });
        }
        newFilesInfo.push(fInfo);
    }
    
    setAttachedFilesInfo(prev => [...prev, ...newFilesInfo]);

    if (unsupportedFiles) {
        toast({ title: "Unsupported File Type", description: `Some files were not attached. Supported types: ${SUPPORTED_FILE_EXTENSIONS}`, variant: "destructive" });
    }
    if (oversizedFiles) {
        toast({ title: "File Too Large", description: `Some files exceed the ${MAX_FILE_SIZE / (1024*1024)}MB size limit.`, variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = ""; // Clear selection
  };

  const removeAttachedFile = (fileIdToRemove: string) => {
    setAttachedFilesInfo(prev => prev.filter(f => f.id !== fileIdToRemove));
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && attachedFilesInfo.length === 0) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: "user",
      text: trimmedInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsProcessing(true);

    const filesPayload = attachedFilesInfo.map(fInfo => ({
      fileName: fInfo.name,
      fileContent: fInfo.content,
      fileDataUri: fInfo.dataUri,
    }));

    try {
      const result = await runChatAgentFlow({ 
        message: trimmedInput, 
        history: messages,
        files: filesPayload.length > 0 ? filesPayload : undefined,
      });

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
      setAttachedFilesInfo([]); 
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
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
      <div className="p-4 border-t bg-background rounded-b-lg">
        {attachedFilesInfo.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFilesInfo.map((file) => (
              <Badge key={file.id} variant="secondary" className="py-1 px-2 text-xs group relative">
                {file.name} ({file.type}, {(file.dataUri ? (file.dataUri.length * 0.75 / 1024).toFixed(1) : (file.content ? (file.content.length / 1024).toFixed(1) : 0) )} KB)
                <button
                  onClick={() => removeAttachedFile(file.id)}
                  className="ml-1.5 p-0.5 rounded-full hover:bg-destructive/20 text-destructive group-hover:text-destructive-foreground group-hover:bg-destructive"
                  aria-label={`Remove ${file.name}`}
                >
                  <XCircle size={14} />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleFileAttach} disabled={isProcessing || attachedFilesInfo.length >= MAX_FILES_COUNT}> 
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file(s)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{attachedFilesInfo.length >= MAX_FILES_COUNT ? `Max ${MAX_FILES_COUNT} files allowed` : `Attach files (${SUPPORTED_FILE_EXTENSIONS})`}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            accept={SUPPORTED_FILE_EXTENSIONS}
            multiple
            disabled={isProcessing || attachedFilesInfo.length >= MAX_FILES_COUNT}
          />
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
          <Button onClick={handleSendMessage} disabled={isProcessing || (!inputValue.trim() && attachedFilesInfo.length === 0)} size="icon">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

