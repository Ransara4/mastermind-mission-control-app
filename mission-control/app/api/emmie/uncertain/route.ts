import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const UNCERTAIN_PATH = path.join(process.cwd(), 'lib', 'emmie-uncertain-emails.json');

interface UncertainEmail {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: number;
  flaggedAt: number;
  reason: string;
  suggestedAction: 'delete' | 'archive' | 'file' | 'keep';
  status: 'pending' | 'approved' | 'denied';
  resolvedAt?: number;
  resolvedAction?: string;
}

async function readUncertainEmails(): Promise<UncertainEmail[]> {
  try {
    const content = await fs.readFile(UNCERTAIN_PATH, 'utf-8');
    const data = JSON.parse(content);
    return data.uncertain || [];
  } catch {
    return [];
  }
}

async function writeUncertainEmails(emails: UncertainEmail[]): Promise<void> {
  await fs.writeFile(UNCERTAIN_PATH, JSON.stringify({ uncertain: emails }, null, 2));
}

// GET - List uncertain emails with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const emails = await readUncertainEmails();
    
    let filtered = emails;
    if (status !== 'all') {
      filtered = emails.filter(e => e.status === status);
    }
    
    // Sort by flaggedAt descending
    filtered.sort((a, b) => b.flaggedAt - a.flaggedAt);
    
    // Apply limit
    filtered = filtered.slice(0, limit);

    return NextResponse.json({ 
      success: true, 
      count: filtered.length,
      emails: filtered 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to read uncertain emails' },
      { status: 500 }
    );
  }
}

// POST - Flag a new uncertain email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageId,
      from,
      subject,
      snippet,
      receivedAt,
      reason,
      suggestedAction = 'archive'
    } = body;

    if (!messageId || !from || !subject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'messageId, from, and subject are required' 
        },
        { status: 400 }
      );
    }

    const emails = await readUncertainEmails();
    
    // Check if already flagged
    const existing = emails.find(e => e.messageId === messageId);
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email already flagged',
        email: existing 
      });
    }

    const newEmail: UncertainEmail = {
      id: `uncertain_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      messageId,
      from,
      subject,
      snippet: snippet || '',
      receivedAt: receivedAt || Date.now(),
      flaggedAt: Date.now(),
      reason: reason || 'Uncertain classification',
      suggestedAction: suggestedAction as UncertainEmail['suggestedAction'],
      status: 'pending'
    };

    emails.push(newEmail);
    await writeUncertainEmails(emails);

    return NextResponse.json({ success: true, email: newEmail }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to flag uncertain email' },
      { status: 500 }
    );
  }
}

// PATCH - Approve/Deny an uncertain email
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const { status, action } = await request.json();

    if (!status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status (approved|denied) is required' },
        { status: 400 }
      );
    }

    const emails = await readUncertainEmails();
    const index = emails.findIndex(e => e.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    const resolvedAction = action || emails[index].suggestedAction;

    emails[index] = {
      ...emails[index],
      status: status as UncertainEmail['status'],
      resolvedAt: Date.now(),
      resolvedAction
    };

    // If approved with archive/delete action, actually do it in Gmail
    let gmailError: string | null = null;
    if (status === 'approved' && (resolvedAction === 'archive' || resolvedAction === 'delete')) {
      try {
        const refreshToken = await fs.readFile(
          path.join(WS, ".gmail-refresh-token"),
          'utf-8'
        ).then(t => t.trim());

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: '141906476123-ktda7d6kcajk9kafelouf9lfgrmj5igj.apps.googleusercontent.com',
            client_secret: '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',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (accessToken) {
          const messageId = emails[index].messageId;
          const labelsToAdd = resolvedAction === 'delete' ? ['TRASH'] : [];
          const labelsToRemove = resolvedAction === 'archive' ? ['INBOX'] : [];

          const gmailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                addLabelIds: labelsToAdd,
                removeLabelIds: labelsToRemove,
              }),
            }
          );

          if (!gmailRes.ok) {
            gmailError = `Gmail API error (${gmailRes.status})`;
          }
        } else {
          gmailError = 'Failed to get Gmail access token';
        }
      } catch (e: unknown) {
        gmailError = e instanceof Error ? e.message : String(e);
      }
    }

    await writeUncertainEmails(emails);

    return NextResponse.json({
      success: true,
      email: emails[index],
      ...(gmailError ? { gmailError } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update uncertain email' },
      { status: 500 }
    );
  }
}

// DELETE - Remove uncertain email
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    let emails = await readUncertainEmails();
    const initial = emails.length;
    emails = emails.filter(e => e.id !== id);

    if (emails.length === initial) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    await writeUncertainEmails(emails);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete uncertain email' },
      { status: 500 }
    );
  }
}

// PUT - Bulk actions (archive or keep selected emails)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids } = body;

    if (!action || !['archive', 'keep'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action (archive|keep) is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email IDs array is required' },
        { status: 400 }
      );
    }

    let emails = await readUncertainEmails();
    const archiveErrors: string[] = [];

    if (action === 'archive') {
      // Archive: mark as approved with action 'archive'
      const messageIds: string[] = [];
      
      for (const id of ids) {
        const index = emails.findIndex(e => e.id === id);
        if (index !== -1) {
          const msg = emails[index];
          messageIds.push(msg.messageId);
          
          emails[index] = {
            ...emails[index],
            status: 'approved',
            resolvedAt: Date.now(),
            resolvedAction: 'archive'
          };
        }
      }
      
      // Actually archive in Gmail via direct API (remove INBOX label)
      if (messageIds.length > 0) {
        try {
          const refreshToken = await fs.readFile(
            path.join(WS, ".gmail-refresh-token"),
            'utf-8'
          ).then(t => t.trim());

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: '141906476123-ktda7d6kcajk9kafelouf9lfgrmj5igj.apps.googleusercontent.com',
              client_secret: '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',
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          });
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          if (!accessToken) {
            archiveErrors.push('Failed to get Gmail access token');
          } else {
            const archiveRes = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ids: messageIds,
                  removeLabelIds: ['INBOX'],
                }),
              }
            );

            if (!archiveRes.ok) {
              const errBody = await archiveRes.text();
              archiveErrors.push(`Gmail API error (${archiveRes.status}): ${errBody}`);
            }
          }
        } catch (e: unknown) {
          archiveErrors.push(`Archive failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } else if (action === 'keep') {
      // Keep in inbox: mark as denied (won't ask again)
      for (const id of ids) {
        const index = emails.findIndex(e => e.id === id);
        if (index !== -1) {
          emails[index] = {
            ...emails[index],
            status: 'denied',
            resolvedAt: Date.now(),
            resolvedAction: 'keep'
          };
        }
      }
    }

    await writeUncertainEmails(emails);
    
    return NextResponse.json({
      success: true,
      message: `${ids.length} emails marked as ${action === 'archive' ? 'archived' : 'kept in inbox'}`,
      processed: ids.length,
      ...(archiveErrors.length > 0 ? { archiveErrors } : {}),
    });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}
