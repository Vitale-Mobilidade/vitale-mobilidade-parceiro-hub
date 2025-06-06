
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
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Por que revender com a <span className="text-gradient-green">Vitale?</span>
          </h2>
          <p className="text-xl text-gray-600">
            Vantagens exclusivas para nossos parceiros revendedores
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyResell;
