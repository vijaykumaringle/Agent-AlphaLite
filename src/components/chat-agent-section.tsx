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
  id: string; // Unique ID for key prop and removal
  name: string;
  type: string;
  content?: string; // For text-based files
  dataUri?: string; // For image files
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFilesToProcess = Array.from(files);
      let successfulUploads = 0;

      newFilesToProcess.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than ${MAX_FILE_SIZE / (1024*1024)}MB.`,
            variant: "destructive",
          });
          return; // Skip this file
        }
        if (!SUPPORTED_FILE_TYPES.includes(file.type) && !SUPPORTED_FILE_EXTENSIONS.split(',').some(ext => file.name.endsWith(ext))) {
           toast({
            title: "Unsupported file type",
            description: `${file.name} has an unsupported type (${file.type || 'unknown'}). Supported: ${SUPPORTED_FILE_EXTENSIONS}`,
            variant: "destructive",
          });
          return; // Skip this file
        }

        const reader = new FileReader();
        const fileId = `${file.name}-${Date.now()}`;

        reader.onload = (e) => {
          const newFileInfoBase: Pick<AttachedFileInfo, 'id' | 'name' | 'type'> = {
            id: fileId,
            name: file.name,
            type: file.type,
          };

          let newFileInfo: AttachedFileInfo;
          if (file.type.startsWith('image/')) {
            newFileInfo = { ...newFileInfoBase, dataUri: e.target?.result as string };
          } else {
            newFileInfo = { ...newFileInfoBase, content: e.target?.result as string };
          }
          
          setAttachedFilesInfo(prev => [...prev, newFileInfo]);
          successfulUploads++;
          if (successfulUploads === newFilesToProcess.length) {
             toast({
              title: `${successfulUploads} File(s) attached`,
              description: `Ready to be sent with your message.`,
            });
          } else if (newFilesToProcess.length > 1 && successfulUploads > 0 && newFilesToProcess.every((_,i) => i < successfulUploads || newFilesToProcess[i].size > MAX_FILE_SIZE || !SUPPORTED_FILE_TYPES.includes(newFilesToProcess[i].type) )) {
             // This case might be too complex, a simpler toast might be better.
             // For now, individual errors are shown. If all processed, a summary toast.
          }
        };
        reader.onerror = () => {
          toast({
            title: "Error reading file",
            description: `Could not read ${file.name}.`,
            variant: "destructive",
          });
        };

        if (file.type.startsWith('image/')) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    }
    // Reset file input value to allow selecting the same file(s) again
    if(event.target) {
      event.target.value = "";
    }
  };

  const removeAttachedFile = (fileIdToRemove: string) => {
    const removedFile = attachedFilesInfo.find(f => f.id === fileIdToRemove);
    setAttachedFilesInfo(prev => prev.filter(f => f.id !== fileIdToRemove));
    if (fileInputRef.current) {
      // This doesn't easily clear specific files if input still "holds" them,
      // but user can re-select if needed. The primary effect is removing from our state.
    }
     toast({
      title: "File removed",
      description: `${removedFile?.name || 'Attachment'} has been cleared.`,
    });
  };

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput && attachedFilesInfo.length === 0) return;

    let userMessageText = trimmedInput;
    if (attachedFilesInfo.length > 0) {
      const fileNames = attachedFilesInfo.map(f => f.name).join(', ');
      userMessageText = `${trimmedInput} (Attached: ${fileNames})`;
    }
    

    const newUserMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: "user",
      text: userMessageText || `Sent attachments: ${attachedFilesInfo.map(f => f.name).join(', ')}`,
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
        files: filesPayload,
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
      setAttachedFilesInfo([]); // Clear all files after sending
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
          <div className="mb-2 space-y-1">
            {attachedFilesInfo.map((fileInfo) => (
              <div key={fileInfo.id} className="flex items-center justify-between p-1.5 bg-muted/50 rounded-md text-sm">
                <Badge variant="secondary" className="truncate max-w-[calc(100%-3rem)]">{fileInfo.name}</Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeAttachedFile(fileInfo.id)} 
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${fileInfo.name}`}
                  disabled={isProcessing}
                >
                  <XCircle size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleFileAttach} disabled={isProcessing}>
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file(s)</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach file(s) ({SUPPORTED_FILE_EXTENSIONS})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept={SUPPORTED_FILE_EXTENSIONS}
            multiple // Allow multiple file selection
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
