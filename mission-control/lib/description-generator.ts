/**
 * Smart Backup Description Generator
 * 
 * Analyzes recent system activity and generates contextual backup descriptions
 * like "After Guard Dog security scan", "Post-Scrooge optimization sync"
 */

import { getRecentActivity } from './activity-logger';

interface GeneratedDescription {
  description: string;
  confidence: number;
  sources: string[];
}

// Agent-specific descriptions
const AGENT_DESCRIPTIONS: Record<string, { after: string; before: string }> = {
  'guard-dog': {
    after: 'After Guard Dog security scan',
    before: 'Before Guard Dog security scan',
  },
  'scrooge': {
    after: 'Post-Scrooge optimization sync',
    before: 'Pre-Scrooge optimization sync',
  },
  'emmie': {
    after: 'After Emmie inbox cleanup',
    before: 'Before Emmie inbox cleanup',
  },
  'teddy': {
    after: 'After Teddy cleanup task',
    before: 'Before Teddy cleanup task',
  },
};

// Common cron job descriptions
const CRON_JOB_DESCRIPTIONS: Record<string, { after: string; before: string }> = {
  'OpenClaw Backup': {
    after: 'Post-scheduled backup sync',
    before: 'Pre-scheduled backup sync',
  },
  "Teddy's Telegram Cleanup": {
    after: 'After Telegram cleanup',
    before: 'Before Telegram cleanup',
  },
  "Emmie's 4AM Inbox Review": {
    after: 'After inbox review',
    before: 'Before inbox review',
  },
  'Google Contacts Sync': {
    after: 'Post-contacts sync',
    before: 'Pre-contacts sync',
  },
  'Model Fallback Monitor': {
    after: 'After model fallback check',
    before: 'Before model fallback check',
  },
};

/**
 * Generate a smart backup description based on recent activity
 */
export async function generateBackupDescription(hoursBack: number = 1): Promise<GeneratedDescription> {
  try {
    const activity = await getRecentActivity(hoursBack);

    if (activity.activities.length === 0) {
      return {
        description: 'System checkpoint',
        confidence: 0.3,
        sources: [],
      };
    }

    // Analyze the most recent activities
    const recentActivities = activity.activities.slice(0, 5);
    
    // Score each potential description
    let bestDescription = 'System checkpoint';
    let bestConfidence = 0.3;
    const sources: string[] = [];

    // Check for agent activities
    for (const agentName of Array.from(activity.agents)) {
      if (AGENT_DESCRIPTIONS[agentName]) {
        const agent = AGENT_DESCRIPTIONS[agentName];
        
        // Find most recent activity of this type
        const agentActivity = recentActivities.find(a => a.name === agentName);
        if (agentActivity) {
          bestDescription = agent.after;
          bestConfidence = 0.9;
          sources.push(`Agent: ${agentName}`);
          break;
        }
      }
    }

    // Check for cron job activities if no agent found
    if (bestConfidence < 0.7) {
      for (const cronJobName of Array.from(activity.cronJobs)) {
        for (const [key, desc] of Object.entries(CRON_JOB_DESCRIPTIONS)) {
          if (cronJobName.includes(key)) {
            bestDescription = desc.after;
            bestConfidence = 0.8;
            sources.push(`Cron: ${cronJobName}`);
            break;
          }
        }
        if (bestConfidence >= 0.8) break;
      }
    }

    // Enhance description with file changes
    if (activity.filesChanged > 0 && bestConfidence > 0) {
      sources.push(`${activity.filesChanged} files modified`);
    }

    return {
      description: bestDescription,
      confidence: bestConfidence,
      sources: sources,
    };
  } catch (error) {
    console.error('Error generating backup description:', error);
    return {
      description: 'System checkpoint',
      confidence: 0.2,
      sources: ['error'],
    };
  }
}

/**
 * Generate alternative descriptions for user choice
 */
export async function generateBackupDescriptionAlternatives(count: number = 3): Promise<string[]> {
  try {
    const activity = await getRecentActivity(1);
    const alternatives: string[] = [];

    // Base alternatives
    const baseAlternatives = [
      'System checkpoint',
      'Pre-maintenance backup',
      'Regular snapshot',
      'Data preservation point',
      'Safe restore point',
    ];

    if (activity.activities.length === 0) {
      return baseAlternatives.slice(0, count);
    }

    // Add activity-specific alternatives
    for (const agentName of Array.from(activity.agents)) {
      if (AGENT_DESCRIPTIONS[agentName]) {
        alternatives.push(AGENT_DESCRIPTIONS[agentName].after);
      }
    }

    for (const cronJobName of Array.from(activity.cronJobs)) {
      for (const [key, desc] of Object.entries(CRON_JOB_DESCRIPTIONS)) {
        if (cronJobName.includes(key)) {
          alternatives.push(desc.after);
          break;
        }
      }
    }

    // Combine and deduplicate
    const combined = [
      ...alternatives,
      ...baseAlternatives,
    ];
    
    const unique = Array.from(new Set(combined));
    return unique.slice(0, count);
  } catch (error) {
    console.error('Error generating alternatives:', error);
    return [
      'System checkpoint',
      'Pre-maintenance backup',
      'Regular snapshot',
    ];
  }
}

/**
 * Validate and sanitize a user-provided description
 */
export function validateDescription(description: string): { valid: boolean; message?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, message: 'Description cannot be empty' };
  }

  if (description.length > 200) {
    return { valid: false, message: 'Description must be less than 200 characters' };
  }

  if (!/^[a-zA-Z0-9\s\-(),.'":]/u.test(description)) {
    return { valid: false, message: 'Description contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Format a description for display (trim, capitalize, add punctuation)
 */
export function formatDescription(description: string): string {
  let formatted = description.trim();
  
  // Add period if missing
  if (!formatted.endsWith('.') && !formatted.endsWith('!')) {
    formatted += '.';
  }
  
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  return formatted;
}
