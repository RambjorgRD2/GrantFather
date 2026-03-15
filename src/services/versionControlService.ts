/**
 * Mock Version Control Service
 * Simplified version for type safety - no database dependency
 */

import React from 'react';
import { GrantSection, GrantApplication } from '@/types/grantApplication';

export interface ApplicationVersion {
  id: string;
  applicationId: string;
  version: number;
  sections: GrantSection;
  metadata: {
    createdBy: string;
    createdAt: string;
    message?: string;
    changes?: string[];
    aiGenerated?: boolean;
    provider?: string;
    model?: string;
  };
  isAutoSave: boolean;
  isManualSave: boolean;
}

export interface VersionDiff {
  section: keyof GrantSection;
  oldContent: string;
  newContent: string;
  changes: {
    type: 'insert' | 'delete' | 'replace';
    start: number;
    end: number;
    text: string;
  }[];
}

export interface VersionComparison {
  version1: ApplicationVersion;
  version2: ApplicationVersion;
  diffs: VersionDiff[];
  summary: {
    totalChanges: number;
    sectionsChanged: number;
    additions: number;
    deletions: number;
  };
}

export class VersionControlService {
  private static instance: VersionControlService;
  private versions: ApplicationVersion[] = [];
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private autoSaveDelay = 30000; // 30 seconds

  public static getInstance(): VersionControlService {
    if (!VersionControlService.instance) {
      VersionControlService.instance = new VersionControlService();
    }
    return VersionControlService.instance;
  }

  /**
   * Create a new version (mock implementation)
   */
  public async createVersion(
    applicationId: string,
    sections: GrantSection,
    metadata: {
      createdBy: string;
      message?: string;
      changes?: string[];
      aiGenerated?: boolean;
      provider?: string;
      model?: string;
    },
    options: {
      isAutoSave?: boolean;
      isManualSave?: boolean;
    } = {}
  ): Promise<ApplicationVersion> {
    const existingVersions = this.versions.filter(v => v.applicationId === applicationId);
    const versionNumber = existingVersions.length + 1;

    const version: ApplicationVersion = {
      id: `version_${Date.now()}_${Math.random()}`,
      applicationId,
      version: versionNumber,
      sections,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
      isAutoSave: options.isAutoSave || false,
      isManualSave: options.isManualSave || false,
    };

    this.versions.push(version);
    console.log('Version created:', version);
    return version;
  }

  /**
   * Get all versions for an application
   */
  public async getVersions(applicationId: string): Promise<ApplicationVersion[]> {
    return this.versions
      .filter(v => v.applicationId === applicationId)
      .sort((a, b) => b.version - a.version);
  }

  /**
   * Get a specific version
   */
  public async getVersion(applicationId: string, version: number): Promise<ApplicationVersion | null> {
    return this.versions.find(v => v.applicationId === applicationId && v.version === version) || null;
  }

  /**
   * Get the latest version
   */
  public async getLatestVersion(applicationId: string): Promise<ApplicationVersion | null> {
    const appVersions = this.versions
      .filter(v => v.applicationId === applicationId)
      .sort((a, b) => b.version - a.version);
    
    return appVersions[0] || null;
  }

  /**
   * Compare two versions
   */
  public compareVersions(version1: ApplicationVersion, version2: ApplicationVersion): VersionComparison {
    const diffs: VersionDiff[] = [];
    const sections: (keyof GrantSection)[] = ['introduction', 'need_statement', 'project_plan', 'budget', 'outcomes', 'conclusion'];

    let totalChanges = 0;
    let sectionsChanged = 0;
    let additions = 0;
    let deletions = 0;

    sections.forEach(section => {
      const oldContent = version1.sections[section] || '';
      const newContent = version2.sections[section] || '';

      if (oldContent !== newContent) {
        const changes = this.calculateChanges(oldContent, newContent);
        if (changes.length > 0) {
          diffs.push({
            section,
            oldContent,
            newContent,
            changes,
          });

          sectionsChanged++;
          totalChanges += changes.length;
          changes.forEach(change => {
            if (change.type === 'insert') additions += change.text.length;
            if (change.type === 'delete') deletions += change.text.length;
          });
        }
      }
    });

    return {
      version1,
      version2,
      diffs,
      summary: {
        totalChanges,
        sectionsChanged,
        additions,
        deletions,
      },
    };
  }

  /**
   * Calculate changes between two text strings
   */
  private calculateChanges(oldText: string, newText: string): VersionDiff['changes'] {
    const changes: VersionDiff['changes'] = [];
    
    // Simple diff algorithm
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex >= oldLines.length) {
        changes.push({
          type: 'insert',
          start: newIndex,
          end: newIndex,
          text: newLines[newIndex],
        });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        changes.push({
          type: 'delete',
          start: oldIndex,
          end: oldIndex,
          text: oldLines[oldIndex],
        });
        oldIndex++;
      } else if (oldLines[oldIndex] === newLines[newIndex]) {
        oldIndex++;
        newIndex++;
      } else {
        changes.push({
          type: 'replace',
          start: oldIndex,
          end: oldIndex,
          text: newLines[newIndex],
        });
        oldIndex++;
        newIndex++;
      }
    }
    
    return changes;
  }

  /**
   * Start auto-save for an application
   */
  public startAutoSave(
    applicationId: string,
    getCurrentSections: () => GrantSection,
    userId: string
  ): void {
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(async () => {
      try {
        const sections = getCurrentSections();
        await this.createVersion(
          applicationId,
          sections,
          {
            createdBy: userId,
            message: 'Auto-save',
            changes: ['Automatic save'],
          },
          { isAutoSave: true }
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.autoSaveDelay);
  }

  /**
   * Stop auto-save
   */
  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

// Export singleton instance
export const versionControlService = VersionControlService.getInstance();

// React hook for version control
export function useVersionControl(applicationId: string, userId: string) {
  const [versions, setVersions] = React.useState<ApplicationVersion[]>([]);
  const [currentVersion, setCurrentVersion] = React.useState<ApplicationVersion | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadVersions = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const versionList = await versionControlService.getVersions(applicationId);
      setVersions(versionList);
      if (versionList.length > 0) {
        setCurrentVersion(versionList[0]);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  React.useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions,
    currentVersion,
    isLoading,
    createVersion: versionControlService.createVersion.bind(versionControlService),
    compareVersions: versionControlService.compareVersions.bind(versionControlService),
    startAutoSave: versionControlService.startAutoSave.bind(versionControlService),
    stopAutoSave: versionControlService.stopAutoSave.bind(versionControlService),
    reload: loadVersions,
  };
}