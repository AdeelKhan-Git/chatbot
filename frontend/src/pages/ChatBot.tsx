
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Send, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png"

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your KU AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showBuffer, setShowBuffer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollTo(0, document.body.scrollHeight);
  };

  useEffect(() => {
    scrollToBottom()
  }, [messages]);


  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setShowBuffer(true);
    const currentPrompt = inputMessage;
    setInputMessage("");
    setIsBuffering(true);

    try {
      // Call the API
      setIsTyping(true)
      const response = await fetch('http://127.0.0.1:8000/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setIsBuffering(false);
      setIsTyping(true);

      // Simulate typing delay
      setTimeout(() => {
        setShowBuffer(false);
        const botResponse: Message = {
          id: messages.length + 2,
          text: data.response || "I apologize, but I couldn't process your request at the moment.",
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Error calling chat API:', error);
      setIsBuffering(false);
      setIsTyping(true);

      setTimeout(() => {
        const errorResponse: Message = {
          id: messages.length + 2,
          text: "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
      }, 500);
    } finally {
      setIsTyping(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen  flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                {/* <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link> */}
              </Button>
              <div className="flex justify-center items-center space-x-3">
                <img src={logo} className="w-[50px] h-full" />
                {/* <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                  <Bot className="h-6 w-6 text-white" />
                </div> */}
                <div>
                  <h1 className="text-xl font-bold">KU AI Assistant</h1>
                  <p className="text-sm text-gray-600">Online • Ready to help</p>
                </div>
              </div>
            </div>
            {/* <Button variant="outline" asChild>
              <Link to="/admin">Admin Panel</Link>
            </Button> */}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="container flex-1 mx-auto px-4 py-6 max-w-4xl">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <span>Chat Session</span>
              {isBuffering && (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing buffer...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4" ref={messagesEndRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {message.sender === 'bot' && (
                  <img src={logo} className="size-4" />
                )}

                <div
                  className={`max-w-[70%] p-3 rounded-lg ${message.sender === 'user'
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <div className="h-8 w-8 bg-gray-100">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <>
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 bg-blue-100">
                    <img src={logo} className="size-4" />
                  </div>

                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isBuffering || isTyping}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isBuffering || isTyping}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
