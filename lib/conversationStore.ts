import { Conversation, Message, AgentPersonality } from '@/types';
import { v4 as uuidv4 } from 'uuid';

class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();

  createConversation(userLanguage: string, targetLanguage: string, userGender: 'male' | 'female'): Conversation {
    const id = uuidv4();
    const conversation: Conversation = {
      id,
      messages: [],
      userLanguage: userLanguage as any,
      targetLanguage: targetLanguage as any,
      agentGender: userGender === 'male' ? 'female' : 'male',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();
    return newMessage;
  }

  getConversationHistory(conversationId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    return conversation?.messages || [];
  }

  updateConversation(conversationId: string, updates: Partial<Conversation>): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    Object.assign(conversation, updates);
    conversation.updatedAt = new Date();
  }
}

export const conversationStore = new ConversationStore();


