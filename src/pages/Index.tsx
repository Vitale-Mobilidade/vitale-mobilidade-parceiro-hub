
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import AboutUs from '@/components/AboutUs';
import Services from '@/components/Services';
import HowICanHelp from '@/components/HowICanHelp';
import SuccessCases from '@/components/SuccessCases';
import ConsultationForm from '@/components/ConsultationForm';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <AboutUs />
      <Services />
      <HowICanHelp />
      <SuccessCases />
      <ConsultationForm />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
