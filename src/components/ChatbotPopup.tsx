import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface ChatbotPopupProps {
  userRole: 'creator' | 'organizer' | 'admin';
  isAuthenticated: boolean;
  onShowAuth: () => void;
}

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
};

export function ChatbotPopup({ userRole, isAuthenticated, onShowAuth }: ChatbotPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const getInitialMessage = () => {
    if (!isAuthenticated) {
      return {
        id: '1',
        role: 'bot' as const,
        content: `Hi! 👋 I'm LocalPush Assistant. I can help you learn about our platform, find events, and answer questions. How can I help you today?`,
        timestamp: new Date(),
        suggestions: ['What is LocalPush?', 'Find events near me', 'How to get started?'],
      };
    }
    return {
      id: '1',
      role: 'bot' as const,
      content: `Hi! 👋 I'm your LocalPush ${userRole === 'creator' ? 'Creator' : 'Organizer'} assistant. How can I help you today?`,
      timestamp: new Date(),
      suggestions: userRole === 'creator' 
        ? ['Find events near me', 'How to book a stall?', 'Payment help']
        : ['Create an event', 'Manage bookings', 'Analytics help'],
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSend = (query?: string) => {
    const messageText = query || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    setTimeout(() => {
      let botResponse: Message;

      // General responses for non-authenticated users
      if (!isAuthenticated) {
        if (messageText.toLowerCase().includes('what') && messageText.toLowerCase().includes('LocalPush')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'LocalPush is a marketplace connecting local creators (artists, makers, vendors) with exhibitions and events across India. Creators can discover events and book stalls, while organizers can list their events and manage bookings!',
            timestamp: new Date(),
            suggestions: ['Sign up as Creator', 'Sign up as Organizer', 'Find events'],
          };
        } else if (messageText.toLowerCase().includes('event') || messageText.toLowerCase().includes('find')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'You can browse events right now! Search by city, category, or date. To book a stall, you\'ll need to create a free account first.',
            timestamp: new Date(),
            suggestions: ['Browse events', 'Create account', 'How it works'],
          };
        } else if (messageText.toLowerCase().includes('start') || messageText.toLowerCase().includes('signup') || messageText.toLowerCase().includes('sign up') || messageText.toLowerCase().includes('account')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'Getting started is easy! Click "Sign Up" and choose your role: Creator (for artists/vendors) or Organizer (for event hosts). It\'s completely free!',
            timestamp: new Date(),
            suggestions: ['Sign up now', 'Learn more', 'See pricing'],
          };
        } else if (messageText.toLowerCase().includes('how') && (messageText.toLowerCase().includes('work') || messageText.toLowerCase().includes('it'))) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'For Creators: Browse events → Book a stall → Pay securely → Get confirmed! For Organizers: Create event → Set stall tiers → Get bookings → Manage everything from your dashboard.',
            timestamp: new Date(),
            suggestions: ['Creator guide', 'Organizer guide', 'Sign up'],
          };
        } else {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'I can help you learn about LocalPush, browse events, or get started. What would you like to know?',
            timestamp: new Date(),
            suggestions: ['What is Localpush?', 'Browse events', 'Create account'],
          };
        }
      } else if (userRole === 'creator') {
        if (messageText.toLowerCase().includes('event') || messageText.toLowerCase().includes('find')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'I can help you find events! You can search by city, category, price range, or dates. Would you like to see events in your area?',
            timestamp: new Date(),
            suggestions: ['Show events in Delhi', 'Events under ₹5000', 'Events this month'],
          };
        } else if (messageText.toLowerCase().includes('book') || messageText.toLowerCase().includes('stall')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'Booking a stall is easy! Find an event, select your preferred stall tier (Basic, Premium, or VIP), and complete the payment. You\'ll get instant confirmation with a QR code.',
            timestamp: new Date(),
            suggestions: ['Show me how', 'Browse events', 'Payment methods'],
          };
        } else if (messageText.toLowerCase().includes('payment') || messageText.toLowerCase().includes('pay')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'We accept UPI, credit/debit cards, and net banking. All payments are 100% secure and protected by LocalPush. Never pay outside the platform!',
            timestamp: new Date(),
            suggestions: ['Refund policy', 'Payment issues', 'Get help'],
          };
        } else {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'I\'m here to help with finding events, booking stalls, payments, and more. What would you like to know?',
            timestamp: new Date(),
            suggestions: ['Find events', 'My bookings', 'Contact support'],
          };
        }
      } else {
        // Organizer responses
        if (messageText.toLowerCase().includes('create') || messageText.toLowerCase().includes('event')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'To create an event, go to your dashboard and click "Create Event". Fill in the details like name, dates, location, and stall tiers. Your event will be reviewed within 24 hours!',
            timestamp: new Date(),
            suggestions: ['Create event now', 'Event guidelines', 'Pricing tips'],
          };
        } else if (messageText.toLowerCase().includes('booking') || messageText.toLowerCase().includes('manage')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'You can manage all bookings from your dashboard. View confirmed bookings, send broadcast messages to creators, and track stall availability in real-time.',
            timestamp: new Date(),
            suggestions: ['View bookings', 'Send message', 'Export data'],
          };
        } else if (messageText.toLowerCase().includes('analytics') || messageText.toLowerCase().includes('stats')) {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'Your dashboard shows revenue trends, booking rates, event views, and fill rates. Use these insights to optimize pricing and attract more creators!',
            timestamp: new Date(),
            suggestions: ['View analytics', 'Best practices', 'Marketing tips'],
          };
        } else {
          botResponse = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            content: 'I can help you with creating events, managing bookings, analytics, and more. What would you like assistance with?',
            timestamp: new Date(),
            suggestions: ['Create event', 'Manage bookings', 'View analytics'],
          };
        }
      }

      setMessages((prev) => [...prev, botResponse]);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    }, 800);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating Button - Always Visible */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-[100]">
          <Button
            size="lg"
            className="rounded-full w-16 h-16 shadow-2xl hover:shadow-xl transition-all hover:scale-110 relative bg-gradient-to-br from-primary to-secondary animate-pulse hover:animate-none"
            onClick={handleOpen}
            title="Chat with LocalPush Assistant"
          >
            <MessageCircle size={24} className="text-white" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-error h-6 w-6 p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-[100] w-[380px] h-[550px] shadow-2xl flex flex-col rounded-2xl overflow-hidden border-2 border-primary/20">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                <MessageCircle className="text-primary" size={20} />
              </div>
              <div>
                <h4 className="text-white">LocalPush Assistant</h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-white/90 text-xs">Always here to help</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-secondary to-accent">
                    <MessageCircle className="text-white" size={14} />
                  </div>
                  <div className={`flex-1 ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <Card
                      className={`p-3 ${
                        message.role === 'user' ? 'bg-primary text-white' : 'bg-neutral-50'
                      }`}
                    >
                      <p className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-neutral-900'}`}>
                        {message.content}
                      </p>
                    </Card>

                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-white transition-colors text-xs"
                            onClick={() => handleSend(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-neutral-500 text-xs mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim()}>
                <Send size={18} />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
