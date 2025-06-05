
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/hooks/useCart';
import { ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  type: 'bicicleta' | 'triciclo' | 'moto';
  needsCNH: boolean;
  description: string;
  image: string;
  price: number;
  margin: number;
  stock: number;
  brand: string;
  category: 'passeio' | 'trabalho' | 'carga';
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'E-Bike Urban Pro',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica ideal para deslocamentos urbanos com autonomia de 50km.',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    price: 2500,
    margin: 35,
    stock: 25,
    brand: 'EcoBike',
    category: 'passeio'
  },
  {
    id: '2',
    name: 'Triciclo Cargo Max',
    type: 'triciclo',
    needsCNH: false,
    description: 'Triciclo elétrico para transporte de cargas com capacidade de 150kg.',
    image: 'https://images.unsplash.com/photo-1544191696-15693a5d302d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    price: 4200,
    margin: 30,
    stock: 15,
    brand: 'CargoBike',
    category: 'carga'
  },
  {
    id: '3',
    name: 'Moto Elétrica City',
    type: 'moto',
    needsCNH: true,
    description: 'Moto elétrica para cidade com velocidade máxima de 50km/h.',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    price: 8500,
    margin: 32,
    stock: 10,
    brand: 'ElectroMoto',
    category: 'passeio'
  },
  {
    id: '4',
    name: 'E-Bike Trabalho Plus',
    type: 'bicicleta',
    needsCNH: false,
    description: 'Bicicleta elétrica robusta para uso profissional e entregas.',
    image: 'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    price: 3200,
    margin: 33,
    stock: 18,
    brand: 'WorkBike',
    category: 'trabalho'
  }
];

const ProductCatalog = () => {
  const [products] = useState<Product[]>(mockProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cnhFilter, setCnhFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { addItem } = useCart();

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <section id="catalogo" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Catálogo de <span className="text-gradient-green">Produtos</span>
          </h2>
          <p className="text-xl text-gray-600">
            Escolha entre bicicletas, triciclos e motos elétricas para seu negócio
          </p>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
          <Select value={typeFilter} onValueChange={handleTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="bicicleta">Bicicletas</SelectItem>
              <SelectItem value="triciclo">Triciclos</SelectItem>
              <SelectItem value="moto">Motos</SelectItem>
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
            </SelectContent>
          </Select>
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
                    <span className="capitalize font-medium">{product.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marca:</span>
                    <span className="font-medium">{product.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estoque:</span>
                    <span className="font-medium">{product.stock} unidades</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margem sugerida:</span>
                    <span className="font-medium text-green-600">{product.margin}%</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <div className="w-full space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatPrice(product.price)}</div>
                    <div className="text-sm text-gray-500">Preço unitário</div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-green hover:opacity-90 text-white"
                    onClick={() => addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      type: product.type
                    })}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Pedido
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    Pedido mínimo: 3 unidades
                  </p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;
