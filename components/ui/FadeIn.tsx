import { ReactNode, CSSProperties } from 'react';

type Tag = 'div' | 'header' | 'article' | 'aside' | 'section' | 'p';

interface FadeInProps {
  as?: Tag;
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}

/* Kept as a plain wrapper: the hero's opening is the site's only entrance, so
   sections no longer fade in as they scroll into view. */
export function FadeIn({ as: Tag = 'div', children, className, style }: FadeInProps) {
  return <Tag className={className} style={style}>{children}</Tag>;
}
