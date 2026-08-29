import type { SVGProps } from 'react';

// Minimal lucide-style stroke icons — crisp at any size, currentColor.
const paths: Record<string, React.ReactNode> = {
  overview: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="1" />
      <rect x="12" y="8" width="3" height="10" rx="1" />
      <rect x="17" y="5" width="3" height="13" rx="1" />
    </>
  ),
  transactions: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  review: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" />
    </>
  ),
  keywords: (
    <>
      <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  subscriptions: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  parsers: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 7H8a2 2 0 0 0 0 10h13a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
      <circle cx="16" cy="12" r="1" />
    </>
  ),
  income: (
    <>
      <path d="M12 3v14" />
      <path d="m6 11 6 6 6-6" />
      <path d="M5 21h14" />
    </>
  ),
  piggy: (
    <>
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 1 3.4 2.5 4.5V19a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-.5c1 .2 2 .3 3 .3s2-.1 3-.3V19a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2.4c.7-.5 1.3-1.2 1.7-2H21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-.5c-.3-.7-.7-1.3-1.2-1.8V5Z" />
      <path d="M2 9v1c0 1.1.9 2 2 2h1" />
      <path d="M16 11h.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  budget: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5a2 2 0 0 1 2-1.5h2a1.8 1.8 0 0 1 .3 3.6l-2.6.8a1.8 1.8 0 0 0 .3 3.6h2a2 2 0 0 0 2-1.5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

export default function Icon({ name, size = 18, ...props }: { name: keyof typeof paths | string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {paths[name] ?? null}
    </svg>
  );
}
