import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { messagesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ArrowLeft, MessageSquare, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  property_id: string | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; title: string; images: string[] } | null;
  participants: { user_id: string; profile: { full_name: string | null; avatar_url: string | null } }[];
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
  total_messages: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string | null; avatar_url: string | null } | null;
}

const POLL_MESSAGES_MS      = 3000;
const POLL_CONVERSATIONS_MS = 10000;
const MESSAGE_LIMIT         = 50;

const Messages = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const msgPollRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const convPollRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedConversationRef = useRef<string | null>(null);

  const [conversations,        setConversations]        = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages,             setMessages]             = useState<Message[]>([]);
  const [messageCount,         setMessageCount]         = useState(0);
  const [remaining,            setRemaining]            = useState(MESSAGE_LIMIT);
  const [newMessage,           setNewMessage]           = useState("");
  const [isLoadingConvs,       setIsLoadingConvs]       = useState(true);
  const [isLoadingMsgs,        setIsLoadingMsgs]        = useState(false);
  const [isSending,            setIsSending]            = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoadingConvs(true);
    try {
      const data = await messagesApi.getConversations();
      setConversations(data as Conversation[]);
    } catch {
      if (!silent) toast({ title: "Error", description: "Failed to load conversations", variant: "destructive" });
    } finally {
      if (!silent) setIsLoadingConvs(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      convPollRef.current = setInterval(() => fetchConversations(true), POLL_CONVERSATIONS_MS);
      return () => { if (convPollRef.current) clearInterval(convPollRef.current); };
    }
  }, [user, fetchConversations]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setIsLoadingMsgs(true);
    try {
      const data: any = await messagesApi.getMessages(conversationId);
      // Handle both old format (array) and new format ({ messages, total, remaining })
      if (Array.isArray(data)) {
        setMessages(data as Message[]);
        setMessageCount(data.length);
        setRemaining(Math.max(0, MESSAGE_LIMIT - data.length));
      } else {
        setMessages(data.messages as Message[]);
        setMessageCount(data.total);
        setRemaining(data.remaining);
      }
    } catch {
      if (!silent) toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    } finally {
      if (!silent) setIsLoadingMsgs(false);
    }
  }, [toast]);

  // ── Poll messages when conversation is selected ───────────────────────────
  useEffect(() => {
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    if (!selectedConversation) { setMessages([]); return; }

    selectedConversationRef.current = selectedConversation;
    fetchMessages(selectedConversation);
    messagesApi.markRead(selectedConversation).catch(() => {});

    msgPollRef.current = setInterval(() => {
      if (selectedConversationRef.current) {
        fetchMessages(selectedConversationRef.current, true);
      }
    }, POLL_MESSAGES_MS);

    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current); };
  }, [selectedConversation, fetchMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages]);

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    messagesApi.markRead(id).catch(() => {});
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: null,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const result: any = await messagesApi.sendMessage(selectedConversation, content);

      // Update counts from response
      if (result?.total !== undefined) {
        setMessageCount(result.total);
        setRemaining(result.remaining);
      }

      // Fetch fresh messages (replaces optimistic + catches auto-clear)
      await fetchMessages(selectedConversation, true);
      await fetchConversations(true);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(content);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return null;

  const selectedConv     = conversations.find(c => c.id === selectedConversation);
  const otherParticipant = selectedConv?.participants?.[0];
  const totalUnread      = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const usagePercent     = Math.round((messageCount / MESSAGE_LIMIT) * 100);
  const isNearLimit      = remaining <= 10 && remaining > 0;
  const isAtLimit        = remaining === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container-wide py-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>

            {/* ── Conversation List ── */}
            <Card className="lg:col-span-1 flex flex-col overflow-hidden">
              <CardHeader className="shrink-0 border-b pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Messages
                  </span>
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="text-xs">{totalUnread} unread</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {isLoadingConvs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : conversations.length > 0 ? (
                    <div className="divide-y">
                      {conversations.map(conv => {
                        const participant = conv.participants?.[0];
                        const isSelected  = conv.id === selectedConversation;

                        return (
                          <button
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv.id)}
                            className={`w-full p-4 text-left transition-colors hover:bg-muted/70 ${isSelected ? "bg-muted" : ""}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={participant?.profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {participant?.profile?.full_name?.[0]?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                {conv.unread_count > 0 && (
                                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full border-2 border-background" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`truncate text-sm ${conv.unread_count > 0 ? "font-semibold" : "font-medium"}`}>
                                    {participant?.profile?.full_name || "User"}
                                  </p>
                                  {conv.last_message && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                                    </span>
                                  )}
                                </div>
                                {conv.property && (
                                  <p className="text-xs text-primary truncate mt-0.5">Re: {conv.property.title}</p>
                                )}
                                {conv.last_message ? (
                                  <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                    {conv.last_message.sender_id === user.id ? "You: " : ""}
                                    {conv.last_message.content}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">No messages yet</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                      <p className="font-medium text-sm">No conversations yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Open a property and click "Message Owner" to start one.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* ── Chat Area ── */}
            <Card className="lg:col-span-2 flex flex-col overflow-hidden">
              {selectedConversation && selectedConv ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="shrink-0 border-b py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={otherParticipant?.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {otherParticipant?.profile?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {otherParticipant?.profile?.full_name || "User"}
                          </p>
                          {selectedConv.property && (
                            <p className="text-xs text-muted-foreground truncate">
                              Re: {selectedConv.property.title}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Message counter */}
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground mb-1">
                          {messageCount}/{MESSAGE_LIMIT} messages
                        </p>
                        <div className="w-24">
                          <Progress
                            value={usagePercent}
                            className={`h-1.5 ${
                              isAtLimit ? "[&>div]:bg-destructive" :
                              isNearLimit ? "[&>div]:bg-warning" :
                              "[&>div]:bg-primary"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warning banners */}
                    {isNearLimit && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>{remaining} message{remaining !== 1 ? "s" : ""} remaining</strong> — this conversation will automatically clear at {MESSAGE_LIMIT} messages.
                        </span>
                      </div>
                    )}
                    {isAtLimit && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>Limit reached.</strong> Sending a new message will clear this conversation and start fresh.
                        </span>
                      </div>
                    )}
                  </CardHeader>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {isLoadingMsgs ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-12">
                        <p className="text-muted-foreground text-sm">No messages yet. Send the first one!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg, i) => {
                          const isOwn    = msg.sender_id === user.id;
                          const isSystem = msg.sender_id === null;
                          const isTemp   = msg.id.startsWith("temp-");

                          // Group by time — only show timestamp if 5+ min gap
                          const showTime = i === 0 ||
                            new Date(msg.created_at).getTime() -
                            new Date(messages[i - 1].created_at).getTime() > 5 * 60 * 1000;

                          // System message (auto-clear notice)
                          if (isSystem) {
                            return (
                              <div key={msg.id} className="text-center my-4">
                                <span className="text-xs text-muted-foreground bg-muted/80 border px-4 py-1.5 rounded-full inline-block">
                                  {msg.content}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div key={msg.id}>
                              {showTime && (
                                <div className="text-center my-3">
                                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                {!isOwn && (
                                  <Avatar className="h-7 w-7 mr-2 shrink-0 self-end">
                                    <AvatarImage src={msg.sender?.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {msg.sender?.full_name?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                  isOwn
                                    ? `bg-primary text-primary-foreground ${isTemp ? "opacity-60" : ""}`
                                    : "bg-muted"
                                }`}>
                                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                  {isTemp && (
                                    <p className="text-xs mt-1 opacity-60">Sending...</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <div className="shrink-0 border-t p-4">
                    <form onSubmit={sendMessage} className="flex gap-2 items-center">
                      <Input
                        placeholder={
                          isAtLimit
                            ? "Send to clear conversation and start fresh..."
                            : "Type a message... (Enter to send)"
                        }
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                        className="flex-1"
                        autoComplete="off"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isSending || !newMessage.trim()}
                        className="shrink-0"
                      >
                        {isSending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />
                        }
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </Card>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
