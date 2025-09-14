import { cn } from '@/lib/utils';

export function LoadingLogo() {
  return (
    <div className='min-h-screen flex items-center justify-center overflow-visible'>
      <span className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] md:leading-[1.1] py-8 whitespace-nowrap bg-clip-text text-transparent shimmer-text [text-shadow:0_0_1px_rgba(0,0,0,0.04)]">DriftLog</span>

      <style jsx>{`
        .shimmer-text {
          background-image: linear-gradient(
            90deg,
            var(--foreground) 0%,
            var(--primary) 50%,
            var(--foreground) 100%
          );
          background-size: 200% 100%;
          background-position: 0% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer-move 2.2s ease-in-out infinite;
        }

        @keyframes shimmer-move {
          0% { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
      `}</style>
    </div>
  );
}


