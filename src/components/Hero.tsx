import { Button } from '@/components/ui/button';

const Hero = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20escolher%20os%20melhores%20fornecedores%20de%20ve%C3%ADculos%20el%C3%A9tricos.%20Voc%C3%AA%20pode%20me%20ajudar%3F', '_blank');
  };

  return (
    <section id="home" className="relative w-full overflow-hidden bg-gradient-to-br from-green-50 to-white">
      {/* Full width hero with internal container */}
      <div className="w-full py-12 sm:py-16 md:py-20 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40">
        <div className="responsive-container">
          <div className="text-center">
            <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                <h1 className="text-[1.625rem] sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl 2xl:text-[3.25rem] 3xl:text-[3.5rem] font-bold leading-tight">
                  <span className="text-gradient-green">Consultoria em veículos elétricos:</span> escolha fornecedores confiáveis, evite erros e acelere seus resultados
                </h1>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-[1.375rem] 2xl:text-2xl text-muted-foreground leading-relaxed max-w-5xl mx-auto">
                  <strong>10 anos de experiência no setor, mais de R$100 milhões em vendas e cases em todo o Brasil.</strong> 
                  Transformo conhecimento em resultados práticos para quem deseja crescer no mercado de veículos elétricos com segurança e lucratividade.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center max-w-3xl mx-auto">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-gradient-green hover:opacity-90 text-white px-6 sm:px-8 md:px-10 py-4 sm:py-5 text-base sm:text-lg md:text-xl font-semibold min-h-[52px] shadow-lg hover:shadow-xl transition-all duration-300" 
                  onClick={handleWhatsAppClick}
                >
                  Agende uma consultoria
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto border-2 border-primary text-primary hover:bg-primary hover:text-white px-6 sm:px-8 md:px-10 py-4 sm:py-5 text-base sm:text-lg md:text-xl min-h-[52px] transition-all duration-300" 
                  onClick={() => document.getElementById('servicos')?.scrollIntoView({
                    behavior: 'smooth'
                  })}
                >
                  Conheça nossos serviços
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6 lg:gap-8 pt-6 sm:pt-8 md:pt-10 lg:pt-12 max-w-6xl mx-auto">
                <div className="text-center p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border border-border/50">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-2">+10 anos</div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Experiência</div>
                </div>
                <div className="text-center p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border border-border/50">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-2">+R$100mi</div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">em Vendas</div>
                </div>
                <div className="text-center p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border border-border/50">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-2">Nacional</div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Experiência</div>
                </div>
                <div className="text-center p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border border-border/50">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-2">B2B</div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Autoridade</div>
                </div>
                <div className="text-center p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border border-border/50 col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary mb-2">Expansão</div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Operações</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/4 sm:w-1/3 h-full bg-gradient-to-l from-green-100/50 to-transparent pointer-events-none"></div>
    </section>
  );
};

export default Hero;
