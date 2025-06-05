
const BusinessModel = () => {
  const testimonials = [
    {
      name: "Carlos Silva",
      business: "Bike Shop Santos",
      text: "Com a Vitale, aumentamos nossa margem de lucro em 30% e nossos clientes adoram os veículos elétricos. A entrega é rápida e o suporte excelente.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
    },
    {
      name: "Ana Paula Costa",
      business: "Mobilidade Verde RJ",
      text: "A parceria com a Vitale transformou nosso negócio. Vendemos 50 unidades no primeiro mês e os materiais de apoio são fundamentais.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
    },
    {
      name: "Roberto Oliveira",
      business: "Eco Motos BH",
      text: "O pedido mínimo baixo nos permitiu testar o mercado sem grande investimento. Hoje somos um dos maiores revendedores da região.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Depoimentos */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            O que nossos <span className="text-gradient-green">Parceiros</span> dizem
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Histórias reais de lojistas que transformaram seus negócios com a Vitale
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div className="text-left">
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.business}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic text-left">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Modelo de Negócio */}
        <div className="bg-gradient-to-br from-green-50 to-white p-8 lg:p-12 rounded-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Nosso <span className="text-gradient-green">Modelo B2B</span>
            </h2>
            <p className="text-xl text-gray-600">
              Vantagens exclusivas para revendedores Vitale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">35%</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Alta Margem de Lucro</h3>
              <p className="text-gray-600">Margem de até 35% de lucro para maximizar seus ganhos</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">3+</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pedido Mínimo Baixo</h3>
              <p className="text-gray-600">Apenas 3 unidades por produto para facilitar o início</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">24h</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pronta Entrega</h3>
              <p className="text-gray-600">Estoque nacional com entrega rápida para todo o Brasil</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">✓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sem CNH</h3>
              <p className="text-gray-600">Produtos que não exigem CNH ampliam seu mercado</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">📚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Apoio Comercial</h3>
              <p className="text-gray-600">Materiais de vendas e treinamento especializado</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Suporte Dedicado</h3>
              <p className="text-gray-600">Equipe especializada para ajudar no seu sucesso</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessModel;
