/**
 * OfferEditor Component
 * 
 * Main component for creating and editing company job offers.
 * Works with draft IDs directly - loads specific draft by ID.
 * Handles auto-save and publishing.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfferDraftData, CompanyOfferDraft } from '@/lib/types';
import BasicInfoForm from './components/BasicInfoForm';
import CompensationForm from './components/CompensationForm';
import WorkConfigForm from './components/WorkConfigForm';
import SkillsInput from './components/SkillsInput';
import ResponsibilitiesInput from './components/ResponsibilitiesInput';
import CapabilitiesInput from './components/CapabilitiesInput';
import QuestionsInput from './components/QuestionsInput';
import PerksInput from './components/PerksInput';

interface OfferEditorProps {
  draftId: string; // The specific draft to edit
  onClose: () => void; // Called when user closes editor (cancel or after publish)
}

export default function OfferEditor({ draftId, onClose }: OfferEditorProps) {
  const [draft, setDraft] = useState<CompanyOfferDraft | null>(null);
  const [data, setData] = useState<OfferDraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the specific draft by ID
  useEffect(() => {
    loadDraft();
  }, [draftId]);

  const loadDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/company/offer/draft/${draftId}`);
      if (!res.ok) throw new Error('Failed to load draft');

      const { draft: loadedDraft } = await res.json();
      setDraft(loadedDraft);
      setData({
        basic_info: loadedDraft.basic_info,
        compensation: loadedDraft.compensation,
        work_config: loadedDraft.work_config,
        startup_signals: loadedDraft.startup_signals,
        skills: loadedDraft.skills || [],
        locations: loadedDraft.locations || [],
        responsibilities: loadedDraft.responsibilities || [],
        capabilities: loadedDraft.capabilities || [],
        questions: loadedDraft.questions || [],
        perks: loadedDraft.perks || [],
      });
    } catch (err: any) {
      setError(err.message);
      console.error('Load draft error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save function
  const saveDraft = useCallback(async (updatedData: OfferDraftData) => {
    if (!draft) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/company/offer/draft/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error('Failed to save draft');

      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Save error:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [draft]);

  // Debounced auto-save
  useEffect(() => {
    if (!data || loading) return;

    const timeout = setTimeout(() => {
      saveDraft(data);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeout);
  }, [data, loading, saveDraft]);

  const handleDataChange = <K extends keyof OfferDraftData>(
    field: K,
    value: OfferDraftData[K]
  ) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleSaveDraftAndClose = async () => {
    if (!data) return;
    
    try {
      setSaving(true);
      await saveDraft(data);
      onClose();
    } catch (err: any) {
      setError('Failed to save draft');
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft || !data) return;

    // TODO: Implement validation
    if (!data.basic_info.position_name) {
      setError('Position name is required');
      return;
    }

    try {
      setSaving(true);
      // TODO: Call publish RPC function
      console.log('Publishing offer:', data);
      // For now, just save
      await saveDraft(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">Loading offer editor...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadDraft}
          className="mt-2 text-red-700 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {draft?.offer_id ? 'Edit Offer' : 'Create New Offer'}
        </h2>
        {lastSaved && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
        {saving && (
          <p className="text-sm text-blue-600 dark:text-blue-400">Saving...</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <BasicInfoForm
            data={data.basic_info}
            onChange={(value) => handleDataChange('basic_info', value)}
            locations={data.locations}
            onLocationsChange={(value) => handleDataChange('locations', value)}
            remoteMode={data.work_config.remote_mode}
            onRemoteModeChange={(value) => handleDataChange('work_config', { ...data.work_config, remote_mode: value })}
            employmentType={data.work_config.employment_type}
            onEmploymentTypeChange={(value) => handleDataChange('work_config', { ...data.work_config, employment_type: value })}
          />
        </section>

        {/* Compensation */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <CompensationForm
            data={data.compensation}
            onChange={(value) => handleDataChange('compensation', value)}
          />
        </section>

        {/* Work Configuration */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <WorkConfigForm
            data={data.work_config}
            onChange={(value) => handleDataChange('work_config', value)}
          />
        </section>

        {/* Skills */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <SkillsInput
            skills={data.skills}
            onChange={(value) => handleDataChange('skills', value)}
          />
        </section>

        {/* Responsibilities */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <ResponsibilitiesInput
            responsibilities={data.responsibilities}
            onChange={(value) => handleDataChange('responsibilities', value)}
          />
        </section>

        {/* Capabilities */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <CapabilitiesInput
            capabilities={data.capabilities}
            onChange={(value) => handleDataChange('capabilities', value)}
          />
        </section>

        {/* Screening Questions */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <QuestionsInput
            questions={data.questions}
            onChange={(value) => handleDataChange('questions', value)}
          />
        </section>

        {/* Perks */}
        <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <PerksInput
            perks={data.perks}
            onChange={(value) => handleDataChange('perks', value)}
          />
        </section>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex justify-end gap-2 pb-8">
        <button
          onClick={handleSaveDraftAndClose}
          disabled={saving}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Publish Offer
        </button>
      </div>
    </div>
  );
}
