import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01';
import { Music } from 'lucide-react';

const Navbar = () => {
  const navigationLinks = [
    { href: '/', label: 'Home', active: true },
    { href: '/create', label: 'Share Music' },
  ];
  return (
    <div className="flex flex-col w-full h-max">
      <Navbar01 className="" logo={<Music />} logoHref="/" navigationLinks={navigationLinks} signInText="" ctaText="" ctaHref="" />
    </div>
  )
}

export default Navbar;
