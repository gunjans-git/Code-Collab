export default function HangingLeaves() {
  return (
    <svg
      viewBox="0 0 300 300"
      className="absolute top-0 right-10 opacity-25 hanging-leaves"
    >
      <line x1="60" y1="0" x2="60" y2="150" stroke="#7A8B5A" />
      <ellipse cx="60" cy="170" rx="22" ry="10" fill="#7A8B5A" />

      <line x1="150" y1="0" x2="150" y2="210" stroke="#7A8B5A" />
      <ellipse cx="150" cy="230" rx="22" ry="10" fill="#7A8B5A" />

      <line x1="240" y1="0" x2="240" y2="120" stroke="#7A8B5A" />
      <ellipse cx="240" cy="140" rx="22" ry="10" fill="#7A8B5A" />
    </svg>
  );
}