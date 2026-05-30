'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { type Locale } from '@/config/site-config';
import { handleAnchorClick } from '@/lib/scroll';
import { getAnchorPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface AnchorLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  locale: Locale;
  sectionId?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function AnchorLink({
  href,
  children,
  className = '',
  activeClassName = '',
  locale,
  sectionId,
  onClick,
  ...props
}: AnchorLinkProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  
  // If sectionId is provided, use it to create an anchor link
  const finalHref = sectionId 
    ? getAnchorPath(locale, sectionId, pathname === `/${locale}` || pathname === `/${locale}/`) 
    : href;

  // Check if the current section is active based on scroll position
  useEffect(() => {
    if (!sectionId) return;
    
    const checkActiveSection = () => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      
      const rect = section.getBoundingClientRect();
      const isInView = rect.top <= 100 && rect.bottom >= 100;
      setIsActive(isInView);
    };
    
    window.addEventListener('scroll', checkActiveSection);
    // Check on mount
    checkActiveSection();
    
    return () => window.removeEventListener('scroll', checkActiveSection);
  }, [sectionId]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    
    // If finalHref contains an anchor, handle smooth scrolling
    if (finalHref.includes('#')) {
      handleAnchorClick(e, finalHref);
    }
  };

  return (
    <Link
      href={finalHref}
      className={cn(className, isActive && activeClassName)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
} 