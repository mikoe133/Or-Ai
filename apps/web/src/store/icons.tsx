export type IconName = 'search' | 'search-star' | 'grid' | 'code' | 'users' | 'partnership' | 'bag' | 'file' | 'bookmark' | 'help' | 'heart' | 'briefcase' | 'sparkles' | 'smile' | 'arrow' | 'chevron' | 'plus' | 'moon' | 'user' | 'headphones' | 'clock' | 'home' | 'game' | 'report' | 'profile';

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <span className="store-icon" style={{ width: size, height: size }} aria-hidden="true">
    <img src={`/assets/store/icons/${name}.svg`} alt="" width="24" height="24" style={{ transform: `scale(${size / 24})` }} />
  </span>;
}
