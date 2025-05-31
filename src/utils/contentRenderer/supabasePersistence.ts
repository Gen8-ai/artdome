
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const sessionData = {
        user_id: user.id,
        title: title || `Session ${new Date().toISOString()}`,
        content_blocks: contentBlocks,
        compilation_results: compilationResults,
        user_preferences: userPreferences,
        version: 1
      };

      const { data, error } = await supabase
        .from('code_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      console.log('Code session saved:', data.id);
      return data.id;
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
      // First, create a version snapshot
      await this.createVersionSnapshot(sessionId, contentBlocks, compilationResults, changeDescription);

      // Then update the main session
      const { error } = await supabase
        .from('code_sessions')
        .update({
          content_blocks: contentBlocks,
          compilation_results: compilationResults,
          version: supabase.raw('version + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      console.log('Code session updated:', sessionId);
    } catch (error) {
      console.error('Failed to update code session:', error);
      throw error;
    }
  }

  async loadCodeSession(sessionId: string): Promise<CodeSession | null> {
    try {
      const { data, error } = await supabase
        .from('code_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to load code session:', error);
      return null;
    }
  }

  async getUserCodeSessions(): Promise<CodeSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('code_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to load user sessions:', error);
      return [];
    }
  }

  private async createVersionSnapshot(
    sessionId: string,
    contentBlocks: ContentBlock[],
    compilationResults: any,
    changeDescription?: string
  ): Promise<void> {
    try {
      // Get current version number
      const { data: session } = await supabase
        .from('code_sessions')
        .select('version')
        .eq('id', sessionId)
        .single();

      const versionData = {
        session_id: sessionId,
        version_number: (session?.version || 0) + 1,
        content_blocks: contentBlocks,
        compilation_results: compilationResults,
        change_description: changeDescription || 'Auto-save'
      };

      const { error } = await supabase
        .from('code_versions')
        .insert(versionData);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to create version snapshot:', error);
    }
  }

  async getSessionVersions(sessionId: string): Promise<CodeVersion[]> {
    try {
      const { data, error } = await supabase
        .from('code_versions')
        .select('*')
        .eq('session_id', sessionId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to load session versions:', error);
      return [];
    }
  }

  async rollbackToVersion(sessionId: string, versionNumber: number): Promise<void> {
    try {
      const { data: version, error: versionError } = await supabase
        .from('code_versions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('version_number', versionNumber)
        .single();

      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from('code_sessions')
        .update({
          content_blocks: version.content_blocks,
          compilation_results: version.compilation_results,
          version: supabase.raw('version + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      console.log(`Rolled back session ${sessionId} to version ${versionNumber}`);
    } catch (error) {
      console.error('Failed to rollback to version:', error);
      throw error;
    }
  }

  setupRealtimeSync(sessionId: string, onUpdate: (session: CodeSession) => void): () => void {
    this.realtimeChannel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'code_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Real-time session update:', payload);
          onUpdate(payload.new as CodeSession);
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
      if (!user) throw new Error('User not authenticated');

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
      throw error;
    }
  }

  async loadUserPreferences(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) return {};
      return data || {};
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      return {};
    }
  }
}

export const supabasePersistence = SupabasePersistence.getInstance();
