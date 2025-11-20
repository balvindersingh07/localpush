import { useState } from 'react';
import { Send, Bot, User, Shield, MapPin, IndianRupee, Calendar, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface ChatbotInterfaceProps {
  onNavigateToEvent: (eventId: string) => void;
}

type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  results?: Array<{ id: string; title: string; date: string; price: number; location: string }>;
};

const quickActions = [
  { icon: Search, label: 'Find Events', query: 'Find events near me' },
  { icon: MapPin, label: 'Events in my city', query: 'Show me events in Delhi' },
  { icon: IndianRupee, label: 'Budget friendly', query: 'Events under ₹5000' },
  { icon: Calendar, label: 'This weekend', query: 'Events this weekend' },
];

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'bot',
    content: 'Hi! 👋 I\'m your LocalPush assistant. I can help you find the perfect events and stalls, answer questions about bookings, payments, and more. How can I help you today?',
    timestamp: new Date(),
    suggestions: ['Find events near me', 'How does payment work?', 'What is the cancellation policy?'],
  },
];

export function ChatbotInterface({ onNavigateToEvent }: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');

  const handleSend = (query?: string) => {
    const messageText = query || input;
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse: Message;

      if (messageText.toLowerCase().includes('payment') || messageText.toLowerCase().includes('pay')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'We accept UPI, credit/debit cards, and net banking. All payments are processed securely through LocalPush. You\'ll receive instant confirmation once payment is successful.',
          timestamp: new Date(),
          suggestions: ['How do refunds work?', 'Is my payment secure?'],
        };
      } else if (messageText.toLowerCase().includes('cancel') || messageText.toLowerCase().includes('refund')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'Full refund if cancelled 14+ days before the event. 50% refund for 7-14 days. No refund within 7 days of the event start date. Refunds are processed within 5-7 business days.',
          timestamp: new Date(),
          suggestions: ['Contact support', 'Find events'],
        };
      } else if (messageText.toLowerCase().includes('kyc')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'KYC verification is required for all creators and organizers. Please upload a government ID and a recent photo. Verification typically takes 24-48 hours.',
          timestamp: new Date(),
          suggestions: ['Upload KYC documents', 'Track KYC status'],
        };
      } else if (messageText.toLowerCase().includes('find') || messageText.toLowerCase().includes('events') || messageText.toLowerCase().includes('delhi') || messageText.toLowerCase().includes('ludhiana')) {
        const city = messageText.toLowerCase().includes('ludhiana') ? 'Ludhiana' : 'Delhi';
        botResponse = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: `I found some great events for you in ${city}! Here are my top recommendations:`,
          timestamp: new Date(),
          results: [
            {
              id: '1',
              title: 'Delhi Handmade Crafts Fair',
              date: 'Nov 15-17, 2025',
              price: 5000,
              location: 'Pragati Maidan, Delhi',
            },
            {
              id: '2',
              title: 'Ludhiana Beauty & Makeup Expo',
              date: 'Nov 22-23, 2025',
              price: 3500,
              location: 'Ludhiana Exhibition Centre',
            },
          ],
          suggestions: ['Show more events', 'Filter by price', 'Filter by date'],
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: 'I can help you with finding events, understanding our payment process, cancellation policies, and more. What would you like to know?',
          timestamp: new Date(),
          suggestions: ['Find events near me', 'Payment help', 'Cancellation policy', 'Contact support'],
        };
      }

      setMessages((prev) => [...prev, botResponse]);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-neutral-900">LocalPush Assistant</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span className="text-neutral-600 text-sm">Online</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-neutral-600 text-sm mb-3">Quick actions:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => handleSend(action.query)}
              >
                <action.icon size={20} className="text-primary" />
                <span className="text-sm text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Safety Banner */}
      <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary shrink-0" />
          <p className="text-neutral-700 text-sm">
            Pay only within LocalPush. Off-platform payments are risky.
          </p>
        </div>
      </Card>

      {/* Messages */}
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4 pr-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'bot' 
                  ? 'bg-gradient-to-br from-secondary to-accent' 
                  : 'bg-gradient-to-br from-primary to-secondary'
              }`}>
                {message.role === 'bot' ? (
                  <Bot className="text-white" size={16} />
                ) : (
                  <User className="text-white" size={16} />
                )}
              </div>
              <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                <Card className={`p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-neutral-50'
                }`}>
                  <p className={message.role === 'user' ? 'text-white' : 'text-neutral-900'}>
                    {message.content}
                  </p>
                </Card>

                {/* Event Results */}
                {message.results && (
                  <div className="mt-3 space-y-3 w-full">
                    {message.results.map((result) => (
                      <Card
                        key={result.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onNavigateToEvent(result.id)}
                      >
                        <h4 className="text-neutral-900 mb-2">{result.title}</h4>
                        <div className="space-y-1 text-sm text-neutral-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{result.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{result.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={14} />
                            <span className="text-primary">From ₹{result.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button size="sm" className="mt-3 w-full">View Details</Button>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.suggestions.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        onClick={() => handleSend(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-neutral-500 text-xs mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
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
  );
}
