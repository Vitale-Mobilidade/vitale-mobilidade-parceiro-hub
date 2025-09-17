
import { Button } from '@/components/ui/button';

const Hero = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511968390253?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entrar%20no%20mercado%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  return (
    <section id="home" className="relative py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 overflow-hidden bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-tight px-2">
                <span className="text-gradient-green">Consultoria Estratégica</span> em veículos elétricos
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto px-4">
                Ajudo lojistas e empresas a entrarem no mercado de veículos elétricos com <strong>segurança e lucratividade</strong>. 
                Com 10 anos de experiência e participação em vendas que ultrapassam <strong>R$ 100 milhões</strong>, ofereço orientação prática para escolher fornecedores confiáveis e estruturar seu negócio.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 max-w-2xl mx-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-green hover:opacity-90 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold min-h-[44px]" 
                onClick={handleWhatsAppClick}
              >
                Agende uma consultoria
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg min-h-[44px]" 
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({
                  behavior: 'smooth'
                })}
              >
                Conheça nossa rede de fornecedores
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 pt-4 sm:pt-6 md:pt-8 max-w-3xl mx-auto px-4">
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">10 anos</div>
                <div className="text-xs sm:text-sm text-gray-600">de Experiência</div>
              </div>
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">+100mi</div>
                <div className="text-xs sm:text-sm text-gray-600">em Vendas</div>
              </div>
              <div className="text-center p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">Seguro</div>
                <div className="text-xs sm:text-sm text-gray-600">e Lucrativo</div>
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
