import Link from 'next/link';
import { IconAlert } from '@/lib/ui-icons';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ambient flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-8 max-w-sm text-center space-y-4 animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400">
          <IconAlert size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">404</h2>
          <p className="text-sm text-neutral-400">
            This page doesn&apos;t exist. Maybe the address in the URL is invalid.
          </p>
        </div>
        <Link
          href="/"
          className="btn-primary inline-block w-full rounded-xl py-3 text-sm font-medium text-center"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
