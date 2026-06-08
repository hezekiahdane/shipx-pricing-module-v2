import { siteConfig } from '@/lib/core/config/site';

export default function Footer() {
  return (
    <footer className="border-t px-6 py-4">
      <p className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} InfiGroup &middot; {siteConfig.name}
      </p>
    </footer>
  );
}
