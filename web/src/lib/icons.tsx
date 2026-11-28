const paths: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  budget: 'M12 3a9 9 0 1 0 9 9h-9V3Z M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6',
  chart: 'M4 20V10m6 10V4m6 16v-7m5 7H3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.700 3h-4l-.3 2.700a7.500 7.500 0 0 0-2 1.200l-2.300-1-2 3.400 2 1.500a7.400 7.400 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-1a7.500 7.500 0 0 0 2 1.200l.3 2.700h4l.3-2.700a7.500 7.500 0 0 0 2-1.200l2.300 1 2-3.400-2-1.500c.1-.4.1-.8.1-1.200Z',
  plus: 'M12 5v14M5 12h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 8.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Z',
  clip: 'm20 11-8.500 8.500a5 5 0 0 1-7-7L13 4a3.500 3.500 0 0 1 5 5l-8.500 8.500a2 2 0 0 1-3-3L14 7',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v3M3 7v11a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1-2-1Zm13 6.500h.01',
  up: 'M7 17 17 7M9 7h8v8',
  down: 'M7 7l10 10M17 9v8H9',
  check: 'm5 12.500 4.500 4.500L19 7.500',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  x: 'M6 6l12 12M18 6 6 18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M5 20h14',
  copy: 'M9 9h11v11H9V9Zm-4 6V4h11',
}

export function Icon({ name, size = 20 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name] ?? ''} />
    </svg>
  )
}
