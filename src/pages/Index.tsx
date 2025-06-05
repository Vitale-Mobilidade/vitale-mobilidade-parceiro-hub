
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCatalog from '@/components/ProductCatalog';
import Cart from '@/components/Cart';
import ResellerForm from '@/components/ResellerForm';
import BusinessModel from '@/components/BusinessModel';
import Testimonials from '@/components/Testimonials';
import WhyResell from '@/components/WhyResell';
import PartnerArea from '@/components/PartnerArea';
import Calculator from '@/components/Calculator';
import Footer from '@/components/Footer';
import { CartProvider } from '@/hooks/useCart';

const Index = () => {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <Header />
        <Hero />
        <ProductCatalog />
        <Cart />
        <ResellerForm />
        <BusinessModel />
        <Testimonials />
        <WhyResell />
        <PartnerArea />
        <Calculator />
        <Footer />
      </div>
    </CartProvider>
  );
};

export default Index;
