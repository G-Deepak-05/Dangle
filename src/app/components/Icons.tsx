import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
  </Icon>
);

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 3 5 8l5 5" />
  </Icon>
);

export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 3 5 5-5 5" />
  </Icon>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5Z" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v10M3 8h10" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 10.5V2.5M5 5.5l3-3 3 3M3 10.5v2.5h10v-2.5" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 3.5v9M10.5 3.5v9" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 3.2v9.6L12.5 8Z" fill="currentColor" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3.5M8 11h0" />
  </Icon>
);

/** Tiny preview of each string style for the rope picker. */
export function RopeSwatch({ style }: { style: "minimal" | "thread" | "cord" | "chain" }) {
  const path = "M3 2 C 5 7, 11 7, 13 12";
  return (
    <svg width="28" height="14" viewBox="0 0 16 14" aria-hidden="true">
      {style === "minimal" && <path d={path} stroke="currentColor" strokeWidth="0.8" fill="none" />}
      {style === "thread" && <path d={path} stroke="#C8412B" strokeWidth="1.4" fill="none" />}
      {style === "cord" && (
        <>
          <path d={path} stroke="#5B4638" strokeWidth="2.6" fill="none" />
          <path d={path} stroke="#B99D84" strokeWidth="1.1" strokeDasharray="1.4 1.4" fill="none" />
        </>
      )}
      {style === "chain" && (
        <path d={path} stroke="#C9A04D" strokeWidth="2" strokeDasharray="2 1.2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
