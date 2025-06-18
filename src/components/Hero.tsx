
import { Button } from '@/components/ui/button';

const Hero = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0ATenho%20interesse%20em%20comprar%203%20unidades%20para%20a%20minha%20loja.%20Voc%C3%AA%20pode%20me%20enviar%20o%20cat%C3%A1logo%20e%20as%20condi%C3%A7%C3%B5es%3F', '_blank');
  };

  return (
    <section id="home" className="relative py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 overflow-hidden bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-tight px-2">
                <span className="text-gradient-green">Distribuidora</span> de veículos elétricos para lojistas
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto px-4">
                Compre direto da Vitale Mobilidade e revenda com até <strong>50% de margem de lucro</strong>. 
                Estoque nacional, pronta entrega e suporte especializado para lojistas que querem escalar suas vendas em mobilidade elétrica.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 max-w-2xl mx-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-green hover:opacity-90 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold min-h-[44px]" 
                onClick={handleWhatsAppClick}
              >
                Quero comprar da Distribuidora Vitale
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg min-h-[44px]" 
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({
                  behavior: 'smooth'
                })}
              >
                Ver Portfólio de Produtos
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 pt-4 sm:pt-6 md:pt-8 max-w-3xl mx-auto px-4">
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">50%</div>
                <div className="text-xs sm:text-sm text-gray-600">Margem de Lucro</div>
              </div>
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">Nacional</div>
                <div className="text-xs sm:text-sm text-gray-600">Estoque Pronto</div>
              </div>
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">24h</div>
                <div className="text-xs sm:text-sm text-gray-600">Pronta Entrega</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/4 sm:w-1/3 h-full bg-gradient-to-l from-green-100/50 to-transparent"></div>
    </section>
  );
};

export default Hero;
