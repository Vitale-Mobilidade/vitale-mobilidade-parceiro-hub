
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
    <section id="como-funciona" className="py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Como funciona a <span className="text-gradient-green">parceria com a Vitale</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-4 p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-green rounded-full flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-6 py-3 rounded-full">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Processo simples e transparente</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
