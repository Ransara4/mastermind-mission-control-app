/**
 * Activity Logger - Tracks recent system activity for context-aware backup descriptions
 * 
 * This module collects and analyzes:
 * - Cron job executions
 * - Agent runs and sessions
 * - File changes
 * - Major system events
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SystemActivity {
  type: 'cron' | 'agent' | 'file' | 'event';
  timestamp: number;
  name: string;
  description: string;
  details?: Record<string, any>;
}

export interface ActivitySummary {
  activities: SystemActivity[];
  timeRange: {
    start: number;
    end: number;
    hours: number;
  };
  agents: Set<string>;
  cronJobs: Set<string>;
  filesChanged: number;
}

const WORKSPACE_PATH = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), 'golden-claw');
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');
const LOGS_PATH = path.join(WORKSPACE_PATH, 'logs');
const AGENTS_PATH = path.join(WORKSPACE_PATH, 'agents');

/**
 * Get recent activity from the last N hours
 */
export async function getRecentActivity(hoursBack: number = 1): Promise<ActivitySummary> {
  const now = Date.now();
  const timeThreshold = now - hoursBack * 60 * 60 * 1000;

  const activities: SystemActivity[] = [];
  const agents = new Set<string>();
  const cronJobs = new Set<string>();
  let filesChanged = 0;

  // 1. Check cron logs
  try {
    const cronActivity = await getCronActivity(timeThreshold);
    activities.push(...cronActivity);
    cronActivity.forEach(a => cronJobs.add(a.name));
  } catch (e) {
    console.error('Error reading cron activity:', e);
  }

  // 2. Check agent activity (session history, agent runs)
  try {
    const agentActivity = await getAgentActivity(timeThreshold);
    activities.push(...agentActivity);
    agentActivity.forEach(a => agents.add(a.name));
  } catch (e) {
    console.error('Error reading agent activity:', e);
  }

  // 3. Check recent file changes
  try {
    const fileActivity = await getFileChanges(timeThreshold);
    activities.push(...fileActivity);
    filesChanged = fileActivity.length;
  } catch (e) {
    console.error('Error reading file changes:', e);
  }

  // 4. Check memory logs for documented events
  try {
    const eventActivity = await getMemoryEvents(timeThreshold);
    activities.push(...eventActivity);
  } catch (e) {
    console.error('Error reading memory events:', e);
  }

  // Sort by timestamp, most recent first
  activities.sort((a, b) => b.timestamp - a.timestamp);

  return {
    activities,
    timeRange: {
      start: timeThreshold,
      end: now,
      hours: hoursBack,
    },
    agents,
    cronJobs,
    filesChanged,
  };
}

/**
 * Extract cron job activity from logs and CRON_GOVERNANCE.md
 */
async function getCronActivity(timeThreshold: number): Promise<SystemActivity[]> {
  const activities: SystemActivity[] = [];

  try {
    // Check CRON_GOVERNANCE.md for job names and schedules
    const governancePath = path.join(WORKSPACE_PATH, 'CRON_GOVERNANCE.md');
    if (fs.existsSync(governancePath)) {
      const content = fs.readFileSync(governancePath, 'utf-8');
      
      // Parse cron job names from the file
      const jobMatches = content.match(/\| ([\w\s\-]+) \|/g);
      if (jobMatches) {
        jobMatches.forEach(match => {
          const jobName = match.replace(/\| /g, '').replace(' \|', '').trim();
          if (jobName && jobName !== 'Job') {
            // Check logs for this job's recent execution
            const logFiles = fs.readdirSync(LOGS_PATH).filter(f => f.endsWith('.log'));
            
            logFiles.forEach(logFile => {
              try {
                const logContent = fs.readFileSync(path.join(LOGS_PATH, logFile), 'utf-8');
                const logStats = fs.statSync(path.join(LOGS_PATH, logFile));
                
                if (logStats.mtimeMs >= timeThreshold && logContent.length > 0) {
                  activities.push({
                    type: 'cron',
                    timestamp: logStats.mtimeMs,
                    name: jobName,
                    description: `Cron job executed: ${jobName}`,
                    details: {
                      logFile: logFile,
                      fileSize: logContent.length,
                    },
                  });
                }
              } catch (e) {
                // Ignore individual log file errors
              }
            });
          }
        });
      }
    }
  } catch (e) {
    console.error('Error processing cron activity:', e);
  }

  return activities;
}

