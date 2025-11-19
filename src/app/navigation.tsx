import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01';
import { AudioLines } from 'lucide-react';

const Navbar = () => {
  const navigationLinks = [
    { href: '/swipe', label: 'Swipe', active: true },
    { href: '/playlists', label: 'Playlists' },
    { href: '/dashboard', label: 'Dashboard' },
  ];
  return (
    <div className="flex flex-col w-full h-max">
      <Navbar01 className="" logo=<AudioLines /> logoHref="" navigationLinks={navigationLinks} signInText="" ctaText="" ctaHref="" />
    </div>
  )
}

export default Navbar;
