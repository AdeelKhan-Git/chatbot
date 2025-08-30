import { chatMessage } from '@/api/chat';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'user',
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const botMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: botMessageId, text: '', sender: 'bot', isStreaming: true },
      ]);

      try {
        const response = await chatMessage(message.trim());

        // Handle streaming response
        if (response.data && response.data.response) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, text: response.data.response, isStreaming: false }
                : msg
            )
          );
        } else {
          // Fallback for non-streaming response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    text: "I'm here to help! How can I assist you today?",
                    isStreaming: false,
                  }
                : msg
            )
          );
        }
      } catch (error: any) {
        console.error('Chat error:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text:
                    error.response?.data?.error ||
                    'Sorry, there was an error. Please try again.',
                  isStreaming: false,
                }
              : msg
          )
        );
        toast.error('Failed to send message. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
};
