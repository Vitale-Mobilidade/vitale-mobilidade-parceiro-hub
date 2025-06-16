
import { Card, CardContent } from '@/components/ui/card';

const Testimonials = () => {
  const testimonials = [
    {
      id: '1',
      name: 'Marina Santos',
      storeType: 'Loja de Bicicletas',
      city: 'São Paulo - SP',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      text: 'Consegui vender as 3 primeiras unidades em menos de 10 dias, com ótimo lucro e suporte da equipe. A margem realmente é atrativa!'
    },
    {
      id: '2',
      name: 'João Silva',
      storeType: 'Loja Híbrida',
      city: 'Rio de Janeiro - RJ',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      text: 'Transformei minha loja tradicional focando em veículos elétricos. O resultado foi um crescimento de 200% no faturamento em 6 meses.'
    },
    {
      id: '3',
      name: 'Ana Costa',
      storeType: 'E-commerce',
      city: 'Belo Horizonte - MG',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
      text: 'A Vitale mudou meu negócio! Agora tenho produtos de alta demanda com margens que realmente fazem diferença no resultado final.'
    }
  ];

  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Quem já vende com a <span className="text-gradient-green">Vitale</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">Conheça alguns de nossos revendedores de sucesso</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base md:text-lg truncate">{testimonial.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{testimonial.storeType}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{testimonial.city}</p>
                  </div>
                </div>
                <blockquote className="text-xs sm:text-sm md:text-base text-gray-700 italic leading-relaxed">
                  "{testimonial.text}"
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
