/**
 * OfferEditor Component
 * 
 * Main component for creating and editing company job offers.
 * Works with draft IDs directly - loads specific draft by ID.
 * Handles auto-save and publishing.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfferDraftData, CompanyOfferDraft } from '@/lib/shared/types';
import BasicInfoForm from './components/BasicInfoForm';
import CompensationForm from './components/CompensationForm';
import RoleRequirementsForm from './components/RoleRequirementsForm';

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
  const loadDraft = useCallback(async () => {
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
        seniority: loadedDraft.seniority,
        skills: loadedDraft.skills || [],
        locations: loadedDraft.locations || [],
        responsibilities: loadedDraft.responsibilities || [],
        capabilities: loadedDraft.capabilities || [],
        questions: loadedDraft.questions || [],
        perks: loadedDraft.perks || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft');
      console.error('Load draft error:', err);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

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
    } catch (err) {
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
    } catch {
      setError('Failed to save draft');
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft || !data) return;

    // Validate required fields
    if (!data.basic_info.position_name || data.basic_info.position_name.trim() === '') {
      setError('Position name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Save draft first to ensure latest data
      await saveDraft(data);

      console.log('Publishing draft:', draft.id);

      // Call publish API
      const res = await fetch('/api/company/offer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to publish offer');
      }

      const { offer_id } = await res.json();
      console.log('Successfully published offer:', offer_id);

      // Close editor and return to list (which will show published offer)
      onClose();
    } catch (err) {
      console.error('Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish offer');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted">Loading offer editor...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-error-subtle/30 border border-error rounded-lg">
        <p className="text-error">{error}</p>
        <button
          onClick={loadDraft}
          className="mt-2 text-error underline hover:text-error"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-default">
          {draft?.offer_id ? 'Edit Offer' : 'Create New Offer'}
        </h2>
        {lastSaved && (
          <p className="text-sm text-muted">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
        {saving && (
          <p className="text-sm text-muted">Saving...</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-error-subtle/30 border border-error rounded-lg">
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <BasicInfoForm
            data={data.basic_info}
            onChange={(value) => handleDataChange('basic_info', value)}
            locations={data.locations}
            onLocationsChange={(value) => handleDataChange('locations', value)}
            remoteMode={data.work_config.remote_mode}
            onRemoteModeChange={(value) => handleDataChange('work_config', { ...data.work_config, remote_mode: value })}
            employmentType={data.work_config.employment_type}
            onEmploymentTypeChange={(value) => handleDataChange('work_config', { ...data.work_config, employment_type: value })}
            availability={data.work_config.availability}
            onAvailabilityChange={(value) => handleDataChange('work_config', { ...data.work_config, availability: value })}
            seniority={data.seniority}
            onSeniorityChange={(value) => handleDataChange('seniority', value)}
          />
        </div>


        {/* Compensation and Benefits */}
        <div className="space-y-4">
          <CompensationForm
            data={data.compensation}
            onChange={(value) => handleDataChange('compensation', value)}
            perks={data.perks}
            onPerksChange={(value) => handleDataChange('perks', value)}
          />
        </div>


        {/* Role Requirements */}
        <div className="space-y-4">
          <RoleRequirementsForm
            skills={data.skills}
            onSkillsChange={(value) => handleDataChange('skills', value)}
            responsibilities={data.responsibilities}
            onResponsibilitiesChange={(value) => handleDataChange('responsibilities', value)}
            capabilities={data.capabilities}
            onCapabilitiesChange={(value) => handleDataChange('capabilities', value)}
            questions={data.questions}
            onQuestionsChange={(value) => handleDataChange('questions', value)}
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex justify-end gap-3 pb-8">
        <button
          onClick={handleSaveDraftAndClose}
          disabled={saving}
          className="px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors disabled:opacity-50 font-medium"
        >
          Save Draft
        </button>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg disabled:opacity-50 transition-opacity font-medium"
        >
          Publish Offer
        </button>
      </div>
    </div>
  );
}
