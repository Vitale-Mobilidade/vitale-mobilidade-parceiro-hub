import { MessageCircle, FileText, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HowICanHelp = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  const steps = [
    {
      icon: MessageCircle,
      title: "Conversa inicial (diagnóstico gratuito)",
      description: "Entendo seus objetivos, experiência atual e expectativas para o mercado de veículos elétricos."
    },
    {
      icon: FileText,
      title: "Plano personalizado",
      description: "Desenvolvo uma estratégia específica para seu perfil, incluindo fornecedores, produtos e modelo de negócio."
    },
    {
      icon: Target,
      title: "Acompanhamento na execução",
      description: "Ofereço suporte durante a implementação, garantindo que cada etapa seja executada corretamente."
    },
    {
      icon: TrendingUp,
      title: "Resultados mensuráveis",
      description: "Acompanho os resultados e ajusto a estratégia conforme necessário para maximizar seu sucesso."
    }
  ];

  return (
    <section id="como-posso-ajudar" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 px-2">
            Como posso <span className="text-gradient-green">te ajudar</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">
            Processo estruturado para garantir seu sucesso no mercado de veículos elétricos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-green rounded-full flex items-center justify-center">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 leading-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100 p-6 sm:p-8 max-w-2xl mx-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-4">
              Pronto para começar?
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              O primeiro passo é uma conversa para entender seus objetivos e mostrar como posso ajudar 
              você a entrar no mercado de veículos elétricos com segurança e resultados.
            </p>
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="bg-gradient-green hover:opacity-90 text-white px-8 py-4 text-base font-semibold"
            >
              Agendar consultoria
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowICanHelp;