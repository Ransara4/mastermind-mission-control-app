'use client';

import { useState, useEffect } from 'react';
import { Skill } from '@/lib/skills-types';
import { Eye, EyeOff, Check, Loader, ExternalLink, ChevronDown, ChevronUp, Info, Terminal, AlertCircle } from 'lucide-react';
import { getApiKeyDoc, ApiKeyField } from '@/lib/api-key-docs';

interface AuthModalProps {
  skill: Skill;
  isOpen: boolean;
  onClose: () => void;
  onAuthUpdate: () => void;
}

interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email';
  required: boolean;
  placeholder?: string;
  envVar?: string;
}

interface EnvStatus {
  [key: string]: boolean;
}

export default function AuthModal({
  skill,
  isOpen,
  onClose,
  onAuthUpdate,
}: AuthModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [injectToEnv, setInjectToEnv] = useState(true);
  const [envStatus, setEnvStatus] = useState<EnvStatus>({});
  const [envLoading, setEnvLoading] = useState(false);

  const doc = getApiKeyDoc(skill.id);

  // Build auth fields — prefer doc fields if available, fall back to authType defaults
  const getAuthFields = (): AuthField[] => {
    if (doc && doc.fields.length > 0) {
      return doc.fields.map((f: ApiKeyField) => ({
        name: f.fieldName,
        label: f.label,
        type: f.type,
        required: true,
        placeholder: f.placeholder,
        envVar: f.envVar,
      }));
    }

    // Fallback by authType
    switch (skill.authType || 'api-key') {
      case 'api-key':
        return [{ name: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Enter your API key' }];
      case 'oauth2':
        return [
          { name: 'client_id', label: 'Client ID', type: 'text', required: true },
          { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
        ];
      case 'token':
        return [{ name: 'token', label: 'Authorization Token', type: 'password', required: true }];
      case 'credentials':
        return [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
        ];
      default:
        return [{ name: 'auth_key', label: 'Authentication Key', type: 'password', required: true }];
    }
  };

  const authFields = getAuthFields();

  // Check which env vars are already set
  useEffect(() => {
    if (!isOpen || !doc) return;
    const envVars = doc.fields.map((f) => f.envVar).filter(Boolean);
    if (envVars.length === 0) return;

    setEnvLoading(true);
    fetch(`/api/env/inject?keys=${envVars.join(',')}`)
      .then((r) => r.json())
      .then((data) => setEnvStatus(data.configured || {}))
      .catch(() => {})
      .finally(() => setEnvLoading(false));
  }, [isOpen, skill.id, doc]);

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveCredentials = async () => {
    setIsLoading(true);
    try {
      // 1. Save to skills vault
      const vaultRes = await fetch(`/api/skills/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: skill.id, credentials }),
      });

      if (!vaultRes.ok) throw new Error('Failed to save to vault');

      // 2. Inject into .env file if toggled on and doc fields are available
      if (injectToEnv && doc && doc.fields.length > 0) {
        const envVars: Record<string, string> = {};
        for (const field of doc.fields) {
          if (credentials[field.fieldName]) {
            envVars[field.envVar] = credentials[field.fieldName];
          }
        }
        if (Object.keys(envVars).length > 0) {
          await fetch('/api/env/inject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vars: envVars }),
          });
          // Refresh env status
          const envKeys = doc.fields.map((f) => f.envVar).join(',');
          const statusRes = await fetch(`/api/env/inject?keys=${envKeys}`);
          const statusData = await statusRes.json();
          setEnvStatus(statusData.configured || {});
        }
      }

      setIsSaved(true);
      setTestResult({ status: 'success', message: 'Credentials saved securely to vault.' });
      setTimeout(() => { onAuthUpdate(); onClose(); }, 1500);
    } catch {
      setTestResult({ status: 'error', message: 'Failed to save credentials. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = async () => {
    if (confirm(`Clear authentication for ${skill.name}?`)) {
      setIsLoading(true);
      try {
        await fetch(`/api/skills/auth?slug=${encodeURIComponent(skill.id)}`, { method: 'DELETE' });
        setCredentials({});
        setIsSaved(false);
        onAuthUpdate();
      } catch {
        setTestResult({ status: 'error', message: 'Failed to clear credentials.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const allEnvConfigured = doc
    ? doc.fields.every((f) => envStatus[f.envVar])
    : false;

  const someEnvMissing = doc
    ? doc.fields.some((f) => !envStatus[f.envVar])
    : false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-dark-panel rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-dark-border shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-dark-text">Configure {skill.name}</h2>
          <p className="text-sm text-dark-muted mt-1">
            Enter your authentication credentials. They will be stored securely in your vault.
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* ENV Status Banner */}
          {doc && !envLoading && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
              allEnvConfigured
                ? 'bg-dark-success/10 border-dark-success/30 text-dark-success'
                : someEnvMissing
                ? 'bg-dark-warn/10 border-dark-warn/30 text-dark-warn'
                : 'bg-dark-panel2 border-dark-border text-dark-muted'
            }`}>
              {allEnvConfigured ? (
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                {allEnvConfigured
                  ? 'All environment variables are configured in .env'
                  : 'Some environment variables are missing from .env'}
                {doc && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {doc.fields.map((f) => (
                      <span
                        key={f.envVar}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${
                          envStatus[f.envVar]
                            ? 'bg-dark-success/20 text-dark-success'
                            : 'bg-dark-danger/20 text-dark-danger'
                        }`}
                      >
                        <Terminal className="w-2.5 h-2.5" />
                        {f.envVar}
                        {envStatus[f.envVar] ? ' ✓' : ' ✗'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* How to get this key — collapsible */}
          {doc && (
            <div className="border border-cm-purple/20 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowInstructions((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-cm-purple/10 hover:bg-cm-purple/15 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-cm-purple">
                  <Info className="w-4 h-4" />
                  How to get your {skill.name} API key
                </div>
                {showInstructions ? (
                  <ChevronUp className="w-4 h-4 text-cm-purple" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-cm-purple" />
                )}
              </button>

              {showInstructions && (
                <div className="px-4 py-3 bg-dark-panel2 border-t border-cm-purple/20 space-y-3">
                  <p className="text-sm text-dark-muted">{doc.description}</p>

                  <ol className="space-y-1.5">
                    {doc.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm text-dark-text">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-cm-purple/15 text-cm-purple text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  <a
                    href={doc.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-cm-purple rounded-lg hover:bg-cm-purple/80 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Get API Key →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Auth Type Info (fallback when no doc) */}
          {!doc && (
            <div className="p-3 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
              <p className="text-sm text-cm-purple">
                <strong>Auth Type:</strong> {skill.authType || 'API Key'}
              </p>
            </div>
          )}

          {/* Credential Fields */}
          {authFields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="text-sm font-medium text-dark-text flex items-center gap-2">
                {field.label}
                {field.required && <span className="text-dark-danger">*</span>}
                {field.envVar && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ml-auto ${
                    envStatus[field.envVar]
                      ? 'bg-dark-success/20 text-dark-success'
                      : 'bg-dark-panel2 text-dark-muted'
                  }`}>
                    <Terminal className="w-2.5 h-2.5" />
                    {field.envVar}
                  </span>
                )}
              </label>
              <div className="relative mt-1">
                <input
                  id={field.name}
                  type={field.type === 'password' && !showPasswords[field.name] ? 'password' : 'text'}
                  placeholder={field.placeholder || `Enter ${field.label}`}
                  value={credentials[field.name] || ''}
                  onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple pr-10 font-mono text-sm"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                  >
                    {showPasswords[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Inject to .env toggle */}
          {doc && (
            <label className="flex items-start gap-3 p-3 border border-dark-border rounded-lg cursor-pointer hover:bg-dark-panel2">
              <input
                type="checkbox"
                checked={injectToEnv}
                onChange={(e) => setInjectToEnv(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-dark-border text-cm-purple"
              />
              <div>
                <p className="text-sm font-medium text-dark-text">Also inject into .env file</p>
                <p className="text-xs text-dark-muted mt-0.5">
                  Writes variables to <code className="bg-dark-panel2 px-1 rounded">~/.openclaw/workspace/.env</code> so agents can read them directly.
                </p>
              </div>
            </label>
          )}

          {/* Test Result */}
          {testResult.status && (
            <div className={`p-3 rounded-lg border ${
              testResult.status === 'success'
                ? 'bg-dark-success/10 border-dark-success/30'
                : 'bg-dark-danger/10 border-dark-danger/30'
            }`}>
              <div className={`text-sm ${testResult.status === 'success' ? 'text-dark-success' : 'text-dark-danger'}`}>
                {testResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-dark-border rounded-lg hover:bg-dark-panel2 text-sm font-medium text-dark-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCredentials}
            disabled={isLoading || authFields.filter((f) => f.required).some((f) => !credentials[f.name])}
            className="flex-1 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:bg-dark-panel2 disabled:text-dark-muted text-sm font-medium flex items-center justify-center gap-2"
          >
            {isSaved ? (
              <><Check className="w-4 h-4" /> Saved</>
            ) : isLoading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              'Save Credentials'
            )}
          </button>
        </div>

        {/* Clear Auth Link */}
        <div className="pt-4 border-t border-dark-border text-center">
          <button
            onClick={handleClearAuth}
            disabled={isLoading}
            className="text-xs text-dark-muted hover:text-dark-danger underline"
          >
            Clear stored credentials
          </button>
        </div>
      </div>
    </div>
  );
}
