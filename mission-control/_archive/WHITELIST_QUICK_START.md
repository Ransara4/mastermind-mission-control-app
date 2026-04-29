# Emmie Whitelist - Quick Start Guide

## What Is This?
The whitelist protects important email senders from automatic deletion by Emmie.

## How to Access
1. Open Mission Control: http://localhost:3001
2. Go to "Email Cleanup" page
3. Click "Whitelist" in the sidebar

## How to Use

### Protect a Sender
Click **"+ Add to Whitelist"** and enter one or more:
- **Name:** Person/organization (e.g., "Jay Shetty")
- **Email:** Exact address (e.g., "support@company.com")
- **Pattern:** Domain/wildcard (e.g., "domain:gmail.com")
- **Reason:** Why this is protected (optional)

### Remove Protection
Click **"Remove"** next to any entry in the table.

### Clear Everything
Click **"Clear All"** at the bottom (requires confirmation).

## Current Whitelist (16 Protected Senders)
✅ Jay Shetty, Eri Kardos, Audible, Marly Benedicto, Aflora Tulum, Descript, Littlebird, Belong Center, CAMP, Agoda, Discord, Miki Beach, Oshom Bali, Carly Faragher, Jaymin Patel, Operations@mikibeach

## Examples

### Protect All Gmail:
```
Pattern: domain:gmail.com
Reason: Keep all Gmail addresses
```

### Protect Specific Person:
```
Name: Jane Doe
Reason: Important client
```

### Pattern Matching:
```
Pattern: pattern:noreply-*
Reason: Keep all noreply addresses
```

## Technical Details
- **Storage:** `/Users/openclaw/.openclaw/workspace/mission-control/lib/emmie-whitelist.json`
- **API:** `/api/emmie/whitelist` (GET, POST, PUT, DELETE)
- **Live Server:** http://localhost:3001

## Testing
Run automated tests:
```bash
/tmp/test-whitelist.sh
```

All tests should pass ✅

---
**Status:** ✅ Fully functional  
**Date:** February 24, 2026
