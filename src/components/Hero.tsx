
import { Button } from '@/components/ui/button';

const Hero = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0ATenho%20interesse%20em%20comprar%203%20unidades%20para%20a%20minha%20loja.%20Voc%C3%AA%20pode%20me%20enviar%20o%20cat%C3%A1logo%20e%20as%20condi%C3%A7%C3%B5es%3F', '_blank');
  };

  return (
    <section id="home" className="relative py-12 sm:py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                <span className="text-gradient-green">Distribuidora</span> de veículos elétricos para lojistas
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto px-4">
                Compre direto da Vitale Mobilidade e revenda com até <strong>50% de margem de lucro</strong>. 
                Estoque nacional, pronta entrega e suporte especializado para lojistas que querem escalar suas vendas em mobilidade elétrica.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-green hover:opacity-90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold" 
                onClick={handleWhatsAppClick}
              >
                Quero comprar da distribuidora Vitale
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg" 
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({
                  behavior: 'smooth'
                })}
              >
                Ver Portfólio de Produtos
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8 max-w-3xl mx-auto px-4">
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">50%</div>
                <div className="text-sm text-gray-600">Margem de Lucro</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">Nacional</div>
                <div className="text-sm text-gray-600">Estoque Pronto</div>
              </div>
              <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">24h</div>
                <div className="text-sm text-gray-600">Pronta Entrega</div>
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
