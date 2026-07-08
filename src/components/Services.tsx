import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Shield, Building, GraduationCap } from 'lucide-react';

const Services = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511998693904?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
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
    <section id="servicos" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 bg-muted/50">
      <div className="responsive-container">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-4 sm:mb-6">
            Serviços de <span className="text-gradient-green">Consultoria</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto">
            Soluções estruturadas para você entrar ou expandir no mercado de veículos elétricos com segurança
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow h-full border-border">
              <CardHeader className="bg-gradient-to-br from-green-50 to-background pb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-5">
                  <service.icon className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 lg:p-10 flex flex-col h-full">
                <div className="flex-1 space-y-4 lg:space-y-5 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 lg:p-5">
                    <h4 className="font-semibold text-red-800 mb-2 text-sm lg:text-base">Problema:</h4>
                    <p className="text-sm lg:text-base text-red-700">{service.problem}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 lg:p-5">
                    <h4 className="font-semibold text-green-800 mb-2 text-sm lg:text-base">Benefício:</h4>
                    <p className="text-sm lg:text-base text-green-700">{service.benefit}</p>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">{service.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 sm:mt-16 lg:mt-20">
          <div className="bg-background rounded-2xl shadow-lg p-8 sm:p-10 lg:p-12 max-w-5xl mx-auto border border-border">
            <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 lg:mb-6">
              Consultoria Personalizada
            </h3>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground mb-6 lg:mb-8 max-w-3xl mx-auto">
              Cada negócio é único. Por isso, ofereço consultorias personalizadas que se adaptam às suas necessidades específicas, 
              combinando os serviços acima conforme seu perfil e objetivos.
            </p>
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="bg-gradient-green hover:opacity-90 text-white px-8 sm:px-10 lg:px-12 py-4 sm:py-5 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Agendar consultoria
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
