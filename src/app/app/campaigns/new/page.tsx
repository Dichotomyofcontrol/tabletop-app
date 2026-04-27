import Link from 'next/link';
import { createCampaign } from '@/app/app/actions';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewCampaignPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <div className="max-w-xl">
      <Link
        href="/app"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4 mb-6">
        New campaign
      </h1>

      {params.error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {params.error}
        </p>
      )}

      <form action={createCampaign} className="space-y-4">
        <Field label="Name" name="name" required placeholder="Curse of Strahd" />
        <Field
          label="Description"
          name="description"
          textarea
          placeholder="Optional — pitch line, tone, expectations"
        />
        <Field label="System" name="system" placeholder="D&D 5e, Pathfinder 2e, …" />
        <Field label="Venue" name="venue" placeholder="TPK Brewing, my place, online" />

        <div className="pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-md bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium"
          >
            Create campaign
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  textarea,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const cls =
    'mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50';
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          rows={3}
          className={cls}
        />
      ) : (
        <input
          type="text"
          name={name}
          required={required}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  );
}
