
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import AboutUs from '@/components/AboutUs';
import Services from '@/components/Services';
import HowICanHelp from '@/components/HowICanHelp';
import SuccessCases from '@/components/SuccessCases';
import FAQ from '@/components/FAQ';
import ConsultationForm from '@/components/ConsultationForm';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <AboutUs />
        <Services />
        <HowICanHelp />
        <SuccessCases />
        <FAQ />
        <ConsultationForm />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