/**
 * Extract agent activity from agent directories and session records
 */
async function getAgentActivity(timeThreshold: number): Promise<SystemActivity[]> {
  const activities: SystemActivity[] = [];

  try {
    if (!fs.existsSync(AGENTS_PATH)) {
      return activities;
    }

    const agentDirs = fs.readdirSync(AGENTS_PATH).filter(f => {
      try {
        return fs.statSync(path.join(AGENTS_PATH, f)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const agentName of agentDirs) {
      const agentPath = path.join(AGENTS_PATH, agentName);
      
      // Check for session files or log files
      try {
        const files = fs.readdirSync(agentPath);
        
        // Look for session or log files
        const sessionFiles = files.filter(f => 
          f.includes('session') || f.endsWith('.log')
        );

        for (const file of sessionFiles) {
          try {
            const filePath = path.join(agentPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtimeMs >= timeThreshold) {
              activities.push({
                type: 'agent',
                timestamp: stats.mtimeMs,
                name: agentName,
                description: `Agent activity: ${agentName}`,
                details: {
                  file: file,
                  type: file.includes('session') ? 'session' : 'log',
                },
              });
            }
          } catch (e) {
            // Ignore individual file errors
          }
        }
      } catch (e) {
        // Ignore agent directory errors
      }
    }
  } catch (e) {
    console.error('Error processing agent activity:', e);
  }

  return activities;
}

/**
 * Detect recent file changes in the workspace
 */
async function getFileChanges(timeThreshold: number): Promise<SystemActivity[]> {
  const activities: SystemActivity[] = [];

  try {
    // Check key directories for modified files
    const dirsToCheck = [
      path.join(WORKSPACE_PATH, 'ops'),
      path.join(WORKSPACE_PATH, 'bin'),
      path.join(WORKSPACE_PATH, 'lib'),
    ];

    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile() && stats.mtimeMs >= timeThreshold) {
              activities.push({
                type: 'file',
                timestamp: stats.mtimeMs,
                name: file,
                description: `File modified: ${file}`,
                details: {
                  path: filePath,
                  size: stats.size,
                },
              });
            }
          } catch (e) {
            // Ignore individual file errors
          }
        }
      } catch (e) {
        // Ignore directory errors
      }
    }
  } catch (e) {
    console.error('Error detecting file changes:', e);
  }

  return activities;
}

/**
 * Extract documented events from memory files
 */
async function getMemoryEvents(timeThreshold: number): Promise<SystemActivity[]> {
  const activities: SystemActivity[] = [];

  try {
    if (!fs.existsSync(MEMORY_PATH)) {
      return activities;
    }

    const files = fs.readdirSync(MEMORY_PATH).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      try {
        const filePath = path.join(MEMORY_PATH, file);
        const stats = fs.statSync(filePath);
        
        // Check if file was modified after threshold
        if (stats.mtimeMs >= timeThreshold) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Extract key events/tasks from the memory file
          const lines = content.split('\n');
          for (const line of lines) {
            // Look for documented tasks or events (lines starting with -, *, or ##)
            if ((line.startsWith('- ') || line.startsWith('* ') || line.startsWith('## ')) && 
                !line.includes('TODO') && 
                line.length > 10) {
              
              // Extract agent names if mentioned (capitalized words)
              const agentMatches = line.match(/\b([A-Z][a-z]+)\b/g);
              const agents = agentMatches ? agentMatches.filter(a => 
                ['Guard', 'Dog', 'Scrooge', 'Emmie', 'Teddy'].includes(a)
              ) : [];
              
              activities.push({
                type: 'event',
                timestamp: stats.mtimeMs,
                name: agents.join(' + ') || 'System Event',
                description: line.replace(/^[-*#\s]+/, '').trim(),
                details: {
                  source: file,
                  agents: agents,
                },
              });
            }
          }
        }
      } catch (e) {
        // Ignore individual file errors
      }
    }
  } catch (e) {
    console.error('Error reading memory events:', e);
  }

  return activities;
}

/**
 * Get a concise summary of activity for quick reference
 */
export async function getActivitySummaryText(hoursBack: number = 1): Promise<string> {
  const summary = await getRecentActivity(hoursBack);
  
  if (summary.activities.length === 0) {
    return 'No recent activity detected';
  }

  const recentActivity = summary.activities.slice(0, 5);
  const lines = recentActivity.map(a => `• ${a.name}`);
  
  return lines.join('\n');
}
