import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import logo96 from '@/assets/logo-96.webp';
import logo192 from '@/assets/logo-192.webp';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: 'Home', href: '#home' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Serviços', href: '#servicos' },
    { label: 'Casos de Sucesso', href: '#casos-sucesso' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contato', href: '#contato' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="responsive-container">
        <div className="flex h-16 sm:h-18 lg:h-20 items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img
              src={logo96}
              srcSet={`${logo96} 1x, ${logo192} 2x`}
              alt="Vitale Mobilidade - Consultoria em veículos elétricos"
              width={44}
              height={44}
              decoding="async"
              fetchPriority="high"
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11"
            />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary truncate">Vitale Mobilidade</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-3 xl:space-x-6 2xl:space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm lg:text-base font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Mobile Menu */}
          <div className="flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col space-y-6 mt-8">
                  {menuItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
