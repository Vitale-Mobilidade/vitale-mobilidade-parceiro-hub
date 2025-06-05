
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section id="home" className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                <span className="text-gradient-green">Ganhe até 35%</span> de lucro revendendo veículos elétricos com entrega imediata
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Traga inovação e sustentabilidade para seu negócio com veículos de alta demanda, sem burocracia e com margens atrativas.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-green hover:opacity-90 text-white px-8 py-3 text-lg"
                onClick={() => document.getElementById('seja-revendedor')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Quero ser um revendedor
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 text-lg"
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver Catálogo
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">35%</div>
                <div className="text-sm text-gray-600">Margem de Lucro</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">3+</div>
                <div className="text-sm text-gray-600">Pedido Mínimo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">24h</div>
                <div className="text-sm text-gray-600">Pronta Entrega</div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-green rounded-3xl p-8 text-white">
              <img 
                src="https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Veículo elétrico sustentável" 
                className="w-full h-64 object-cover rounded-2xl"
              />
              <div className="mt-6 space-y-2">
                <h3 className="text-xl font-semibold">Mobilidade Sustentável</h3>
                <p className="text-green-100">Bicicletas, triciclos e motos elétricas para todos os perfis de cliente.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-green-100/50 to-transparent"></div>
    </section>
  );
};

export default Hero;
