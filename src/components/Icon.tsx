const paths: Record<string, string> = {
  overview: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z',
  ask: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  board: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z',
  review: 'M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11',
  published: 'M4 5h16M4 10h16M4 15h10M4 20h7',
  budget: 'M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6',
  people:
    'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  chain:
    'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert:
    'M12 8v5M12 16.5v.01M10.3 3.9L2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 18l-6-6 6-6',
  forward: 'M9 18l6-6-6-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  auto: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  play: 'M7 4.5v15l12-7.5z',
  info: 'M12 11v5M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  lock: 'M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  pause: 'M8 5v14M16 5v14',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  laptop: 'M4 6h16v10H4zM2 19h20',
  plug: 'M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4',
  scale: 'M12 4v16M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0zM8 20h8',
  tour: 'M3 11l18-8-8 18-2-8z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  missions: 'M4 6h11M4 12h16M4 18h8M18 4l2 2-2 2M15 16l2 2-2 2',
  council: 'M12 3l9 4H3zM5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  trend: 'M3 17l6-6 4 4 7-8M15 7h5v5',
  stop: 'M8 3h8l5 5v8l-5 5H8l-5-5V8zM9 9h6v6H9z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d={paths[name]} />
    </svg>
  );
}
