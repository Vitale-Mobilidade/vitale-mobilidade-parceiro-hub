import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  type: 'bicicleta' | 'triciclo' | 'moto' | 'autopropelido';
  needsCNH: boolean;
  description: string;
  image: string;
  potencia: string;
  bateria: string;
  autonomia: string;
  precoCompra: string;
  precoVenda: string;
  margem: number;
  brand: string;
  category: 'passeio' | 'trabalho' | 'carga' | 'delivery' | 'profissional';
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'V8 - 1000W',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica ideal para passeio e trabalho com alta performance.',
    image: '/lovable-uploads/d5742979-236c-4403-bb4f-54693b238724.png',
    potencia: '1000W',
    bateria: '48V 15AH',
    autonomia: 'Até 60km',
    precoCompra: 'R$7.425,00',
    precoVenda: 'R$10.023,00',
    margem: 35,
    brand: 'Vitale',
    category: 'passeio'
  },
  {
    id: '2',
    name: 'FT-03 - 1000W',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica moderna com design esportivo e alta performance para passeio.',
    image: '/lovable-uploads/c0a1a7fc-d741-40d7-865a-cef9e45295ad.png',
    potencia: '1000W',
    bateria: '48V 18AH',
    autonomia: 'Até 60km',
    precoCompra: 'R$7.830,00',
    precoVenda: 'R$11.353,00',
    margem: 45,
    brand: 'Vitale',
    category: 'passeio'
  },
  {
    id: '3',
    name: 'V8 Mini - 500W',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica compacta e prática, ideal para passeios urbanos e mobilidade sustentável.',
    image: '/lovable-uploads/38caca22-b777-4f1b-9754-6750aeacea1b.png',
    potencia: '500W',
    bateria: '30V 10AH',
    autonomia: 'Até 30km',
    precoCompra: 'R$6.336,00',
    precoVenda: 'R$8.553,60',
    margem: 35,
    brand: 'Vitale',
    category: 'passeio'
  },
  {
    id: '4',
    name: 'E-Bike Trabalho Plus',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica robusta para uso profissional e entregas.',
    image: 'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    potencia: '1200W',
    bateria: '48V 17AH',
    autonomia: 'Até 65km',
    precoCompra: 'R$8.200,00',
    precoVenda: 'R$10.906,00',
    margem: 33,
    brand: 'WorkBike',
    category: 'trabalho'
  },
  {
    id: '5',
    name: 'Autopropelido Delivery',
    type: 'autopropelido',
    needsCNH: false,
    description: 'Veículo autopropelido ideal para delivery com grande capacidade de carga.',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    potencia: '1500W',
    bateria: '60V 25AH',
    autonomia: 'Até 80km',
    precoCompra: 'R$15.000,00',
    precoVenda: 'R$19.200,00',
    margem: 28,
    brand: 'DeliveryTech',
    category: 'delivery'
  },
  {
    id: '6',
    name: 'Moto Profissional X1',
    type: 'moto',
    needsCNH: true,
    description: 'Moto elétrica para uso profissional intenso com alta autonomia.',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    potencia: '3000W',
    bateria: '72V 30AH',
    autonomia: 'Até 100km',
    precoCompra: 'R$18.500,00',
    precoVenda: 'R$24.050,00',
    margem: 30,
    brand: 'ProMoto',
    category: 'profissional'
  }
];

const ProductCatalog = () => {
  const [products] = useState<Product[]>(mockProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cnhFilter, setCnhFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const applyFilters = (type: string, cnh: string, category: string) => {
    let filtered = products;

    if (type !== 'all') {
      filtered = filtered.filter(product => product.type === type);
    }

    if (cnh !== 'all') {
      const needsCNH = cnh === 'yes';
      filtered = filtered.filter(product => product.needsCNH === needsCNH);
    }

    if (category !== 'all') {
      filtered = filtered.filter(product => product.category === category);
    }

    setFilteredProducts(filtered);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    applyFilters(value, cnhFilter, categoryFilter);
  };

  const handleCnhFilter = (value: string) => {
    setCnhFilter(value);
    applyFilters(typeFilter, value, categoryFilter);
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    applyFilters(typeFilter, cnhFilter, value);
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setCnhFilter('all');
    setCategoryFilter('all');
    setFilteredProducts(products);
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'bicicleta': 'Bike Elétrica',
      'triciclo': 'Triciclo',
      'moto': 'Moto Elétrica',
      'autopropelido': 'Autopropelido'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <section id="catalogo" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Catálogo de <span className="text-gradient-green">Produtos</span>
          </h2>
          <p className="text-xl text-gray-600">
            Escolha entre bicicletas, triciclos, motos e autopropelidos para seu negócio
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4">
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="bicicleta">Bike Elétrica</SelectItem>
                <SelectItem value="triciclo">Triciclo</SelectItem>
                <SelectItem value="moto">Moto Elétrica</SelectItem>
                <SelectItem value="autopropelido">Autopropelido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cnhFilter} onValueChange={handleCnhFilter}>
              <SelectTrigger>
                <SelectValue placeholder="CNH Obrigatória" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">CNH - Todos</SelectItem>
                <SelectItem value="no">Sem CNH</SelectItem>
                <SelectItem value="yes">Com CNH</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria de Uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                <SelectItem value="passeio">Passeio</SelectItem>
                <SelectItem value="trabalho">Trabalho</SelectItem>
                <SelectItem value="carga">Carga</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {products.length} produtos
          </div>
        </div>

        {/* Produtos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant={product.needsCNH ? "destructive" : "secondary"}>
                    {product.needsCNH ? "CNH Obrigatória" : "Sem CNH"}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo:</span>
                    <span className="font-medium">{getTypeLabel(product.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categoria:</span>
                    <span className="font-medium capitalize">{product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Potência:</span>
                    <span className="font-medium">{product.potencia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bateria:</span>
                    <span className="font-medium">{product.bateria}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Autonomia:</span>
                    <span className="font-medium">{product.autonomia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preço compra:</span>
                    <span className="font-medium text-blue-600">{product.precoCompra}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preço venda sugerido:</span>
                    <span className="font-medium text-green-600">{product.precoVenda}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margem sugerida:</span>
                    <span className="font-medium text-green-600">{product.margem}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum produto encontrado com os filtros selecionados.</p>
            <Button 
              onClick={clearFilters}
              className="mt-4 bg-gradient-green hover:opacity-90 text-white"
            >
              Ver Todos os Produtos
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCatalog;
