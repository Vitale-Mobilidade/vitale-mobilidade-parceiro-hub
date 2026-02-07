import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';
import lucasVitalePhoto from '@/assets/lucas-vitale-photo.png';

const AboutUs = () => {
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/5511986893890?text=Ol%C3%A1%2C%0A%0AGostaria%20de%20agendar%20uma%20consultoria%20para%20entender%20como%20posso%20crescer%20no%20mercado%20de%20mobilidade%20el%C3%A9trica.%20Pode%20me%20ajudar%3F', '_blank');
  };

  const handleLinkedInClick = () => {
    window.open('https://www.linkedin.com/in/lucasvitale1/', '_blank');
  };

  return (
    <section id="sobre" className="py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 2xl:py-36 bg-background">
      <div className="responsive-container">
        <div className="max-w-7xl mx-auto">
          {/* Desktop 50/50 Layout */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 2xl:gap-24 items-start mb-16 sm:mb-20 lg:mb-24">
            {/* Left Column - Photo and LinkedIn Button */}
            <div className="order-1 lg:order-1">
              <div className="text-center lg:text-left">
                <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] xl:w-[480px] xl:h-[480px] 2xl:w-[520px] 2xl:h-[520px] mx-auto lg:mx-0 mb-6 rounded-2xl overflow-hidden shadow-xl">
                  <img 
                    src={lucasVitalePhoto} 
                    alt="Lucas Vitale - Fundador da Vitale Mobilidade" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  onClick={handleLinkedInClick}
                  variant="outline"
                  className="bg-background hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 px-6 py-3 text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <Linkedin className="w-5 h-5 mr-2" />
                  Conheça o LinkedIn de Lucas Vitale
                </Button>
              </div>
            </div>

            {/* Right Column - Title and Text */}
            <div className="order-2 lg:order-2 flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] xl:text-5xl 2xl:text-[3.25rem] font-bold mb-6 sm:mb-8 lg:mb-10 text-foreground text-center lg:text-left">
                Quem somos
              </h1>
              <div className="prose prose-lg max-w-none">
                <p className="text-base sm:text-lg md:text-xl lg:text-[1.375rem] xl:text-2xl text-muted-foreground leading-relaxed mb-6 lg:mb-8">
                  A <strong className="text-foreground">Vitale Mobilidade</strong>, liderada por <strong className="text-foreground">Lucas Vitale</strong>, <strong className="text-foreground">nasceu para transformar experiência em estratégia</strong>. Após mais de 10 anos atuando na linha de frente da mobilidade elétrica no Brasil — movimentando mais de R$ 100 milhões em vendas e expandindo operações no Brasil inteiro — percebemos que muitos empreendedores e empresas ainda têm dúvidas na hora de escolher fornecedores, estruturar processos e crescer com segurança nesse mercado.
                </p>
                <p className="text-base sm:text-lg md:text-xl lg:text-[1.375rem] xl:text-2xl text-muted-foreground leading-relaxed mb-6 lg:mb-8">
                  Nossa <strong className="text-foreground">missão é simples</strong>: compartilhar conhecimento prático para ajudar você a tomar decisões assertivas, reduzir riscos e acelerar seus resultados.
                </p>
                <p className="text-base sm:text-lg md:text-xl lg:text-[1.375rem] xl:text-2xl text-muted-foreground leading-relaxed font-medium">
                  Acreditamos que a mobilidade elétrica é um caminho sem volta — e estamos aqui para garantir que você esteja à frente dessa transformação.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-background rounded-2xl border border-green-100 p-8 sm:p-10 lg:p-12 xl:p-14 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-6 sm:mb-8 lg:mb-10">
              Por que escolher a Vitale Mobilidade?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12 lg:mb-14">
              <div className="text-center">
                <h3 className="text-lg lg:text-xl font-bold text-foreground mb-3 lg:mb-4">Experiência Prática</h3>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">Vivência real no mercado, não apenas teoria. Conhecimento validado em campo.</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg lg:text-xl font-bold text-foreground mb-3 lg:mb-4">Networking Qualificado</h3>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">Rede de fornecedores confiáveis e testados em todo o Brasil.</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg lg:text-xl font-bold text-foreground mb-3 lg:mb-4">Visão Estratégica</h3>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">Planejamento que evita erros custosos e acelera seus resultados.</p>
              </div>
            </div>
            
            <Button 
              onClick={handleWhatsAppClick}
              size="lg"
              className="bg-gradient-green hover:opacity-90 text-white px-8 sm:px-10 lg:px-12 py-4 sm:py-5 text-base sm:text-lg lg:text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Agendar uma consultoria
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
