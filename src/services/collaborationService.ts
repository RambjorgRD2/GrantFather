/**
 * Real-time Collaboration Service
 * Handles real-time collaboration features for grant applications
 */

import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GrantSection, GrantApplication } from '@/types/grantApplication';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  lastSeen: string;
  isOnline: boolean;
}

export interface CollaborationEvent {
  id: string;
  type: 'cursor' | 'selection' | 'edit' | 'presence' | 'comment';
  userId: string;
  applicationId: string;
  section?: string;
  data: any;
  timestamp: string;
}

export interface CursorPosition {
  section: string;
  offset: number;
  length: number;
}

export interface Selection {
  section: string;
  start: number;
  end: number;
  text: string;
}

export interface Comment {
  id: string;
  applicationId: string;
  section: string;
  userId: string;
  userName: string;
  content: string;
  position: {
    start: number;
    end: number;
  };
  createdAt: string;
  resolved: boolean;
  replies?: Comment[];
}

export class CollaborationService {
  private static instance: CollaborationService;
  private channel: any = null;
  private presenceChannel: any = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private currentUser: CollaborationUser | null = null;
  private isConnected = false;

  public static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  /**
   * Initialize collaboration for an application
   */
  public async initialize(applicationId: string, user: CollaborationUser): Promise<void> {
    this.currentUser = user;
    
    // Create real-time channel for the application
    this.channel = supabase.channel(`application:${applicationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Create presence channel for user awareness
    this.presenceChannel = supabase.channel(`presence:${applicationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Set up event listeners
    this.setupEventListeners();

    // Subscribe to channels
    await this.channel.subscribe();
    await this.presenceChannel.subscribe();

    // Track user presence
    await this.trackPresence();

    this.isConnected = true;
  }

  /**
   * Disconnect from collaboration
   */
  public async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    if (this.presenceChannel) {
      await this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    this.isConnected = false;
    this.eventHandlers.clear();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.channel) return;

    // Listen for cursor movements
    this.channel.on('broadcast', { event: 'cursor' }, (payload: any) => {
      this.emit('cursor', payload);
    });

    // Listen for text selections
    this.channel.on('broadcast', { event: 'selection' }, (payload: any) => {
      this.emit('selection', payload);
    });

    // Listen for edits
    this.channel.on('broadcast', { event: 'edit' }, (payload: any) => {
      this.emit('edit', payload);
    });

    // Listen for comments
    this.channel.on('broadcast', { event: 'comment' }, (payload: any) => {
      this.emit('comment', payload);
    });

    // Listen for presence changes
    this.presenceChannel.on('presence', { event: 'sync' }, () => {
      const presence = this.presenceChannel.presenceState();
      this.emit('presence', presence);
    });
  }

  /**
   * Track user presence
   */
  private async trackPresence(): Promise<void> {
    if (!this.presenceChannel || !this.currentUser) return;

    await this.presenceChannel.track({
      id: this.currentUser.id,
      name: this.currentUser.name,
      email: this.currentUser.email,
      avatar_url: this.currentUser.avatar_url,
      role: this.currentUser.role,
      lastSeen: new Date().toISOString(),
      isOnline: true,
    });
  }

  /**
   * Send cursor position
   */
  public sendCursorPosition(position: CursorPosition): void {
    if (!this.channel || !this.currentUser) return;

    this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        position,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send text selection
   */
  public sendSelection(selection: Selection): void {
    if (!this.channel || !this.currentUser) return;

    this.channel.send({
      type: 'broadcast',
      event: 'selection',
      payload: {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        selection,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send edit event
   */
  public sendEdit(section: string, content: string, operation: 'insert' | 'delete' | 'replace'): void {
    if (!this.channel || !this.currentUser) return;

    this.channel.send({
      type: 'broadcast',
      event: 'edit',
      payload: {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        section,
        content,
        operation,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Add a comment
   */
  public async addComment(comment: Omit<Comment, 'id' | 'createdAt' | 'resolved'>): Promise<Comment> {
    // For now, return a mock comment since the table doesn't exist yet
    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      applicationId: comment.applicationId,
      section: comment.section,
      userId: comment.userId,
      userName: this.currentUser?.name || 'Unknown',
      content: comment.content,
      position: comment.position,
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    // Broadcast comment to other users
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'comment',
        payload: newComment,
      });
    }

    return newComment;
  }

  /**
   * Get comments for an application
   */
  public async getComments(applicationId: string): Promise<Comment[]> {
    // Return empty array for now since the table doesn't exist yet
    return [];
  }

  /**
   * Resolve a comment
   */
  public async resolveComment(commentId: string): Promise<void> {
    // Mock implementation for now
    console.log(`Comment ${commentId} resolved`);
  }

  /**
   * Event handling
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Get online users
   */
  public getOnlineUsers(): CollaborationUser[] {
    if (!this.presenceChannel) return [];

    const presence = this.presenceChannel.presenceState();
    return Object.values(presence).flat().map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      lastSeen: user.lastSeen,
      isOnline: true,
    }));
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    const onlineUsers = this.getOnlineUsers();
    return onlineUsers.some(user => user.id === userId);
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const collaborationService = CollaborationService.getInstance();

// React hook for collaboration
export function useCollaboration(applicationId: string, user: CollaborationUser) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [onlineUsers, setOnlineUsers] = React.useState<CollaborationUser[]>([]);
  const [comments, setComments] = React.useState<Comment[]>([]);

  React.useEffect(() => {
    const initializeCollaboration = async () => {
      try {
        await collaborationService.initialize(applicationId, user);
        setIsConnected(true);
        
        // Load existing comments
        const existingComments = await collaborationService.getComments(applicationId);
        setComments(existingComments);
      } catch (error) {
        console.error('Failed to initialize collaboration:', error);
      }
    };

    initializeCollaboration();

    return () => {
      collaborationService.disconnect();
    };
  }, [applicationId, user]);

  React.useEffect(() => {
    const handlePresence = (presence: any) => {
      const users = Object.values(presence).flat().map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        lastSeen: user.lastSeen,
        isOnline: true,
      }));
      setOnlineUsers(users);
    };

    const handleComment = (comment: Comment) => {
      setComments(prev => [...prev, comment]);
    };

    collaborationService.on('presence', handlePresence);
    collaborationService.on('comment', handleComment);

    return () => {
      collaborationService.off('presence', handlePresence);
      collaborationService.off('comment', handleComment);
    };
  }, []);

  return {
    isConnected,
    onlineUsers,
    comments,
    sendCursorPosition: collaborationService.sendCursorPosition.bind(collaborationService),
    sendSelection: collaborationService.sendSelection.bind(collaborationService),
    sendEdit: collaborationService.sendEdit.bind(collaborationService),
    addComment: collaborationService.addComment.bind(collaborationService),
    resolveComment: collaborationService.resolveComment.bind(collaborationService),
  };
}
