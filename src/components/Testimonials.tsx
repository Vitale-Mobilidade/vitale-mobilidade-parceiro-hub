
import { Card, CardContent } from '@/components/ui/card';

const Testimonials = () => {
  const testimonials = [
    {
      id: '1',
      name: 'Marina Santos',
      storeType: 'Loja de Bicicletas',
      city: 'São Paulo - SP',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
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
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Quem já vende com a <span className="text-gradient-green">Vitale</span>
          </h2>
          <p className="text-xl text-gray-600">
            Conheça alguns de nossos parceiros de sucesso
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="h-full hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-lg">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.storeType}</p>
                    <p className="text-sm text-gray-500">{testimonial.city}</p>
                  </div>
                </div>
                <blockquote className="text-gray-700 italic">
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
