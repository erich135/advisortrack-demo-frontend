import logoOnDark from '../assets/brand/logo-on-dark.svg';
import logoOnLight from '../assets/brand/logo-on-light.svg';

export function BrandLogo({
  variant,
  className,
}: {
  variant: 'on-dark' | 'on-light';
  className?: string;
}) {
  return (
    <img
      className={className}
      src={variant === 'on-dark' ? logoOnDark : logoOnLight}
      alt="AdvisorTrack"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    />
  );
}
