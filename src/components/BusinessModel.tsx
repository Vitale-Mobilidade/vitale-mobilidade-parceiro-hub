
const BusinessModel = () => {
  const testimonials = [{
    name: "Carlos Silva",
    business: "Bike Shop Santos",
    text: "Com a Vitale, aumentamos nossa margem de lucro em 30% e nossos clientes adoram os veículos elétricos. A entrega é rápida e o suporte excelente.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
  }, {
    name: "Ana Paula Costa",
    business: "Mobilidade Verde RJ",
    text: "A parceria com a Vitale transformou nosso negócio. Vendemos 50 unidades no primeiro mês e os materiais de apoio são fundamentais.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
  }, {
    name: "Roberto Oliveira",
    business: "Eco Motos BH",
    text: "O pedido mínimo baixo nos permitiu testar o mercado sem grande investimento. Hoje somos um dos maiores revendedores da região.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
  }];
  
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Modelo de <span className="text-gradient-green">Negócio</span>
          </h2>
          <p className="text-xl text-gray-600">
            Como funciona nossa parceria de sucesso
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <img 
                src={testimonial.image} 
                alt={testimonial.name}
                className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-center mb-2">{testimonial.name}</h3>
              <p className="text-sm text-gray-600 text-center mb-4">{testimonial.business}</p>
              <p className="text-gray-700 italic text-center">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BusinessModel;
