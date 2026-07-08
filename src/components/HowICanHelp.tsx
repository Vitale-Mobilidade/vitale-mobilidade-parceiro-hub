import { MessageCircle, FileText, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HowICanHelp = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511998693904?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
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
    <section id="como-posso-ajudar" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 bg-background">
      <div className="responsive-container">
        <div className="max-w-5xl mx-auto text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-4 sm:mb-6 lg:mb-8">
            Como posso <span className="text-gradient-green">te ajudar</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground">
            Processo estruturado para garantir seu sucesso no mercado de veículos elétricos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 max-w-6xl mx-auto mb-12 sm:mb-16 lg:mb-20">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4 sm:space-x-5 p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-green-50 to-background rounded-xl border border-green-100 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-green rounded-full flex items-center justify-center">
                  <step.icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-3 lg:mb-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 bg-primary text-white rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 lg:mr-4">
                    {index + 1}
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-foreground leading-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-gradient-to-br from-green-50 to-background rounded-2xl border border-green-100 p-8 sm:p-10 lg:p-12 max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 lg:mb-6">
              Pronto para começar?
            </h3>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground mb-6 lg:mb-8">
              O primeiro passo é uma conversa para entender seus objetivos e mostrar como posso ajudar 
              você a entrar no mercado de veículos elétricos com segurança e resultados.
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

export default HowICanHelp;
