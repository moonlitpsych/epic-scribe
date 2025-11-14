import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with client-side dependencies
const DEPresentationPage = dynamic(
  () => import('./DEPresentationPage'),
  {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-screen">Loading...</div>
  }
);

export default function Page() {
  return <DEPresentationPage />;
}