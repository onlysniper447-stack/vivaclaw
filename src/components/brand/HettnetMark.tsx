export function HettnetMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Hettnet"
    >
      <title>Hettnet</title>
      <rect width="48" height="48" rx="14" fill="#111111" />
      <rect x="1" y="1" width="46" height="46" rx="13" stroke="#2B313B" strokeWidth="1.5" />
      <rect x="11" y="10" width="8" height="28" rx="3" fill="#F5F5F5" />
      <rect x="29" y="10" width="8" height="12" rx="3" fill="#F5F5F5" />
      <rect x="29" y="26" width="8" height="12" rx="3" fill="#F5F5F5" />
      <rect x="13" y="20" width="22" height="8" rx="3" fill="#FFB81C" />
    </svg>
  );
}
