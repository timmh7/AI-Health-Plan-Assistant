import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/AuthGuard';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chat = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your OwnCare assistant. I can help you understand your insurance plan, find providers, check coverage, and answer questions about your benefits. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Call semantic search API to find relevant document chunks
      const searchResponse = await fetch('http://localhost:3001/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentQuery,
          topK: 3 // Get top 3 most relevant chunks
        }),
      });

      const searchResults = await searchResponse.json();
      let botResponseContent = '';

      if (searchResults.chunks && searchResults.chunks.length > 0) {
        botResponseContent = `Based on your insurance plan documents, here's what I found:\n\n`;

        searchResults.chunks.forEach((result: any, index: number) => {
          botResponseContent += `**Relevant Information ${index + 1}**:\n${result.content}\n\n`;
        });

        botResponseContent += `\nThis information comes from your insurance plan documents. Is there anything specific you'd like me to clarify about these details?`;
      } else {
        botResponseContent = `I couldn't find specific information about your query in your insurance plan documents.`;
      }


      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponseContent,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error calling semantic search:', error);
      
      // Error fallback response
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble accessing your plan information right now. Please try again in a moment, or contact your insurance company directly for immediate assistance.",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "What's covered under my plan?",
    "How do I find in-network providers?",
    "What's my copay for specialist visits?",
    "How do I file a claim?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-[var(--shadow-healthcare)]">
                <span className="text-sm font-bold text-primary-foreground">OC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">OwnCare Assistant</h1>
                <p className="text-sm text-muted-foreground">Your healthcare plan advisor</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
          {/* Messages */}
          <Card className="flex-1 shadow-[var(--shadow-card)] border-0 bg-gradient-to-br from-card to-card/50 mb-4">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 space-y-2 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground ml-4'
                          : 'bg-secondary text-secondary-foreground mr-4'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {message.sender === 'bot' ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {message.sender === 'bot' ? 'OwnCare Assistant' : 'You'}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content.split('\n').map((line, index) => {
                          // Handle bold text formatting
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return (
                              <div key={index} className="font-semibold mt-2 mb-1">
                                {line.replace(/\*\*/g, '')}
                              </div>
                            );
                          }
                          // Handle bullet points
                          if (line.startsWith('•')) {
                            return (
                              <div key={index} className="ml-4 mb-1">
                                {line}
                              </div>
                            );
                          }
                          // Regular lines
                          return line ? (
                            <div key={index} className="mb-1">
                              {line}
                            </div>
                          ) : (
                            <div key={index} className="mb-2"></div>
                          );
                        })}
                      </div>
                      <p className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-secondary text-secondary-foreground rounded-lg p-4 mr-4">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4" />
                        <span className="text-sm font-medium">OwnCare Assistant</span>
                      </div>
                      <div className="flex space-x-1 mt-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length === 1 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-3">Quick questions to get started:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickQuestion(question)}
                        className="text-left justify-start h-auto p-3 text-sm"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your healthcare plan..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  variant="healthcare"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Chat;