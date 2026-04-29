'use client';

import { useState } from 'react';
import { Skill } from '@/lib/skills-types';
import { Lock, Trash2, Loader } from 'lucide-react';
import AuthModal from './auth-modal';

interface SkillCardProps {
  skill: Skill;
  onToggle: (skillId: string, enabled: boolean) => Promise<void>;
  onAuthUpdate: (skillId: string) => void;
  onUninstall: (skillId: string) => Promise<void>;
}

export default function SkillCard({ skill, onToggle, onAuthUpdate, onUninstall }: SkillCardProps) {
  const [isEnabled, setIsEnabled] = useState(skill.status === 'active');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isTogglingLoading, setIsTogglingLoading] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const authStatus = skill.authStatus || 'not-configured';
  const needsAuth = skill.requiresAuth === true;

  const handleToggle = async (checked: boolean) => {
    setIsTogglingLoading(true);
    try {
      if (!checked) {
        setShowDisableConfirm(true);
        setIsTogglingLoading(false);
        return;
      }

      await onToggle(skill.id, checked);
      setIsEnabled(checked);
    } catch (error) {
      console.error('Toggle failed:', error);
      setIsEnabled(!checked);
    } finally {
      setIsTogglingLoading(false);
    }
  };

  const confirmDisable = async () => {
    setIsTogglingLoading(true);
    try {
      await onToggle(skill.id, false);
      setIsEnabled(false);
      setShowDisableConfirm(false);
    } catch (error) {
      console.error('Disable failed:', error);
      setIsEnabled(true);
    } finally {
      setIsTogglingLoading(false);
    }
  };

  const confirmUninstall = async () => {
    setIsUninstalling(true);
    try {
      await onUninstall(skill.id);
    } catch (error) {
      console.error('Uninstall failed:', error);
      setIsUninstalling(false);
      setShowUninstallConfirm(false);
    }
  };

  const getAuthStatusColor = () => {
    switch (authStatus) {
      case 'authenticated':
        return 'text-dark-success';
      case 'expired':
        return 'text-dark-warn';
      case 'not-configured':
        return 'text-dark-danger';
      default:
        return 'text-dark-muted';
    }
  };

  const getAuthStatusText = () => {
    switch (authStatus) {
      case 'authenticated':
        return '✓ Authenticated';
      case 'expired':
        return '⚠ Expired';
      case 'not-configured':
        return '✗ Auth Required';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      <div
        className={`border rounded-lg p-4 transition-all ${
          isEnabled
            ? 'bg-dark-panel border-dark-border hover:border-cm-purple'
            : 'bg-dark-panel2 border-dark-border opacity-60'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-dark-text">{skill.name}</h3>
              <span className="text-xs bg-dark-panel2 px-2 py-1 rounded text-dark-muted">
                {skill.type}
              </span>
            </div>
            <p className="text-sm text-dark-muted line-clamp-2">
              {skill.description}
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 ml-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={isTogglingLoading}
                className="w-5 h-5 rounded border-dark-border text-cm-purple cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Auth Status */}
        {needsAuth && (
          <div className="mb-3 flex items-center justify-between p-2 bg-dark-panel2 rounded">
            <span className={`text-xs font-medium ${getAuthStatusColor()}`}>
              {getAuthStatusText()}
            </span>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1 text-xs bg-dark-panel border border-dark-border rounded hover:bg-dark-panel2 text-dark-text flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              Configure
            </button>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-dark-muted">
          {skill.version && (
            <div>
              <span className="font-medium">Version:</span> {skill.version}
            </div>
          )}
          {skill.installed_date && (
            <div>
              <span className="font-medium">Installed:</span>{' '}
              {new Date(skill.installed_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {skill.docs && (
            <button
              className="px-3 py-1 text-xs bg-dark-panel border border-dark-border rounded hover:bg-dark-panel2 text-dark-text"
              onClick={() => window.open(skill.docs, '_blank')}
            >
              Docs
            </button>
          )}
          {skill.commands && skill.commands.length > 0 && (
            <button className="px-3 py-1 text-xs bg-dark-panel border border-dark-border rounded hover:bg-dark-panel2 text-dark-text">
              Commands
            </button>
          )}

          {/* Spacer to push trash to the right */}
          <div className="flex-1" />

          {/* Uninstall button / inline confirmation */}
          {showUninstallConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-dark-danger font-medium">Remove?</span>
              <button
                onClick={confirmUninstall}
                disabled={isUninstalling}
                className="px-2.5 py-1 text-xs bg-dark-danger text-white rounded hover:opacity-80 disabled:opacity-50 flex items-center gap-1"
              >
                {isUninstalling ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : null}
                {isUninstalling ? 'Removing...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowUninstallConfirm(false)}
                disabled={isUninstalling}
                className="px-2.5 py-1 text-xs border border-dark-border rounded hover:bg-dark-panel2 text-dark-muted disabled:opacity-50"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUninstallConfirm(true)}
              className="p-1.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded transition-colors"
              title="Uninstall skill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          skill={skill}
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthUpdate={() => {
            onAuthUpdate(skill.id);
            setShowAuthModal(false);
          }}
        />
      )}

      {/* Disable Confirmation */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-dark-panel rounded-lg p-6 max-w-sm border border-dark-border shadow-2xl shadow-black/40">
            <h3 className="font-semibold text-lg mb-2 text-dark-text">Disable {skill.name}?</h3>
            <p className="text-sm text-dark-muted mb-4">
              This skill will be disabled and won't run automatically. You can re-enable it
              anytime.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="px-4 py-2 text-sm border border-dark-border rounded hover:bg-dark-panel2 text-dark-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable}
                className="px-4 py-2 text-sm bg-dark-danger text-white rounded hover:opacity-80"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
