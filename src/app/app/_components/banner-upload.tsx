'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadCampaignBanner, removeCampaignBanner } from '../actions';
import { useToast } from './toast';

export default function BannerUpload({ campaignId, currentUrl }: {
  campaignId: string;
  currentUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const toast = useToast();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    fd.set('banner', file);
    startTransition(async () => {
      try {
        await uploadCampaignBanner(fd);
        toast('Banner updated.');
      } catch (e) {
        setPreview(currentUrl);
        toast(e instanceof Error ? e.message : 'Could not upload', 'error');
      }
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  function handleRemove() {
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    setPreview(null);
    startTransition(async () => {
      try { await removeCampaignBanner(fd); toast('Banner removed.'); }
      catch (e) { setPreview(currentUrl); toast(e instanceof Error ? e.message : 'Could not remove', 'error'); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden border border-white/[0.07] bg-zinc-950/50 aspect-[3/1]">
        {preview ? (
          <Image src={preview} alt="Campaign banner" fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            No banner yet
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-sm text-zinc-300">
            Uploading…
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={pending}
          className="btn-ghost text-sm">
          {preview ? 'Replace banner' : 'Upload banner'}
        </button>
        {preview && (
          <button type="button" onClick={handleRemove} disabled={pending} className="btn-danger text-sm">
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500">PNG or JPG. Wide images (3:1) work best. Max 6 MB.</p>
    </div>
  );
}
