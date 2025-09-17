import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Shield, Building, GraduationCap } from 'lucide-react';

const Services = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  const services = [
    {
      icon: Search,
      title: "Diagnóstico de Mercado",
      problem: "Não sabe por onde começar no mercado de veículos elétricos?",
      benefit: "Entendo seus objetivos e traço um plano estratégico personalizado para sua entrada no mercado.",
      description: "Análise completa do seu perfil, região de atuação e objetivos para definir a melhor estratégia de entrada no mercado."
    },
    {
      icon: Shield,
      title: "Avaliação de Fornecedores",
      problem: "Medo de escolher fornecedores não confiáveis?",
      benefit: "Indico players testados e confiáveis, evitando riscos e prejuízos desnecessários.",
      description: "Apresento fornecedores com histórico comprovado, negocio melhores condições e ajudo a evitar armadilhas do mercado."
    },
    {
      icon: Building,
      title: "Estruturação Comercial",
      problem: "Não sabe como montar uma operação de vendas eficiente?",
      benefit: "Estruturo sua operação B2C, B2B ou B2B2C com processos que geram resultados reais.",
      description: "Defino estratégias de vendas, precificação, canais de distribuição e processos comerciais otimizados."
    },
    {
      icon: GraduationCap,
      title: "Treinamento de Equipes",
      problem: "Equipe não tem conhecimento sobre veículos elétricos?",
      benefit: "Capacito lojistas e vendedores com conhecimento prático para vender mais e melhor.",
      description: "Treinamentos práticos sobre produtos, objeções, técnicas de venda e atendimento especializado."
    }
  ];

  return (
    <section id="servicos" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Serviços de <span className="text-gradient-green">Consultoria</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 max-w-3xl mx-auto">
            Soluções estruturadas para você entrar ou expandir no mercado de veículos elétricos com segurança
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow h-full">
              <CardHeader className="bg-gradient-to-br from-green-50 to-white">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <service.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-center">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 flex flex-col h-full">
                <div className="flex-1 space-y-4 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">Problema:</h4>
                    <p className="text-sm text-red-700">{service.problem}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Benefício:</h4>
                    <p className="text-sm text-green-700">{service.benefit}</p>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">{service.description}</p>
                </div>
                
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-gradient-green hover:opacity-90 text-white text-sm sm:text-base py-3"
                >
                  Quero agendar consultoria
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-4xl mx-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4">
              Consultoria Personalizada
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Cada negócio é único. Por isso, ofereço consultorias personalizadas que se adaptam às suas necessidades específicas, 
              combinando os serviços acima conforme seu perfil e objetivos.
            </p>
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="bg-gradient-green hover:opacity-90 text-white px-8 py-4 text-base font-semibold"
            >
              Agende uma consultoria gratuita
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;