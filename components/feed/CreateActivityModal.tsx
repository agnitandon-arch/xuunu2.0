'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { createActivity } from '@/lib/firebase/firestore';
import { uploadActivityPhoto } from '@/lib/firebase/storage';
import type { ActivityType } from '@/types';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivityCreated: () => void;
}

const activityOptions = [
  { value: 'run', label: 'Run' },
  { value: 'walk', label: 'Walk' },
  { value: 'bike', label: 'Bike' },
  { value: 'strength', label: 'Strength' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'swim', label: 'Swim' },
  { value: 'other', label: 'Other' },
];

export function CreateActivityModal({
  isOpen,
  onClose,
  onActivityCreated,
}: CreateActivityModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Upload photos
      const photoUrls: string[] = [];
      const tempActivityId = `temp_${Date.now()}`;

      for (const photo of photos) {
        const url = await uploadActivityPhoto(tempActivityId, photo);
        photoUrls.push(url);
      }

      // Create activity
      await createActivity({
        userId: user.uid,
        activityType,
        title,
        description,
        durationMinutes: parseInt(duration) || 0,
        distanceMiles: distance ? parseFloat(distance) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        photos: photoUrls,
        metrics: {},
        healthContext: {},
        likeCount: 0,
        commentCount: 0,
        visibility: 'public',
      });

      onActivityCreated();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setDuration('');
    setDistance('');
    setCalories('');
    setPhotos([]);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close create activity modal"
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold">Log Activity</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">
              Activity Type
            </label>
            <select
              value={activityType}
              onChange={(e) =>
                setActivityType(e.target.value as ActivityType)
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Morning run around the park"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How did it feel?"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Duration (min)
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Distance (mi)
              </label>
              <input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Calories
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted">Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
            {photos.length > 0 ? (
              <div className="flex items-center justify-between text-sm text-muted">
                <span>{photos.length} photo(s) selected</span>
                <button
                  type="button"
                  onClick={() => setPhotos([])}
                  className="text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="text-muted hover:text-foreground"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-3"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
