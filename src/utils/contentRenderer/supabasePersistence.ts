
import { supabase } from '@/integrations/supabase/client';
import { ContentBlock } from './types';

export interface CodeSession {
  id: string;
  user_id: string;
  title: string;
  content_blocks: ContentBlock[];
  compilation_results: any;
  user_preferences: any;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CodeVersion {
  id: string;
  session_id: string;
  version_number: number;
  content_blocks: ContentBlock[];
  compilation_results: any;
  change_description: string;
  created_at: string;
}

export class SupabasePersistence {
  private static instance: SupabasePersistence;
  private realtimeChannel: any;

  static getInstance(): SupabasePersistence {
    if (!SupabasePersistence.instance) {
      SupabasePersistence.instance = new SupabasePersistence();
    }
    return SupabasePersistence.instance;
  }

  async saveCodeSession(
    contentBlocks: ContentBlock[],
    compilationResults: any,
    userPreferences: any,
    title?: string
  ): Promise<string> {
    try {
      // Store in user preferences for now since we don't have code_sessions table
      const sessionData = {
        contentBlocks,
        compilationResults,
        title: title || `Session ${new Date().toISOString()}`,
        timestamp: new Date().toISOString()
      };

      await this.saveUserPreferences({
        lastSession: sessionData
      });

      console.log('Code session saved to user preferences');
      return `session_${Date.now()}`;
    } catch (error) {
      console.error('Failed to save code session:', error);
      throw error;
    }
  }

  async updateCodeSession(
    sessionId: string,
    contentBlocks: ContentBlock[],
    compilationResults: any,
    changeDescription?: string
  ): Promise<void> {
    try {
      const sessionData = {
        contentBlocks,
        compilationResults,
        changeDescription: changeDescription || 'Auto-save',
        timestamp: new Date().toISOString()
      };

      await this.saveUserPreferences({
        lastSession: sessionData
      });

      console.log('Code session updated:', sessionId);
    } catch (error) {
      console.error('Failed to update code session:', error);
      throw error;
    }
  }

  async loadCodeSession(sessionId: string): Promise<CodeSession | null> {
    try {
      const preferences = await this.loadUserPreferences();
      const lastSession = preferences.lastSession;

      if (lastSession) {
        return {
          id: sessionId,
          user_id: '',
          title: lastSession.title || 'Untitled Session',
          content_blocks: lastSession.contentBlocks || [],
          compilation_results: lastSession.compilationResults || {},
          user_preferences: preferences,
          version: 1,
          created_at: lastSession.timestamp || new Date().toISOString(),
          updated_at: lastSession.timestamp || new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to load code session:', error);
      return null;
    }
  }

  async getUserCodeSessions(): Promise<CodeSession[]> {
    try {
      const preferences = await this.loadUserPreferences();
      const lastSession = preferences.lastSession;

      if (lastSession) {
        return [{
          id: `session_${Date.now()}`,
          user_id: '',
          title: lastSession.title || 'Untitled Session',
          content_blocks: lastSession.contentBlocks || [],
          compilation_results: lastSession.compilationResults || {},
          user_preferences: preferences,
          version: 1,
          created_at: lastSession.timestamp || new Date().toISOString(),
          updated_at: lastSession.timestamp || new Date().toISOString()
        }];
      }

      return [];
    } catch (error) {
      console.error('Failed to load user sessions:', error);
      return [];
    }
  }

  setupRealtimeSync(sessionId: string, onUpdate: (session: CodeSession) => void): () => void {
    // Set up real-time listening for user preferences changes
    this.realtimeChannel = supabase
      .channel(`user_preferences_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences'
        },
        async (payload) => {
          console.log('Real-time preferences update:', payload);
          const session = await this.loadCodeSession(sessionId);
          if (session) {
            onUpdate(session);
          }
        }
      )
      .subscribe();

    return () => {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  async saveUserPreferences(preferences: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, storing preferences locally');
        localStorage.setItem('contentRenderer_preferences', JSON.stringify(preferences));
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      // Fallback to local storage
      localStorage.setItem('contentRenderer_preferences', JSON.stringify(preferences));
    }
  }

  async loadUserPreferences(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const stored = localStorage.getItem('contentRenderer_preferences');
        return stored ? JSON.parse(stored) : {};
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      const stored = localStorage.getItem('contentRenderer_preferences');
      return stored ? JSON.parse(stored) : {};
    }
  }
}

export const supabasePersistence = SupabasePersistence.getInstance();
