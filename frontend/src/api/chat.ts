import { apiClient } from "./axios";

export const chatMessage = async (message: string) => {
  try {
    const response = await apiClient.post("api/chat/", {
      prompt: message,
    });
    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    throw error;
  }
};
