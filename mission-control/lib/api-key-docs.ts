/**
 * API key documentation registry.
 * Maps skill/integration slug → env vars, instructions, and signup URL.
 * Used by the Settings page to guide users through obtaining and injecting API keys.
 */

export interface ApiKeyField {
  /** Field name as saved in skills .auth vault */
  fieldName: string;
  /** The ENV var name to inject into ~/.openclaw/workspace/.env */
  envVar: string;
  /** Human-readable label */
  label: string;
  /** Input type */
  type: "password" | "text";
  placeholder?: string;
}

export interface ApiKeyDoc {
  /** Short description of what this key enables */
  description: string;
  /** Direct URL to get the API key / create app */
  signupUrl: string;
  /** Human-readable step-by-step instructions. URLs starting with https:// are rendered as clickable links. */
  instructions: string[];
  /** Mapping of field name → ENV var */
  fields: ApiKeyField[];
  /** Pricing info, e.g. "Free: 2,000 req/month" or "Paid only" */
  pricingNote?: string;
  /** Extra gotcha notes shown below the instructions */
  notes?: string[];
}

const docs: Record<string, ApiKeyDoc> = {

  airtable: {
    description: "Read and write Airtable bases and tables via personal access token.",
    signupUrl: "https://airtable.com/create/tokens",
    pricingNote: "Free tier available — API included on all plans",
    instructions: [
      "Log in to Airtable, then go directly to https://airtable.com/create/tokens",
      "Click 'Create new token' in the top-right corner",
      "Give the token a name (e.g. 'openclaw'), then add scopes: data.records:read, data.records:write, schema.bases:read",
      "Under 'Access', select the bases you want or choose 'All current and future bases'",
      "Click 'Create token', then copy the token immediately — it starts with 'pat'",
    ],
    notes: [
      "Legacy API keys (starting with key...) are deprecated. Personal access tokens (pat...) are the current standard.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "AIRTABLE_API_KEY", label: "Personal Access Token", type: "password", placeholder: "pat..." },
    ],
  },

  anthropic: {
    description: "Anthropic Claude API key for AI inference. (Note: openclaw uses Claude CLI — this is only needed for direct API calls.)",
    signupUrl: "https://console.anthropic.com/settings/keys",
    pricingNote: "Paid only — pay-as-you-go, no free tier",
    instructions: [
      "Log in at https://console.anthropic.com",
      "Click 'API Keys' in the left sidebar (under Settings)",
      "Click 'Create Key', give it a descriptive name, then copy the key starting with 'sk-ant-'",
      "Add billing at https://console.anthropic.com/settings/billing — minimum $5 top-up required before the key works",
    ],
    notes: [
      "openclaw and Claude Code use your Max subscription via Claude CLI — they do NOT consume API credits. You only need this key if you're building something that calls the API directly.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "ANTHROPIC_API_KEY", label: "API Key", type: "password", placeholder: "sk-ant-..." },
    ],
  },

  apollo: {
    description: "Lead enrichment, contact search, and prospecting via Apollo.io.",
    signupUrl: "https://app.apollo.io/#/settings/integrations/api",
    pricingNote: "Free: 50 export credits/month; paid plans from $49/mo",
    instructions: [
      "Log in at https://app.apollo.io",
      "Click your avatar → Settings → Integrations → API Keys (https://app.apollo.io/#/settings/integrations/api)",
      "Copy the existing API key, or click 'Create new key' if none exists",
    ],
    notes: [
      "Free plan includes 50 email export credits/month and unlimited search. Paid plans unlock bulk exports and more credits.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "APOLLO_API_KEY", label: "API Key", type: "password", placeholder: "Apollo API key" },
    ],
  },

  brave: {
    description: "Brave Search API for privacy-focused web search queries.",
    signupUrl: "https://api.search.brave.com/register",
    pricingNote: "Free: 2,000 queries/month; paid from $3/1,000 queries",
    instructions: [
      "Sign up for a free developer account at https://api.search.brave.com/register",
      "After verifying your email, go to https://api.search.brave.com/app/keys",
      "Click 'Add Subscription' → choose 'Free AI' (or paid plan) → the key is generated instantly",
      "Copy the key from the dashboard — it starts with 'BSA'",
    ],
    notes: [
      "The Free plan gives 2,000 requests/month. No credit card required.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "BRAVE_API_KEY", label: "API Key", type: "password", placeholder: "BSA..." },
    ],
  },

  gemini: {
    description: "Google Gemini API for grounded web search and AI model access via Google AI Studio.",
    signupUrl: "https://aistudio.google.com/apikey",
    pricingNote: "Free tier: generous rate limits; paid via Google Cloud billing",
    instructions: [
      "Go to https://aistudio.google.com/apikey and sign in with your Google account",
      "Click 'Create API key' — select an existing Google Cloud project or create one",
      "Copy the key — it starts with 'AIza'",
      "Used by OpenClaw as a web search fallback provider (Gemini grounded search)",
    ],
    notes: [
      "Free tier is very generous. No credit card required to start.",
      "Also powers Gemini models (gemini-2.5-flash, etc.) if used as an LLM provider.",
      "Rio onboarding help widget now uses OpenRouter (OPENROUTER_API_KEY) — not Gemini.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "GEMINI_API_KEY", label: "API Key (OpenClaw)", type: "password", placeholder: "AIza..." },
    ],
  },

  openrouter: {
    description: "OpenRouter API — routes to free and paid AI models (Llama, Gemma, Mistral, etc.). Powers the Rio onboarding help widget.",
    signupUrl: "https://openrouter.ai/keys",
    pricingNote: "Free tier available — many models are completely free with no credit card",
    instructions: [
      "Go to https://openrouter.ai and sign up for a free account",
      "Navigate to https://openrouter.ai/keys and click 'Create Key'",
      "Give it a name (e.g. 'Rio help widget') and copy the key — it starts with 'sk-or-v1-'",
      "Add to Vercel: Settings > Environment Variables > OPENROUTER_API_KEY",
    ],
    notes: [
      "Free models (marked :free) have shared rate limits — occasional 429s are normal and handled gracefully.",
      "Current model: meta-llama/llama-3.3-70b-instruct:free for text, nvidia/nemotron-nano-12b-v2-vl:free for screenshot vision.",
      "To upgrade: swap the model names in app/api/waba-help/route.ts and add credits at openrouter.ai/credits.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "OPENROUTER_API_KEY", label: "API Key", type: "password", placeholder: "sk-or-v1-..." },
    ],
  },

  canva: {
    description: "Canva Connect API for creating designs, accessing brand kits, and exporting assets.",
    signupUrl: "https://www.canva.com/developers/",
    pricingNote: "Free to register; some API features require Canva Teams",
    instructions: [
      "Go to https://www.canva.com/developers/ and click 'Get started'",
      "Sign in with your Canva account, then click 'Create an integration'",
      "Fill in integration name, description, and redirect URI (use http://localhost for testing)",
      "In the integration settings, go to 'Credentials' tab and copy the Client ID and Client Secret",
      "Follow the OAuth 2.0 flow to generate an access token — see docs at https://www.canva.dev/docs/connect/authentication/",
    ],
    notes: [
      "The Canva API uses OAuth 2.0, not a simple API key. The token expires and must be refreshed. For personal automation, see the 'user access token' flow in the developer docs.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "CANVA_API_KEY", label: "API Key / Access Token", type: "password", placeholder: "OAuth access token or API key" },
    ],
  },

  descript: {
    description: "Descript API for transcription and video/audio editing workflows.",
    signupUrl: "https://web.descript.com/settings",
    pricingNote: "API access requires Descript Enterprise plan",
    instructions: [
      "Log in at https://web.descript.com",
      "Go to Settings (gear icon in bottom-left) → Integrations",
      "Look for 'API' or 'Developer' section — if visible, generate an API token",
      "If not visible, you'll need to upgrade to an Enterprise plan or contact Descript support",
    ],
    notes: [
      "Descript's public API is not widely available. For personal transcription use, consider Whisper (local, free) or OpenAI's transcription API as alternatives.",
    ],
    fields: [
      { fieldName: "api_token", envVar: "DESCRIPT_API_TOKEN", label: "API Token", type: "password", placeholder: "Descript API token" },
    ],
  },

  dropbox: {
    description: "Dropbox file storage for backup, sync, and knowledge layer access.",
    signupUrl: "https://www.dropbox.com/developers/apps",
    pricingNote: "Free: 2GB storage; API access included on all plans",
    instructions: [
      "Log in and go to https://www.dropbox.com/developers/apps",
      "Click 'Create app' → choose 'Scoped access' → select 'Full Dropbox' → name your app",
      "In the app settings, go to 'Permissions' tab and enable: files.content.read, files.content.write, files.metadata.read",
      "Go to 'Settings' tab → scroll to 'OAuth 2' → under 'Generated access token', click 'Generate' for a short-lived token",
      "For a long-lived refresh token: visit https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&token_access_type=offline&response_type=code, approve, get the code, then exchange it at https://api.dropboxapi.com/oauth2/token",
    ],
    notes: [
      "Short-lived access tokens expire after ~4 hours. For unattended agents, use the refresh token flow: set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN.",
      "Your App Key and App Secret are shown on the app's Settings tab.",
    ],
    fields: [
      { fieldName: "access_token", envVar: "DROPBOX_ACCESS_TOKEN", label: "Access Token (short-lived)", type: "password", placeholder: "sl...." },
      { fieldName: "app_key", envVar: "DROPBOX_APP_KEY", label: "App Key", type: "text", placeholder: "App key from developer console" },
      { fieldName: "app_secret", envVar: "DROPBOX_APP_SECRET", label: "App Secret", type: "password", placeholder: "App secret from developer console" },
      { fieldName: "refresh_token", envVar: "DROPBOX_REFRESH_TOKEN", label: "Refresh Token (long-lived)", type: "password", placeholder: "Refresh token from OAuth2 exchange" },
    ],
  },

  google: {
    description: "Google APIs for Places, Maps, Calendar, Drive, Gmail, and Sheets.",
    signupUrl: "https://console.cloud.google.com/apis/credentials",
    pricingNote: "Free tier available; Places API charges after $200/month credit",
    instructions: [
      "Go to https://console.cloud.google.com and create a new project (or select existing)",
      "Navigate to 'APIs & Services' → 'Library', then search for and enable the APIs you need (e.g. 'Places API (New)')",
      "Go to 'APIs & Services' → 'Credentials' → 'Create Credentials' → 'API key'",
      "Click 'Restrict key' and limit it to the specific APIs you enabled (prevents abuse if leaked)",
      "Copy the API key — it starts with 'AIza'",
      "For Gmail/Drive write access, create an 'OAuth 2.0 Client ID' instead, download credentials.json, and run the auth flow with: gog auth login",
    ],
    notes: [
      "Google gives $200/month free credit for Maps Platform APIs (Places, Geocoding, etc.) — enough for ~40,000 place searches/month at no cost.",
      "The gog CLI (newyork1@gmail.com) handles Gmail, Drive, Calendar auth separately via stored OAuth credentials.",
    ],
    fields: [
      { fieldName: "places_api_key", envVar: "GOOGLE_PLACES_API_KEY", label: "Google Places API Key", type: "password", placeholder: "AIza..." },
    ],
  },

  gumroad: {
    description: "Gumroad API for reading sales data, managing products, and creating discount codes.",
    signupUrl: "https://app.gumroad.com/settings/advanced",
    pricingNote: "Free to access API — Gumroad takes a flat 10% fee per sale",
    instructions: [
      "Log in at https://app.gumroad.com",
      "Click your avatar → Settings → Advanced (https://app.gumroad.com/settings/advanced)",
      "Scroll to the 'Application' section",
      "If you see a token, copy it. If not, click 'Generate access token'",
    ],
    notes: [
      "This is a personal access token, not an OAuth app. It grants full API access to your account.",
    ],
    fields: [
      { fieldName: "access_token", envVar: "GUMROAD_ACCESS_TOKEN", label: "Access Token", type: "password", placeholder: "your_gumroad_access_token" },
    ],
  },

  hunter: {
    description: "Hunter.io email finder and verifier for lead generation and outreach.",
    signupUrl: "https://hunter.io/api_keys",
    pricingNote: "Free: 25 searches + 50 verifications/month; paid from $34/mo",
    instructions: [
      "Log in at https://hunter.io",
      "Go to https://hunter.io/api_keys (or Dashboard → API → API Keys)",
      "Your API key is displayed — copy it",
      "If you need a new key, click 'Generate a new API key'",
    ],
    fields: [
      { fieldName: "api_key", envVar: "HUNTER_API_KEY", label: "API Key", type: "password", placeholder: "hunter_api_key" },
    ],
  },

  instantly: {
    description: "Instantly.ai cold email automation — campaigns, leads, and analytics.",
    signupUrl: "https://app.instantly.ai/app/settings/integrations",
    pricingNote: "Paid only — from $37/month",
    instructions: [
      "Log in at https://app.instantly.ai",
      "Go to Settings → Integrations (https://app.instantly.ai/app/settings/integrations)",
      "Scroll to the 'API Key' section at the bottom of the page",
      "Copy the API key shown — or click 'Regenerate' if you need a fresh one",
    ],
    fields: [
      { fieldName: "api_key", envVar: "INSTANTLY_API_KEY", label: "API Key", type: "password", placeholder: "instantly_api_key" },
    ],
  },

  linkedin: {
    description: "LinkedIn API for posting content, reading analytics, and accessing profiles.",
    signupUrl: "https://www.linkedin.com/developers/apps/new",
    pricingNote: "Free to create a developer app; some endpoints require Partner Program access",
    instructions: [
      "Go to https://www.linkedin.com/developers/apps/new",
      "Fill in app name, associate with a LinkedIn Page (required — create one at https://www.linkedin.com/company/setup/new/ if needed), upload a logo, agree to terms",
      "After creation, go to the 'Auth' tab — copy the Client ID and Client Secret",
      "Under 'OAuth 2.0 settings', add a redirect URI (e.g. http://localhost:3000/callback)",
      "Go to the 'Products' tab and request access to 'Share on LinkedIn' and 'Sign In with LinkedIn'",
      "Wait for product approval (usually instant for Share on LinkedIn), then you'll have w_member_social scope",
    ],
    notes: [
      "The LinkedIn MCP server installed in openclaw handles OAuth token refresh automatically once the app is configured.",
      "Analytics endpoints (impressions, clicks) require an additional 'Marketing Developer Platform' product — request from the Products tab.",
    ],
    fields: [
      { fieldName: "client_id", envVar: "LINKEDIN_CLIENT_ID", label: "Client ID", type: "text", placeholder: "77abc1234..." },
      { fieldName: "client_secret", envVar: "LINKEDIN_CLIENT_SECRET", label: "Client Secret", type: "password", placeholder: "LinkedIn client secret" },
    ],
  },

  "linkedin-images": {
    description: "LinkedIn image generation — uses the same app credentials as the LinkedIn integration.",
    signupUrl: "https://www.linkedin.com/developers/apps",
    pricingNote: "Same app as LinkedIn — no additional cost",
    instructions: [
      "This integration shares credentials with the LinkedIn integration above.",
      "Go to https://www.linkedin.com/developers/apps, open your existing app",
      "Copy the Client ID and Client Secret from the Auth tab",
    ],
    fields: [
      { fieldName: "client_id", envVar: "LINKEDIN_CLIENT_ID", label: "Client ID", type: "text", placeholder: "77abc1234..." },
      { fieldName: "client_secret", envVar: "LINKEDIN_CLIENT_SECRET", label: "Client Secret", type: "password", placeholder: "LinkedIn client secret" },
    ],
  },

  notion: {
    description: "Notion API for reading/writing pages, databases, and blocks across workspaces.",
    signupUrl: "https://www.notion.so/my-integrations",
    pricingNote: "Free — internal integrations are included on all Notion plans",
    instructions: [
      "Go to https://www.notion.so/my-integrations (you must be logged in)",
      "Click '+ New integration'",
      "Give it a name (e.g. 'openclaw'), select the workspace (BaliBloom or RIO), keep type as 'Internal'",
      "Under Capabilities, enable: Read content, Update content, Insert content, Read user information",
      "Click 'Save', then copy the 'Internal Integration Token' — it starts with 'secret_'",
      "IMPORTANT: In each Notion page/database you want to access, click '...' → 'Add connections' → select your integration. Without this, the API returns 404.",
    ],
    notes: [
      "BaliBloom and RIO are separate workspaces — create separate integrations for each (NOTION_API_KEY and NOTION_API_KEY_BALIBLOOM).",
      "If a page/database returns 404, check that you've shared it with the integration.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "NOTION_API_KEY", label: "Integration Token (RIO workspace)", type: "password", placeholder: "secret_..." },
      { fieldName: "api_key_balibloom", envVar: "NOTION_API_KEY_BALIBLOOM", label: "Integration Token (BaliBloom workspace)", type: "password", placeholder: "secret_..." },
    ],
  },

  nvidia: {
    description: "NVIDIA NIM API for running Llama, Mistral, and other models on NVIDIA's GPU cloud.",
    signupUrl: "https://build.nvidia.com/",
    pricingNote: "Free credits on sign-up; paid after trial",
    instructions: [
      "Go to https://build.nvidia.com/ and sign in (or create a free account)",
      "Click on any model card (e.g. meta/llama-3.1-8b-instruct)",
      "On the model page, click 'Get API Key' in the top-right area",
      "A modal will appear — click 'Generate Key', then copy the key starting with 'nvapi-'",
    ],
    notes: [
      "New accounts get free inference credits (~1,000 requests). After that, you pay per token.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "NVIDIA_API_KEY", label: "API Key", type: "password", placeholder: "nvapi-..." },
    ],
  },

  openai: {
    description: "OpenAI API for GPT-4, Whisper transcription, and text embeddings.",
    signupUrl: "https://platform.openai.com/api-keys",
    pricingNote: "Paid only — pay-as-you-go; no free tier since March 2024",
    instructions: [
      "Log in at https://platform.openai.com",
      "Click your avatar → 'API keys' (or go to https://platform.openai.com/api-keys)",
      "Click '+ Create new secret key', give it a name, click 'Create secret key'",
      "Copy the key NOW — it starts with 'sk-' and is shown only once",
      "Add billing at https://platform.openai.com/settings/organization/billing — a minimum $5 top-up is required before the key will work",
    ],
    notes: [
      "GPT-4o costs ~$2.50/1M input tokens. For most use cases, GPT-4o-mini (~$0.15/1M) is far more cost-effective.",
      "Set a monthly spend limit at https://platform.openai.com/settings/organization/limits to avoid surprise bills.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "OPENAI_API_KEY", label: "API Key", type: "password", placeholder: "sk-..." },
    ],
  },

  pexels: {
    description: "Pexels stock photo and video API — free, high-resolution, commercial-use images.",
    signupUrl: "https://www.pexels.com/api/",
    pricingNote: "Completely free — unlimited requests, commercial use allowed",
    instructions: [
      "Create a free account at https://www.pexels.com/join/",
      "Go to https://www.pexels.com/api/ and click 'Your API key'",
      "Fill in a short application form (app name, description, how you'll use it) and submit",
      "Your API key appears immediately on the page — copy it",
    ],
    notes: [
      "No rate limit is published, but Pexels asks you to be reasonable. Attribution is appreciated but not required for the API.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "PEXELS_API_KEY", label: "API Key", type: "password", placeholder: "Pexels API key" },
    ],
  },

  porkbun: {
    description: "Porkbun domain registrar API for DNS management, WHOIS, and domain transfers.",
    signupUrl: "https://porkbun.com/account/api",
    pricingNote: "Free to access — you just need a Porkbun account",
    instructions: [
      "Log in at https://porkbun.com, then go to https://porkbun.com/account/api",
      "Toggle 'API Access' to ON for your account (required before keys will work)",
      "Click 'Create API Key' — you'll get an API Key (pk1_...) and a Secret Key (sk1_...) immediately",
      "Copy BOTH values — the secret is only shown once",
      "To enable API on a specific domain: go to Domains → click the domain → scroll to 'API Access' and toggle it on",
    ],
    notes: [
      "API access must be enabled at both the account level AND per-domain for domain-specific operations like DNS updates.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "PORKBUN_API_KEY", label: "API Key", type: "password", placeholder: "pk1_..." },
      { fieldName: "secret_key", envVar: "PORKBUN_SECRET_KEY", label: "Secret Key", type: "password", placeholder: "sk1_..." },
    ],
  },

  unsplash: {
    description: "Unsplash free high-resolution photography API for commercial use.",
    signupUrl: "https://unsplash.com/oauth/applications",
    pricingNote: "Free: 50 requests/hour (demo); unlimited after approval",
    instructions: [
      "Create a free Unsplash account at https://unsplash.com/join",
      "Go to https://unsplash.com/oauth/applications and click 'New Application'",
      "Accept the API terms, fill in the application details (name, description, how you'll use it)",
      "After creating the app, scroll to 'Keys' — copy the 'Access Key' and 'Secret Key'",
      "New apps start in Demo mode (50 req/hour). To go to Production, click 'Apply for Production' and describe your use case",
    ],
    notes: [
      "Demo mode is fine for personal use. Production approval typically takes 1-3 business days.",
      "Attribution is required: display 'Photo by [Photographer] on Unsplash' next to images.",
    ],
    fields: [
      { fieldName: "access_key", envVar: "UNSPLASH_ACCESS_KEY", label: "Access Key", type: "password", placeholder: "Unsplash access key" },
      { fieldName: "secret_key", envVar: "UNSPLASH_SECRET_KEY", label: "Secret Key", type: "password", placeholder: "Unsplash secret key" },
    ],
  },

  reddit: {
    description: "Reddit API for reading posts, comments, and subreddit data.",
    signupUrl: "https://www.reddit.com/prefs/apps",
    pricingNote: "Free: 100 requests/minute; paid Data API for higher volume",
    instructions: [
      "Log in at reddit.com, then go to https://www.reddit.com/prefs/apps",
      "Scroll to the bottom and click 'are you a developer? create an app...'",
      "Select type: 'script' (for personal use/bots running under your own account)",
      "Fill in name (any), description (any), redirect URI: http://localhost:8080",
      "Click 'create app' — the Client ID is the short string under your app name, Client Secret is shown as 'secret'",
    ],
    notes: [
      "The 'script' app type uses OAuth2 with your own username/password. This is the simplest flow for personal automation.",
      "Reddit requires a unique User-Agent string for all API requests (e.g. 'openclaw/1.0 by /u/yourname').",
    ],
    fields: [
      { fieldName: "client_id", envVar: "REDDIT_CLIENT_ID", label: "Client ID", type: "text", placeholder: "Reddit app client ID" },
      { fieldName: "client_secret", envVar: "REDDIT_CLIENT_SECRET", label: "Client Secret", type: "password", placeholder: "Reddit app secret" },
      { fieldName: "username", envVar: "REDDIT_USERNAME", label: "Reddit Username", type: "text", placeholder: "your_reddit_username" },
      { fieldName: "password", envVar: "REDDIT_PASSWORD", label: "Reddit Password", type: "password", placeholder: "your_reddit_password" },
    ],
  },

  slack: {
    description: "Slack API for sending messages, reading channels, and DM automation.",
    signupUrl: "https://api.slack.com/apps/new",
    pricingNote: "Free — workspace apps are included on all Slack plans",
    instructions: [
      "Go to https://api.slack.com/apps/new → select 'From scratch'",
      "Give the app a name and select your workspace, then click 'Create App'",
      "Go to 'OAuth & Permissions' in the sidebar",
      "Under 'Bot Token Scopes', add: channels:read, chat:write, groups:read, im:read, mpim:read, users:read",
      "For reading messages: also add channels:history, groups:history, im:history",
      "Scroll up and click 'Install to Workspace' → approve → copy the Bot User OAuth Token (xoxb-...)",
      "For a User token (to act as yourself): add User Token Scopes and copy the User OAuth Token (xoxp-...)",
    ],
    notes: [
      "Bot tokens (xoxb-) are for the bot user. User tokens (xoxp-) act as you personally — needed for searching DMs or sending DMs to yourself.",
      "The Slack CLI (node ~/.openclaw/workspace/agents/slack/src/index.js) uses the user token (SLACK_USER_TOKEN) for most operations.",
    ],
    fields: [
      { fieldName: "bot_token", envVar: "SLACK_BOT_TOKEN", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
      { fieldName: "user_token", envVar: "SLACK_USER_TOKEN", label: "User Token (xoxp-...)", type: "password", placeholder: "xoxp-..." },
    ],
  },

  stripe: {
    description: "Stripe payments API for reading sales, managing subscriptions, and verifying payment links.",
    signupUrl: "https://dashboard.stripe.com/apikeys",
    pricingNote: "Free to access API — Stripe charges 2.9% + 30¢ per transaction",
    instructions: [
      "Log in at https://dashboard.stripe.com",
      "Go to Developers → API Keys (https://dashboard.stripe.com/apikeys)",
      "The Secret Key is shown as 'sk_live_...' — click 'Reveal live key' and copy it",
      "For safer automation, click 'Create restricted key': set resource permissions (e.g. Customers: Read, Charges: Read) and copy that instead",
      "For testing: toggle to 'Test mode' in the top-right and use the test secret key (sk_test_...)",
    ],
    notes: [
      "Never commit your live secret key to git. Use a restricted key with only the permissions your agent actually needs.",
      "The STRIPE_RESTRICTED_KEY is used by default in openclaw agents — it has read-only access to payment links and coupons.",
    ],
    fields: [
      { fieldName: "secret_key", envVar: "STRIPE_SECRET_KEY", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
      { fieldName: "restricted_key", envVar: "STRIPE_RESTRICTED_KEY", label: "Restricted Key (recommended)", type: "password", placeholder: "rk_live_..." },
    ],
  },

  tavily: {
    description: "Tavily AI-powered web search API — optimized for LLM-friendly results.",
    signupUrl: "https://app.tavily.com/",
    pricingNote: "Free: 1,000 API calls/month; paid from $39/mo",
    instructions: [
      "Sign up at https://app.tavily.com/ with your email (takes 30 seconds, no credit card)",
      "After email verification, your API key is shown on the dashboard immediately",
      "Copy the key — it starts with 'tvly-'",
    ],
    notes: [
      "1,000 free calls/month is enough for moderate daily use. The key never expires on the free plan.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "TAVILY_API_KEY", label: "API Key", type: "password", placeholder: "tvly-..." },
    ],
  },

  telegram: {
    description: "Telegram Bot API for sending notifications, receiving commands, and two-way messaging.",
    signupUrl: "https://t.me/BotFather",
    pricingNote: "Completely free — no limits for personal bots",
    instructions: [
      "Open Telegram (desktop or mobile) and start a chat with @BotFather (https://t.me/BotFather)",
      "Send the command: /newbot",
      "Follow the prompts: enter a display name (e.g. 'Joe's openclaw'), then a username ending in 'bot' (e.g. joeopenclaw_bot)",
      "BotFather replies with your bot token — copy the full string (format: 123456789:ABCdef...)",
      "To get your Chat ID: message your new bot once, then visit https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates in your browser",
      "Look for '\"id\"' inside the '\"chat\"' object — that number is your Chat ID",
    ],
    notes: [
      "Your Chat ID is your personal Telegram user ID (a positive integer). Group IDs are negative. Use the positive one for personal notifications.",
      "The openclaw gateway sends completion notifications to this chat ID when agents finish tasks.",
    ],
    fields: [
      { fieldName: "bot_token", envVar: "TELEGRAM_BOT_TOKEN", label: "Bot Token", type: "password", placeholder: "123456789:ABCdef..." },
      { fieldName: "chat_id", envVar: "TELEGRAM_CHAT_ID", label: "Chat ID (your user ID)", type: "text", placeholder: "123456789" },
    ],
  },

  tidycal: {
    description: "TidyCal scheduling API for reading bookings, availability, and managing appointments.",
    signupUrl: "https://tidycal.com/settings/developer",
    pricingNote: "API included — TidyCal is $19 one-time purchase",
    instructions: [
      "Log in at https://tidycal.com",
      "Go to Account Settings → Developer (https://tidycal.com/settings/developer)",
      "Click 'Generate API Token' if none exists, or copy the existing one",
    ],
    fields: [
      { fieldName: "api_token", envVar: "TIDYCAL_API_TOKEN", label: "API Token", type: "password", placeholder: "TidyCal API token" },
    ],
  },

  trello: {
    description: "Trello API for reading boards, lists, and cards.",
    signupUrl: "https://trello.com/power-ups/admin",
    pricingNote: "Free — API access is included on all Trello plans",
    instructions: [
      "Log in to Trello, then go to https://trello.com/power-ups/admin",
      "Click 'New' to create a new Power-Up (or use an existing one)",
      "Fill in name, workspace, and description, then click 'Create'",
      "On the Power-Up detail page, click 'Generate a new API key' — copy the API Key",
      "Click the 'Token' link next to the API key to generate a user token — click 'Allow' and copy the token",
    ],
    notes: [
      "Trello merged their developer portal into the Atlassian ecosystem. The trello.com/app-key URL still works as an alternative shortcut.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "TRELLO_API_KEY", label: "API Key", type: "text", placeholder: "Trello API key (32 chars)" },
      { fieldName: "token", envVar: "TRELLO_TOKEN", label: "User Token", type: "password", placeholder: "Trello user token (64 chars)" },
    ],
  },

  wix: {
    description: "Wix API for site management, CRM contacts, blog publishing, and product catalog.",
    signupUrl: "https://manage.wix.com/account/api-keys",
    pricingNote: "API access requires a Business or higher Wix plan",
    instructions: [
      "Log in to Wix, then go to https://manage.wix.com/account/api-keys",
      "Click 'Generate API Key'",
      "Give it a name, select permissions: 'All site permissions' or specific ones (CMS, Contacts, Blog)",
      "Select the site to associate the key with, then click 'Generate'",
      "Copy the API Key immediately — it starts with 'IST.eyJ' and is shown once",
      "Your Account ID is in the URL: manage.wix.com/dashboard/XXXXXXXX-XXXX... — copy that UUID",
    ],
    notes: [
      "WIX_API_KEY and WIX_ACCOUNT_ID are used together for account-level operations. WIX_API_TOKEN (same key, different env var name) is used by some older agents.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "WIX_API_KEY", label: "API Key", type: "password", placeholder: "IST.eyJ..." },
      { fieldName: "account_id", envVar: "WIX_ACCOUNT_ID", label: "Account ID (UUID from URL)", type: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { fieldName: "api_token", envVar: "WIX_API_TOKEN", label: "API Token (alt copy of key)", type: "password", placeholder: "IST.eyJ..." },
    ],
  },

  "zoho-books": {
    description: "Zoho Books accounting API for invoices, journal entries, contacts, and reports.",
    signupUrl: "https://api-console.zoho.com/",
    pricingNote: "API included on all Zoho Books plans",
    instructions: [
      "Log in to Zoho, then go to https://api-console.zoho.com/",
      "Click 'Add Client' → select 'Self Client' (simplest for personal use — no redirect URI needed)",
      "After creating, go to the 'Generate Code' tab",
      "Enter scope: ZohoBooks.fullaccess.all and duration: Persistent, then click 'Create'",
      "Copy the authorization code immediately (it expires in 3 minutes)",
      "Exchange the code for tokens via the Zoho token endpoint — see https://www.zoho.com/books/api/v3/oauth/#refresh-token",
      "Your Org ID is in Zoho Books → Settings → Organization Profile → Organization ID",
    ],
    notes: [
      "The Self Client flow gives you a persistent refresh token without needing a web server. Client ID and Client Secret are on the app's 'Client Secret' tab.",
      "Use the .in, .eu, or .com domain for token endpoints depending on your Zoho data center.",
    ],
    fields: [
      { fieldName: "client_id", envVar: "ZOHO_CLIENT_ID", label: "Client ID", type: "text", placeholder: "1000.xxx..." },
      { fieldName: "client_secret", envVar: "ZOHO_CLIENT_SECRET", label: "Client Secret", type: "password", placeholder: "Zoho client secret" },
      { fieldName: "refresh_token", envVar: "ZOHO_REFRESH_TOKEN", label: "Refresh Token", type: "password", placeholder: "1000.xxx..." },
      { fieldName: "org_id", envVar: "ZOHO_ORG_ID", label: "Organization ID", type: "text", placeholder: "Zoho org ID (numbers only)" },
    ],
  },

  zoom: {
    description: "Zoom API for accessing meeting recordings, transcripts, and user info.",
    signupUrl: "https://marketplace.zoom.us/develop/create",
    pricingNote: "Free — Server-to-Server OAuth is available on all Zoom plans",
    instructions: [
      "Go to https://marketplace.zoom.us/develop/create",
      "Select 'Server-to-Server OAuth' app type (NOT the deprecated JWT type)",
      "Fill in app name (e.g. 'openclaw'), then click 'Create'",
      "Copy the Account ID, Client ID, and Client Secret from the 'App Credentials' tab",
      "Go to the 'Scopes' tab and add: cloud_recording:read:list_user_recordings, meeting:read:list_meetings, user:read:zak",
      "Go to the 'Activation' tab and click 'Activate your app'",
    ],
    notes: [
      "JWT-based Zoom apps were deprecated in June 2023 — Server-to-Server OAuth is the current standard.",
      "Recording access requires the user to have cloud recording enabled on their Zoom plan.",
    ],
    fields: [
      { fieldName: "account_id", envVar: "ZOOM_ACCOUNT_ID", label: "Account ID", type: "text", placeholder: "Zoom account ID" },
      { fieldName: "client_id", envVar: "ZOOM_CLIENT_ID", label: "Client ID", type: "text", placeholder: "Zoom client ID" },
      { fieldName: "client_secret", envVar: "ZOOM_CLIENT_SECRET", label: "Client Secret", type: "password", placeholder: "Zoom client secret" },
    ],
  },

  "meta-ads": {
    description: "Meta (Facebook/Instagram) Ads API for campaign management, audience insights, and ad analytics.",
    signupUrl: "https://developers.facebook.com/apps/",
    pricingNote: "Free to access API — you pay for the ads you run",
    instructions: [
      "Go to https://developers.facebook.com/apps/ and click 'Create App'",
      "Select 'Business' as the app type, fill in details, link to your Business Manager",
      "Once created, click '+ Add Product' and add 'Marketing API'",
      "Go to Tools → Graph API Explorer (https://developers.facebook.com/tools/explorer/)",
      "Select your app in the top-right dropdown, then click 'Generate Access Token'",
      "Request permissions: ads_read, ads_management, business_management, instagram_basic",
      "Copy the short-lived token, then exchange it for a long-lived token (60 days) at: https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN",
      "Your App ID and App Secret are on the app's Settings → Basic page",
    ],
    notes: [
      "Access tokens expire — long-lived tokens last 60 days. For permanent access, use a System User token via Business Manager.",
      "For Instagram insights, your Instagram account must be connected to a Facebook Page as a Professional account.",
    ],
    fields: [
      { fieldName: "access_token", envVar: "META_ACCESS_TOKEN", label: "Access Token", type: "password", placeholder: "EAAxxxxx..." },
      { fieldName: "app_id", envVar: "META_APP_ID", label: "App ID", type: "text", placeholder: "Facebook App ID (numbers)" },
      { fieldName: "app_secret", envVar: "META_APP_SECRET", label: "App Secret", type: "password", placeholder: "Facebook App Secret" },
    ],
  },

  youtube: {
    description: "YouTube Data API v3 for video search, channel analytics, and upload management.",
    signupUrl: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    pricingNote: "Free: 10,000 quota units/day (resets daily)",
    instructions: [
      "Go to https://console.cloud.google.com and select your project (same one as Google APIs if you have one)",
      "Navigate to 'APIs & Services' → 'Library' and search for 'YouTube Data API v3'",
      "Click on it and press 'Enable'",
      "Go to 'APIs & Services' → 'Credentials' → 'Create Credentials' → 'API key'",
      "Optionally restrict it to 'YouTube Data API v3' under API restrictions",
      "Copy the key — it starts with 'AIza'",
    ],
    notes: [
      "10,000 units/day is roughly 100 video searches. Uploading a video costs 1,600 units. If you hit the limit, request a quota increase at https://support.google.com/youtube/contact/yt_api_form.",
      "For uploading or reading private videos, you'll need an OAuth 2.0 Client ID instead of an API key.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "YOUTUBE_API_KEY", label: "API Key", type: "password", placeholder: "AIza..." },
    ],
  },


  vercel: {
    description: "Vercel API for deploying projects, listing deployments, and managing domains and env vars.",
    signupUrl: "https://vercel.com/account/tokens",
    pricingNote: "Free to create API tokens — included on all Vercel plans",
    instructions: [
      "Log in at https://vercel.com",
      "Click your avatar → Settings → Tokens (https://vercel.com/account/tokens)",
      "Click 'Create Token'",
      "Name it (e.g. 'openclaw'), set expiration to 'No expiration' for agents, scope to 'Full Account'",
      "Click 'Create Token' — copy it immediately, it starts with 'vcp_' or similar and is shown once",
    ],
    notes: [
      "Token scopes: 'Full Account' gives access to all your teams and projects. You can scope it to a specific team for tighter security.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "VERCEL_TOKEN", label: "API Token", type: "password", placeholder: "vcp_..." },
    ],
  },

  "ig-video-transcriber": {
    description: "Instagram credentials for downloading and transcribing videos via instaloader (optional for public profiles).",
    signupUrl: "https://www.instagram.com/accounts/login/",
    pricingNote: "Free — uses your existing Instagram account",
    instructions: [
      "Public Instagram profiles work WITHOUT any credentials — no setup needed",
      "For private profiles: enter your Instagram username and password below",
      "If you have 2FA enabled, instaloader will prompt for the code the first time",
      "For cloud transcription (faster): also configure OPENAI_API_KEY in the OpenAI section above",
    ],
    notes: [
      "Instagram may require 2FA verification on first use. Run the agent manually once to complete verification.",
      "OpenAI Whisper API (requires OPENAI_API_KEY) is used as a fallback if local Whisper is slow.",
    ],
    fields: [
      { fieldName: "username", envVar: "IG_USERNAME", label: "Instagram Username (optional)", type: "text", placeholder: "your_handle" },
      { fieldName: "password", envVar: "IG_PASSWORD", label: "Instagram Password (optional)", type: "password", placeholder: "••••••••" },
    ],
  },

  congress: {
    description: "Congress.gov API for US bill tracking, votes, amendments, and legislative data.",
    signupUrl: "https://api.congress.gov/sign-up/",
    pricingNote: "Completely free — US government public data",
    instructions: [
      "Go to https://api.congress.gov/sign-up/ — no account needed, just your name and email",
      "Submit the form — your API key is emailed within seconds",
      "Copy the key from the email",
    ],
    notes: [
      "Rate limit: 5,000 requests/hour. The API covers bills, amendments, summaries, votes, members, committees, and more going back to 1973.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "CONGRESS_API_KEY", label: "API Key", type: "password", placeholder: "Congress.gov API key" },
    ],
  },

  x: {
    description: "X (Twitter) API for posting, reading timelines, and social signal tracking.",
    signupUrl: "https://developer.x.com/en/portal/dashboard",
    pricingNote: "Free: post-only (500 posts/month); Basic $100/mo for search/reading",
    instructions: [
      "Go to https://developer.x.com/en/portal/dashboard and sign in with your X account",
      "Click '+ Add App' → create a new Project, give it a name and use case description",
      "Inside the project, click '+ Add App' → choose 'Production' environment",
      "Go to the app → 'Keys and tokens' tab",
      "Copy the API Key (Consumer Key) and API Key Secret (Consumer Secret)",
      "Under 'Authentication Tokens', click 'Generate' under Access Token and Secret — copy both",
      "Copy the Bearer Token for read-only endpoints (no OAuth needed)",
    ],
    notes: [
      "The free tier allows 500 posts/month and limited read access. For search/timeline reading, the Basic plan ($100/mo) is required.",
      "X/Twitter monitoring is currently paused (not worth $100/mo). The keys are stored for future use.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "X_API_KEY", label: "API Key (Consumer Key)", type: "password", placeholder: "X API key" },
      { fieldName: "api_secret", envVar: "X_API_SECRET", label: "API Key Secret", type: "password", placeholder: "X API secret" },
      { fieldName: "access_token", envVar: "X_ACCESS_TOKEN", label: "Access Token", type: "password", placeholder: "X access token" },
      { fieldName: "access_token_secret", envVar: "X_ACCESS_TOKEN_SECRET", label: "Access Token Secret", type: "password", placeholder: "X access token secret" },
      { fieldName: "bearer_token", envVar: "X_BEARER_TOKEN", label: "Bearer Token", type: "password", placeholder: "X bearer token" },
    ],
  },

  lunarcrush: {
    description: "LunarCrush social intelligence API for crypto sentiment, coin rankings, and influencer tracking.",
    signupUrl: "https://lunarcrush.com/developers/api/authentication",
    pricingNote: "Paid only — Individual plan required (~$29/mo) for API access",
    instructions: [
      "Sign up at https://lunarcrush.com and upgrade to an Individual plan or higher",
      "Go to your account dashboard → API section",
      "Click 'Generate API Key' and copy it",
      "Review the API docs at https://lunarcrush.com/developers/api — free tier does NOT include API access",
    ],
    notes: [
      "Rate limit on Individual plan: 4 requests/minute, 100/day. Batch your calls and cache results aggressively.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "LUNARCRUSH_API_KEY", label: "API Key", type: "password", placeholder: "LunarCrush API key" },
    ],
  },

  "mac-cleaner": {
    description: "MacCleaner agent — no API keys required. Uses native macOS tools (brew, npm, find) only.",
    signupUrl: "",
    pricingNote: "Free — no external services",
    instructions: [
      "No API key required for this agent",
      "Ensure Homebrew is installed for brew cleanup support: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
      "The agent runs as the current user with no elevated permissions",
    ],
    fields: [],
  },

  "manychat-giveaways": {
    description: "ManyChat API for cloning giveaway flows, setting keywords, and managing custom user fields on Instagram.",
    signupUrl: "https://manychat.com/settings/api",
    pricingNote: "API requires ManyChat Pro plan ($15/mo+)",
    instructions: [
      "Log in at https://app.manychat.com",
      "Go to Settings → API → Generate API Key (https://manychat.com/settings/api)",
      "Copy the API key and add it as MANYCHAT_API_KEY",
      "Find your master giveaway template flow: navigate to Flows, open your master template, copy the Flow ID from the URL bar",
      "Set MANYCHAT_MASTER_FLOW_ID to that numeric Flow ID",
    ],
    notes: [
      "The master flow ID is used by the giveaway agent to clone the template for each new giveaway. Keep it backed up.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "MANYCHAT_API_KEY", label: "ManyChat API Key", type: "password", placeholder: "your_manychat_api_key" },
      { fieldName: "master_flow_id", envVar: "MANYCHAT_MASTER_FLOW_ID", label: "Master Flow ID", type: "text", placeholder: "123456789" },
    ],
  },

  tokopedia: {
    description: "Tokopedia shopping agent — uses browser session. No API key, just your account credentials.",
    signupUrl: "https://www.tokopedia.com/login",
    pricingNote: "Free — uses your personal Tokopedia account",
    instructions: [
      "Create or log in to your Tokopedia account at https://www.tokopedia.com",
      "The agent uses agent-browser (port 9223) for cart operations — log in there once",
      "Optionally store your email and password below for automatic login if the session expires",
    ],
    notes: [
      "Prices are shown in IDR and USD equivalent (rate: ~16,000 IDR/USD). Never use the 'buy' command — use 'add-to-cart' instead.",
    ],
    fields: [
      { fieldName: "email", envVar: "TOKOPEDIA_EMAIL", label: "Account Email", type: "text", placeholder: "your@email.com" },
      { fieldName: "password", envVar: "TOKOPEDIA_PASSWORD", label: "Account Password", type: "password", placeholder: "your_password" },
    ],
  },

  "mentorship-watcher": {
    description: "Monitors Zoom cloud recordings for mentorship sessions. No API key — uses Zoom folder sync.",
    signupUrl: "https://zoom.us/recording/settings",
    pricingNote: "Free — requires Zoom cloud recording enabled on your plan",
    instructions: [
      "No API key required for this agent",
      "Ensure Zoom is configured to save cloud recordings to ~/Documents/Zoom",
      "Enable cloud recording in Zoom settings at https://zoom.us/recording/settings",
      "The agent monitors for recordings from meeting ID 85171670004 (your mentorship room)",
      "Activate with: launchctl load ~/Library/LaunchAgents/ai.openclaw.mentorship-watcher.plist",
    ],
    fields: [],
  },

  "human-task-handler": {
    description: "Automates Human Must Do board cards using agent-browser, LastPass, and CLI tools. No API key required.",
    signupUrl: "",
    pricingNote: "Free — uses existing installed tools",
    instructions: [
      "No API key required",
      "Requires: agent-browser running on port 9223, lpass CLI authenticated, gog CLI authenticated",
      "Run manually: node ~/.openclaw/workspace/agents/human-task-handler/src/index.js scan",
    ],
    fields: [],
  },

  littlebird: {
    description: "Little Bird AI daily journal — fetches and syncs your activity summaries and reflections.",
    signupUrl: "https://app.lilbird.co",
    pricingNote: "Paid — Little Bird subscription required",
    instructions: [
      "Log in to Little Bird at https://app.lilbird.co in your agent-browser (port 9223)",
      "Run the token refresh command to extract your JWT: node ~/.openclaw/workspace/agents/littlebird/src/index.js refresh-token",
      "The agent will automatically extract the token from the browser session and save it to .env",
      "Tokens are JWTs — they expire periodically. Re-run refresh-token when the agent starts failing.",
    ],
    notes: [
      "The LITTLEBIRD_ACCESS_TOKEN is a JWT extracted from your browser session. You don't need to manually generate it — use the refresh-token command.",
    ],
    fields: [
      { fieldName: "access_token", envVar: "LITTLEBIRD_ACCESS_TOKEN", label: "JWT Access Token", type: "password", placeholder: "eyJhbGci..." },
    ],
  },

  "smart-home": {
    description: "Controls Philips Hue (local bridge) and Tuya/SmartLife devices. Hue needs no account; Tuya needs IoT Platform credentials.",
    signupUrl: "https://iot.tuya.com/",
    pricingNote: "Free — Hue local API + Tuya IoT Platform free tier",
    instructions: [
      "── Philips Hue ──",
      "Make sure your Mac and Hue Bridge are on the same WiFi network",
      "Run: node ~/.openclaw/workspace/agents/smart-home/src/index.js setup",
      "Press the physical button on your Hue Bridge when prompted — done",
      "── Tuya / SmartLife ──",
      "Go to https://iot.tuya.com and create a free account",
      "Create a new Cloud Project (Development > Create Cloud Project)",
      "In the project, go to Devices > Link App Account and scan the QR code with your SmartLife app",
      "Copy the Client ID and Client Secret from the project's Overview tab",
      "Add to ~/.openclaw/workspace/.env: TUYA_CLIENT_ID=... and TUYA_CLIENT_SECRET=...",
      "Optionally set TUYA_REGION=eu (default) or us/in/cn based on your region",
    ],
    notes: [
      "Hue: local LAN only — only works when Mac is on the same WiFi as the bridge",
      "Tuya: cloud API — works from anywhere",
      "Use 'all-off' command to kill both Hue and Tuya devices in one shot",
    ],
    fields: [
      { fieldName: "client_id", envVar: "TUYA_CLIENT_ID", label: "Tuya Client ID", type: "text", placeholder: "xxxxxxxxxxxxxx" },
      { fieldName: "client_secret", envVar: "TUYA_CLIENT_SECRET", label: "Tuya Client Secret", type: "password", placeholder: "xxxxxxxxxxxxxx" },
      { fieldName: "region", envVar: "TUYA_REGION", label: "Region (eu/us/in/cn)", type: "text", placeholder: "eu" },
    ],
  },

  spotify: {
    description: "Controls Spotify playback via Web API — play, pause, skip, search, volume, playlists.",
    signupUrl: "https://developer.spotify.com/dashboard",
    pricingNote: "Free — Spotify Developer account required (free tier)",
    instructions: [
      "Go to https://developer.spotify.com/dashboard and log in with your Spotify account",
      "Click 'Create App', give it any name (e.g. 'OpenClaw')",
      "In the app settings, add Redirect URI: http://127.0.0.1:8888/callback",
      "Copy the Client ID from the app dashboard",
      "Add to ~/.openclaw/workspace/.env: SPOTIFY_CLIENT_ID=your_client_id",
      "Run: node ~/.openclaw/workspace/agents/spotify/src/index.js setup",
      "A browser window opens — log in and authorize. Tokens saved to config/tokens.json",
    ],
    notes: [
      "Uses PKCE OAuth — no client secret stored. Tokens auto-refresh.",
      "Requires an active Spotify device (phone, computer, speaker) to control playback",
    ],
    fields: [
      { fieldName: "client_id", envVar: "SPOTIFY_CLIENT_ID", label: "Spotify Client ID", type: "text", placeholder: "abc123def456..." },
    ],
  },

  screenshot: {
    description: "Captures desktop, window, and web page screenshots for visual reasoning. No API key required — uses macOS screencapture and agent-browser.",
    signupUrl: "",
    pricingNote: "Free — uses built-in macOS tools and agent-browser",
    instructions: [
      "No setup required. Uses macOS screencapture (built-in) for desktop/window captures.",
      "Web page screenshots use agent-browser (must be installed: npm install -g agent-browser).",
      "CLI: node ~/.openclaw/workspace/agents/screenshot/src/index.js <command>",
    ],
    fields: [],
  },

  bing_webmaster: {
    description: "Bing Webmaster Tools API for keyword stats, page performance, and URL submission to Bing's search index.",
    signupUrl: "https://www.bing.com/webmasters",
    pricingNote: "Free — included with Bing Webmaster Tools account",
    instructions: [
      "Go to https://www.bing.com/webmasters and sign in (Google, Microsoft, or Facebook account all work)",
      "If you have sites in Google Search Console, click 'Import from Google Search Console' to skip manual verification",
      "Otherwise click 'Add a site', enter your full URL including https://, and verify ownership",
      "For Wix verification: use the HTML meta tag method — Wix Dashboard → Marketing & SEO → SEO Tools → Site Verification → Bing section → paste the tag → Save → click Verify in Bing",
      "Once verified, click the Settings gear (top right) → API Access → accept Terms → click 'Generate API Key'",
      "Copy the key — one key covers all your verified sites",
    ],
    notes: [
      "One API key per Bing account — it covers all verified sites, not just one.",
      "siteUrl in API calls must match the verified URL exactly including trailing slash.",
      "Date fields in Bing API responses use /Date(ms)/ format, not ISO 8601.",
      "If a site was imported from GSC, it's already verified — skip to the API key step.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "BING_WEBMASTER_API_KEY", label: "API Key", type: "password", placeholder: "32-character hex key" },
    ],
  },

  pagespeed: {
    description: "Google PageSpeed Insights API for Core Web Vitals lab data. Also used for the Chrome User Experience Report (CrUX) API for real-user field data.",
    signupUrl: "https://console.cloud.google.com/apis/credentials",
    pricingNote: "Free — 25,000 requests/day (PageSpeed); CrUX API is free with no published limit",
    instructions: [
      "Go to https://console.cloud.google.com and create a project (or select an existing one)",
      "Enable the PageSpeed Insights API: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com",
      "Enable the Chrome UX Report API: https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com",
      "Go to Credentials → Create Credentials → API Key",
      "Copy the key — the same key works for both PageSpeed and CrUX",
      "Optionally restrict the key to only PageSpeed Insights API + Chrome UX Report API for security",
    ],
    notes: [
      "The same API key covers PageSpeed Insights and the CrUX API — no need for two keys.",
      "CrUX data only exists for URLs with sufficient real-user traffic. Low-traffic pages return 'not_found' — this is normal.",
      "PageSpeed returns lab data (simulated throttled device). CrUX returns real user p75 values from Chrome.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "PAGESPEED_API_KEY", label: "API Key", type: "password", placeholder: "AIza..." },
    ],
  },

  bouncer: {
    description: "Bouncer email verification API — validates email addresses in bulk to reduce bounce rates.",
    signupUrl: "https://app.usebouncer.com/login",
    pricingNote: "Pay-as-you-go from $8 per 1,000 verifications; free trial credits available",
    instructions: [
      "Sign up at https://usebouncer.com and log in",
      "Go to Dashboard → API → API Keys",
      "Click 'Generate new key', give it a name, copy the key",
    ],
    fields: [
      { fieldName: "api_key", envVar: "BOUNCER_API_KEY", label: "API Key", type: "password", placeholder: "Bouncer API key" },
    ],
  },

  huggingface: {
    description: "Hugging Face Inference API for running open-source AI models (text, image, audio).",
    signupUrl: "https://huggingface.co/settings/tokens",
    pricingNote: "Free tier: rate-limited Inference API; paid plans from $9/mo for dedicated endpoints",
    instructions: [
      "Sign up or log in at https://huggingface.co",
      "Go to Settings → Access Tokens: https://huggingface.co/settings/tokens",
      "Click 'New token', select role 'Read' (or 'Write' if needed), copy the token starting with 'hf_'",
    ],
    fields: [
      { fieldName: "api_key", envVar: "HUGGINGFACE_API_KEY", label: "Access Token", type: "password", placeholder: "hf_..." },
    ],
  },

  mandrill: {
    description: "Mandrill (Mailchimp Transactional) for sending transactional emails — welcome emails, password resets, portal notifications.",
    signupUrl: "https://mandrillapp.com",
    pricingNote: "Paid only — $20/mo for 500k emails (requires active Mailchimp account)",
    instructions: [
      "Log in to your Mailchimp account at https://mailchimp.com",
      "Click your account avatar (top right) → Account & billing",
      "In the left nav, click 'Transactional email' — this opens Mandrill",
      "If prompted, activate Transactional Email (paid add-on, billed monthly)",
      "In Mandrill, go to Settings → SMTP & API info",
      "Click '+ New API Key', give it a name (e.g. 'mastermind-portal'), leave all boxes unchecked",
      "Click 'Create API Key' and copy the key immediately — it starts with 'md-'",
      "Add your sending domain: Settings → Domains → Add a Domain → enter mastermindshq.business",
      "Follow DNS verification steps (add DKIM + SPF records at your domain registrar)",
    ],
    notes: [
      "Create one key per app so you can revoke independently without breaking other integrations.",
      "Sending domain must be verified via DNS before emails will deliver. Allow up to 24h for DNS propagation.",
      "The sending domain for the mastermind portal is mastermindshq.business.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "MANDRILL_API_KEY", label: "API Key", type: "password", placeholder: "md-..." },
    ],
  },

  manychat: {
    description: "ManyChat API for building and managing Instagram/Facebook/WhatsApp chatbot flows.",
    signupUrl: "https://manychat.com",
    pricingNote: "Free plan available; API access requires Pro plan ($15/mo+)",
    instructions: [
      "Log in at https://manychat.com",
      "Go to Settings → API (left sidebar)",
      "Click 'Enable API Access' if not already enabled",
      "Copy the API token shown",
    ],
    fields: [
      { fieldName: "api_key", envVar: "MANYCHAT_API_KEY", label: "API Token", type: "password", placeholder: "ManyChat API token" },
    ],
  },

  wunderground: {
    description: "Weather Underground API for hyperlocal weather station data.",
    signupUrl: "https://www.wunderground.com/member/api-keys",
    pricingNote: "Free for personal use (500 calls/day); paid plans for higher volume",
    instructions: [
      "Sign in at https://www.wunderground.com (create a free account if needed)",
      "Go to https://www.wunderground.com/member/api-keys",
      "Click 'Generate a Key', give it a name, copy the key",
    ],
    notes: [
      "Used to get personal weather station readings for hyperlocal forecasts.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "WUNDERGROUND_API_KEY", label: "API Key", type: "password", placeholder: "Wunderground API key" },
    ],
  },

  cliproxy: {
    description: "CliProxy residential proxy service for web scraping and bypassing bot detection.",
    signupUrl: "https://cliproxy.com",
    pricingNote: "Paid — pricing based on bandwidth",
    instructions: [
      "Sign up at https://cliproxy.com and purchase a plan",
      "Go to Dashboard → API Keys to get your API key",
      "Copy the proxy endpoint URL from your dashboard settings",
    ],
    fields: [
      { fieldName: "api_key", envVar: "CLIPROXYAPI_KEY", label: "API Key", type: "password", placeholder: "CliProxy API key" },
      { fieldName: "api_url", envVar: "CLIPROXYAPI_URL", label: "Proxy URL", type: "text", placeholder: "https://..." },
    ],
  },

  transcript: {
    description: "Transcription API key for audio/video transcription workflows.",
    signupUrl: "https://platform.openai.com/api-keys",
    pricingNote: "Varies by provider",
    instructions: [
      "If using OpenAI Whisper: go to https://platform.openai.com/api-keys and create an API key",
      "If using a dedicated transcription service: get the API key from your provider's dashboard",
      "Add the key as TRANSCRIPT_API_KEY in ~/.openclaw/workspace/.env",
    ],
    fields: [
      { fieldName: "api_key", envVar: "TRANSCRIPT_API_KEY", label: "Transcription API Key", type: "password", placeholder: "API key" },
    ],
  },

  kling: {
    description: "AI video generation — text-to-video, image-to-video, lip-sync by Kuaishou.",
    signupUrl: "https://app.klingai.com/global/dev/api-key",
    pricingNote: "Pay-per-use. New accounts get $1 free credit. V3: ~$0.08–0.17/gen.",
    instructions: [
      "Go to https://app.klingai.com/global/dev and sign in (Google login works)",
      "Click 'Create a new API Key' on the dashboard",
      "Copy the Access Key and Secret Key (secret shown only once!)",
      "Add both to ~/.openclaw/workspace/.env as KLING_ACCESS_KEY and KLING_SECRET_KEY",
      "CLI: node ~/.openclaw/workspace/agents/kling/src/index.js <command>",
    ],
    fields: [
      {
        fieldName: "accessKey",
        envVar: "KLING_ACCESS_KEY",
        label: "Access Key",
        type: "password",
        placeholder: "ak-xxxxxxxxxxxxxxxx",
      },
      {
        fieldName: "secretKey",
        envVar: "KLING_SECRET_KEY",
        label: "Secret Key",
        type: "password",
        placeholder: "sk-xxxxxxxxxxxxxxxx",
      },
    ],
  },

  ahrefs: {
    description: "Ahrefs SEO API for backlink analysis, domain rating, competitor gap, and broken link detection.",
    signupUrl: "https://ahrefs.com/api",
    pricingNote: "Included with Standard+ plans ($249/mo). API v3 uses unit-based billing.",
    instructions: [
      "Log in at https://ahrefs.com",
      "Go to Account Settings (top-right avatar) then API (https://app.ahrefs.com/user/api)",
      "Copy your API key (Bearer token format)",
      "Note: API access requires Standard plan or higher",
    ],
    notes: [
      "API v3 uses a unit system. A simple stats query costs 1-5 units. Standard plan includes 150,000 units/month.",
      "Used by the Backlinks agent for prospect discovery, competitor backlink gaps, and broken link building.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "AHREFS_API_KEY", label: "API Key (Bearer Token)", type: "password", placeholder: "ahrefs_api_key" },
    ],
  },

  serpapi: {
    description: "SerpAPI for Google search results. Used by Backlinks agent for footprint-based prospect discovery.",
    signupUrl: "https://serpapi.com/manage-api-key",
    pricingNote: "Free: 100 searches/mo; Developer $50/mo (5,000 searches)",
    instructions: [
      "Sign up at https://serpapi.com",
      "Go to https://serpapi.com/manage-api-key",
      "Copy your API key",
    ],
    fields: [
      { fieldName: "api_key", envVar: "SERPAPI_KEY", label: "API Key", type: "password", placeholder: "serpapi_key" },
    ],
  },

  instantly: {
    description: "Instantly.ai cold email sending and warming. Used by Backlinks agent for automated outreach sequences.",
    signupUrl: "https://app.instantly.ai/app/settings/integrations",
    pricingNote: "Growth: $37/mo (5,000 leads, unlimited email accounts)",
    instructions: [
      "Log in at https://app.instantly.ai",
      "Go to Settings > Integrations > API",
      "Copy your API key",
    ],
    notes: [
      "Connect at least one email account and enable warm-up before sending outreach.",
    ],
    fields: [
      { fieldName: "api_key", envVar: "INSTANTLY_API_KEY", label: "API Key", type: "password", placeholder: "instantly_api_key" },
    ],
  },
};

export default docs;

/** Look up docs for a skill slug. Returns null if not found. */
export function getApiKeyDoc(slug: string): ApiKeyDoc | null {
  return docs[slug] ?? null;
}

/** Get all documented slugs */
export function getDocumentedSlugs(): string[] {
  return Object.keys(docs);
}
