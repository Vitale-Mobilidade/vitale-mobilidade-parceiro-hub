
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import ProductCatalog from '@/components/ProductCatalog';
import ProfitCalculator from '@/components/ProfitCalculator';
import ResellerForm from '@/components/ResellerForm';
import Testimonials from '@/components/Testimonials';
import WhyResell from '@/components/WhyResell';
import Consultoria from '@/components/Consultoria';
import Calculator from '@/components/Calculator';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <HowItWorks />
      <ProductCatalog />
      <ProfitCalculator />
      <ResellerForm />
      <Testimonials />
      <WhyResell />
      <Consultoria />
      <Calculator />
      <Footer />
    </div>
  );
};

export default Index;
