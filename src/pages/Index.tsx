
import { Helmet } from 'react-helmet-async';
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "O que faz a Vitale Mobilidade?", "acceptedAnswer": { "@type": "Answer", "text": "Somos uma consultoria estratégica em veículos elétricos que ajuda empresas e empreendedores a escolher fornecedores confiáveis, estruturar operações comerciais B2B e B2C e crescer com segurança no mercado de mobilidade elétrica." } },
    { "@type": "Question", "name": "Quem pode contratar a consultoria?", "acceptedAnswer": { "@type": "Answer", "text": "Empreendedores que querem entrar no mercado de veículos elétricos, lojistas, distribuidores, frotistas e empresas que desejam estruturar ou expandir uma operação no setor." } },
    { "@type": "Question", "name": "A consultoria atende em todo o Brasil?", "acceptedAnswer": { "@type": "Answer", "text": "Sim. Atendemos clientes em todo o território nacional, com experiência consolidada em grandes centros urbanos e expansão para diferentes regiões." } },
    { "@type": "Question", "name": "Como funciona o primeiro contato?", "acceptedAnswer": { "@type": "Answer", "text": "O primeiro contato é uma conversa de diagnóstico via WhatsApp para entender seus objetivos, perfil de negócio e expectativas, antes de propor um plano personalizado." } },
    { "@type": "Question", "name": "A Vitale Mobilidade vende veículos elétricos?", "acceptedAnswer": { "@type": "Answer", "text": "Não. Atuamos exclusivamente como consultoria estratégica. Indicamos fornecedores testados e ajudamos a estruturar a operação, mas não comercializamos veículos." } },
    { "@type": "Question", "name": "Quais áreas a consultoria cobre?", "acceptedAnswer": { "@type": "Answer", "text": "Diagnóstico de mercado, avaliação e curadoria de fornecedores, estruturação comercial B2B/B2C/B2B2C, precificação, canais de distribuição e treinamento de equipes." } },
    { "@type": "Question", "name": "Quanto tempo dura uma consultoria?", "acceptedAnswer": { "@type": "Answer", "text": "Depende do escopo. Existem desde diagnósticos pontuais até acompanhamentos contínuos durante a implementação da estratégia, ajustados ao perfil de cada cliente." } },
    { "@type": "Question", "name": "Como agendar uma consultoria?", "acceptedAnswer": { "@type": "Answer", "text": "O agendamento é feito diretamente pelo WhatsApp (11) 98689-3890. Basta enviar uma mensagem informando seu objetivo para receber o retorno e iniciar o diagnóstico." } }
  ]
};

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Vitale Mobilidade | Consultoria em Veículos Elétricos</title>
        <meta name="description" content="Consultoria estratégica em veículos elétricos: escolha fornecedores confiáveis, estruture operações B2B/B2C e cresça com segurança no Brasil." />
        <link rel="canonical" href="https://vitalemobilidade.com/" />
        <meta property="og:url" content="https://vitalemobilidade.com/" />
        <meta property="og:title" content="Vitale Mobilidade | Consultoria em Veículos Elétricos" />
        <meta property="og:description" content="Consultoria estratégica em veículos elétricos. Fornecedores confiáveis, operações B2B/B2C e crescimento seguro." />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

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
