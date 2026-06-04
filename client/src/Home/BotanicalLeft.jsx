export default function BotanicalLeft() {
  return (
    <svg
      viewBox="0 0 300 1200"
      className="absolute left-0 top-0 h-full opacity-20"
      fill="none"
    >
      <path
        d="M120 0 C200 200, 60 400, 180 650 C260 850, 100 1050, 180 1200"
        stroke="#7A8B5A"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {[
        [150,120],
        [90,220],
        [180,320],
        [90,450],
        [190,580],
        [110,720],
        [190,860],
        [120,1020],
      ].map(([x,y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="32"
          ry="14"
          fill="#7A8B5A"
          transform={`rotate(${i % 2 ? -35 : 35} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}