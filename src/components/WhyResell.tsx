
import { DollarSign, Package, ShoppingCart, Users, Shield, Zap } from 'lucide-react';

const WhyResell = () => {
  const benefits = [
    {
      icon: DollarSign,
      title: 'Margem de até 50%',
      description: 'Lucre com uma das melhores margens do mercado de mobilidade elétrica'
    },
    {
      icon: Package,
      title: 'Pedido mínimo de apenas 3 unidades',
      description: 'Baixo investimento inicial para começar a vender'
    },
    {
      icon: ShoppingCart,
      title: 'Produtos em estoque no Brasil',
      description: 'Pronta entrega para atender seus clientes rapidamente'
    },
    {
      icon: Users,
      title: 'Atendimento especializado',
      description: 'Suporte comercial e técnico dedicado aos parceiros'
    },
    {
      icon: Shield,
      title: 'Veículos com e sem necessidade de CNH',
      description: 'Amplie seu público com produtos para todos os perfis'
    },
    {
      icon: Zap,
      title: 'Mix de produtos completo',
      description: 'Bicicletas, triciclos e motos para todos os segmentos'
    }
  ];

  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Por que revender com a <span className="text-gradient-green">Vitale?</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">
            Vantagens exclusivas para nossos parceiros revendedores
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <benefit.icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3">{benefit.title}</h3>
              <p className="text-sm sm:text-base text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyResell;
