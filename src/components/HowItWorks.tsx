
import { CheckCircle, Package, TrendingUp, Handshake, Users } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: Package,
      title: "Você escolhe os modelos do nosso portfólio",
      description: "Veículos elétricos com pronta entrega e alta demanda no mercado"
    },
    {
      icon: TrendingUp,
      title: "Compra direto da Vitale com margem de até 50%",
      description: "Preços de distribuidora com margens que garantem lucratividade real"
    },
    {
      icon: Users,
      title: "Recebe suporte estratégico especializado",
      description: "Ajudamos você a escolher os melhores produtos para sua região"
    },
    {
      icon: Handshake,
      title: "Revende com total liberdade",
      description: "Sem compromisso de exclusividade ou volume mínimo alto"
    }
  ];

  return (
    <section id="como-funciona" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-6 sm:mb-8 md:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 px-2">
            Como funciona a <span className="text-gradient-green">parceria com a Vitale</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-green rounded-full flex items-center justify-center">
                  <step.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-1 sm:mb-2 leading-tight">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 sm:mt-8 md:mt-12">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-full">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            <span className="text-xs sm:text-sm md:text-base font-medium">Processo simples e transparente</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
