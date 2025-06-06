
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { items } = useCart();
  
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Catálogo', href: '#catalogo' },
    { name: 'Consultoria', href: '#consultoria' },
    { name: 'Calculadora', href: '#calculadora' },
    { name: 'Seja Revendedor', href: '#seja-revendedor' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-green rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-xl font-bold text-primary">Vitale Mobilidade</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Cart Button */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            className="relative"
            onClick={() => document.getElementById('carrinho')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-4 mt-8">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-lg font-medium text-gray-700 hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
