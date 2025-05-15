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

export function ChatAgentSection({ messages, setMessages, isProcessing, setIsProcessing }: ChatAgentSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null); // For text-based files
  const [attachedFileDataUri, setAttachedFileDataUri] = useState<string | null>(null); // For image files
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `Please select a file smaller than ${MAX_FILE_SIZE / (1024*1024)}MB.`,
          variant: "destructive",
        });
        return;
      }
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
         toast({
          title: "Unsupported file type",
          description: `Please select a supported file type (${SUPPORTED_FILE_EXTENSIONS}). Received: ${file.type || 'unknown'}`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedFile(file);
        if (file.type.startsWith('image/')) {
          setAttachedFileDataUri(e.target?.result as string);
          setAttachedFileContent(null);
        } else {
          setAttachedFileContent(e.target?.result as string);
          setAttachedFileDataUri(null);
        }
        toast({
          title: "File attached",
          description: `${file.name} is ready to be sent with your message.`,
        });
      };
      reader.onerror = () => {
        toast({
          title: "Error reading file",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
        setAttachedFile(null);
        setAttachedFileContent(null);
        setAttachedFileDataUri(null);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
    // Reset file input value to allow selecting the same file again
    if(event.target) {
      event.target.value = "";
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setAttachedFileContent(null);
    setAttachedFileDataUri(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
     toast({
      title: "File removed",
      description: "The attachment has been cleared.",
    });
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && !attachedFile) return;

    const userMessageText = attachedFile 
      ? `${trimmedInput} (Attachment: ${attachedFile.name})` 
      : trimmedInput;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: "user",
      text: userMessageText || `Sent attachment: ${attachedFile?.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsProcessing(true);

    const filePayload: { fileName?: string; fileContent?: string; fileDataUri?: string } = {};
    if (attachedFile) {
      filePayload.fileName = attachedFile.name;
      if (attachedFileDataUri) {
        filePayload.fileDataUri = attachedFileDataUri;
      } else if (attachedFileContent) {
        filePayload.fileContent = attachedFileContent;
      }
    }

    try {
      const result = await runChatAgentFlow({ 
        message: trimmedInput, 
        history: messages,
        ...filePayload
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
      removeAttachedFile(); // Clear file after sending
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
        {attachedFile && (
          <div className="mb-2 flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
            <span className="truncate">Attached: <Badge variant="secondary">{attachedFile.name}</Badge></span>
            <Button variant="ghost" size="icon" onClick={removeAttachedFile} className="h-6 w-6 text-muted-foreground hover:text-destructive">
              <XCircle size={16} />
              <span className="sr-only">Remove attachment</span>
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleFileAttach} disabled={isProcessing}>
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach a file ({SUPPORTED_FILE_EXTENSIONS})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept={SUPPORTED_FILE_EXTENSIONS}
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
          <Button onClick={handleSendMessage} disabled={isProcessing || (!inputValue.trim() && !attachedFile)} size="icon">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
