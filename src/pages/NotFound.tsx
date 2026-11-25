import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-ink-700">That page doesn't exist. Try the time card calculator instead.</p>
      <Link to="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-brand-600 px-4 font-semibold text-white">Open the calculator</Link>
    </div>
  );
}
