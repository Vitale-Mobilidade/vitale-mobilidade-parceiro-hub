
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DollarSign, TrendingUp, Calculator, Target } from 'lucide-react';

const ProfitCalculator = () => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [monthlyUnits, setMonthlyUnits] = useState([5]);

  const products = {
    'bike-urbana': {
      name: 'Bicicleta elétrica urbana',
      ticketMedio: 3500,
      margem: 40
    },
    'scooter': {
      name: 'Scooter elétrica',
      ticketMedio: 6000,
      margem: 45
    },
    'triciclo-carga': {
      name: 'Triciclo de carga',
      ticketMedio: 8000,
      margem: 50
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateResults = () => {
    if (!selectedProduct) return null;

    const product = products[selectedProduct as keyof typeof products];
    const units = monthlyUnits[0];
    
    const valorCompra = product.ticketMedio * (1 - product.margem / 100);
    const valorRevenda = product.ticketMedio;
    const lucroPorUnidade = valorRevenda - valorCompra;
    const lucroTotalMes = lucroPorUnidade * units;

    return {
      valorCompra,
      valorRevenda,
      lucroPorUnidade,
      lucroTotalMes,
      product
    };
  };

  const results = calculateResults();

  return (
    <section id="calculadora-lucro" className="py-16 lg:py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            💰 Simule seu <span className="text-gradient-green">Lucro Revendendo</span> Veículos Elétricos
          </h2>
          <p className="text-xl text-gray-600">
            Descubra quanto você pode ganhar por mês revendendo os produtos da Vitale Mobilidade com até 50% de margem de lucro. 
            Simule abaixo e veja o potencial do seu negócio.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Calculadora */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulador de Lucro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Escolha o tipo de produto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(products).map(([key, product]) => (
                      <SelectItem key={key} value={key}>
                        {product.name} (ticket médio: {formatCurrency(product.ticketMedio)}, margem: {product.margem}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-medium mb-4 block">
                  Quantas unidades você quer vender por mês? ({monthlyUnits[0]} unidades)
                </Label>
                <Slider
                  value={monthlyUnits}
                  onValueChange={setMonthlyUnits}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>1</span>
                  <span>50 unidades</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          <div className="space-y-4">
            {results ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-blue-700 mb-1">Valor de Compra</h3>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(results.valorCompra)}</p>
                      <p className="text-xs text-blue-500">por unidade</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-green-700 mb-1">Valor de Revenda</h3>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(results.valorRevenda)}</p>
                      <p className="text-xs text-green-500">sugerido por unidade</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                      <h3 className="font-semibold text-orange-700">Lucro por Unidade</h3>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">{formatCurrency(results.lucroPorUnidade)}</p>
                    <p className="text-orange-500 text-sm">Margem de {results.product.margem}%</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-green text-white">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Lucro Total Estimado no Mês
                    </h3>
                    <p className="text-4xl font-bold">{formatCurrency(results.lucroTotalMes)}</p>
                    <p className="text-green-100 mt-2">
                      Vendendo {monthlyUnits[0]} unidades de {results.product.name.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                  <p className="text-gray-700 text-center font-medium">
                    <strong>Esses números são reais.</strong> Já ajudamos dezenas de lojistas a alcançar esse faturamento, 
                    com produtos de alta demanda, suporte comercial e estoque pronto para envio imediato.
                  </p>
                </div>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-bold text-yellow-800 mb-4">
                      🚀 Gostou do resultado? Vamos conversar.
                    </h3>
                    <p className="text-yellow-700 mb-4">
                      Receba nosso portfólio completo e condições de parceria exclusivas.
                    </p>
                    <Button 
                      size="lg" 
                      className="bg-gradient-green hover:opacity-90 text-white px-8 py-3"
                      onClick={() => document.getElementById('seja-revendedor')?.scrollIntoView({
                        behavior: 'smooth'
                      })}
                    >
                      Quero ser parceiro da Vitale
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-xl font-semibold text-gray-600">Simulador Pronto</h3>
                  <p className="text-gray-500 mt-2">Selecione um produto para ver seu potencial de lucro</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfitCalculator;
