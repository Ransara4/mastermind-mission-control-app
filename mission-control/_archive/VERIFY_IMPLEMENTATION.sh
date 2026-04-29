#!/bin/bash

echo "🔍 Verifying Email Cleanup Module Implementation..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ((ERRORS++))
    fi
}

# Function to check content in file
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ((ERRORS++))
    fi
}

echo "📁 Checking Directory Structure..."
check_dir "app/app/email-cleanup"
check_dir "app/app/email-cleanup/sections"
echo ""

echo "📄 Checking Frontend Files..."
check_file "app/app/email-cleanup/page.tsx"
check_file "app/app/email-cleanup/sections/RulesSection.tsx"
check_file "app/app/email-cleanup/sections/WhitelistSection.tsx"
check_file "app/app/email-cleanup/sections/UncertainEmailsSection.tsx"
check_file "app/app/email-cleanup/sections/MetricsSection.tsx"
check_file "app/app/email-cleanup/sections/LogsSection.tsx"
check_file "app/app/email-cleanup/sections/TestRulesSection.tsx"
echo ""

echo "🗄️  Checking Backend Files..."
check_file "convex/emmie.ts"
check_file "convex/schema.ts"
echo ""

echo "📚 Checking Documentation..."
check_file "EMAIL_CLEANUP_MODULE.md"
check_file "EMMIE_IMPLEMENTATION_SUMMARY.md"
echo ""

echo "🔧 Checking Schema Updates..."
check_content "convex/schema.ts" "emmieRules"
check_content "convex/schema.ts" "emmieWhitelist"
check_content "convex/schema.ts" "emmieUncertainEmails"
check_content "convex/schema.ts" "emmieCleanupLogs"
check_content "convex/schema.ts" "emmieMetrics"
echo ""

echo "🧭 Checking Navigation Update..."
check_content "app/app/layout.tsx" "Email Cleanup"
check_content "app/app/layout.tsx" "email-cleanup"
echo ""

echo "📊 File Statistics..."
echo -n "Backend lines: "
wc -l convex/emmie.ts 2>/dev/null | awk '{print $1}' || echo "0"

echo -n "Frontend files: "
find app/app/email-cleanup -name "*.tsx" 2>/dev/null | wc -l || echo "0"

echo -n "Total frontend lines: "
find app/app/email-cleanup -name "*.tsx" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0"

echo ""

# Summary
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "🚀 Email Cleanup Module is ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "  1. cd mission-control"
    echo "  2. npx convex deploy"
    echo "  3. npm run dev"
    echo "  4. Navigate to /app/email-cleanup"
    echo ""
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ $ERRORS ERROR(S) FOUND${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please review the errors above and fix them."
    exit 1
fi
