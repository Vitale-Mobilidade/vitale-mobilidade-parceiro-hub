
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TreePine, Fuel, Wrench, DollarSign, Clock, Leaf } from 'lucide-react';

const Calculator = () => {
  const [formData, setFormData] = useState({
    monthlyKm: '',
    fuelPrice: '5.50',
    fuelConsumption: '15',
    electricRate: '0.03',
    combustionMaintenance: '150',
    electricMaintenance: '50'
  });

  const [results, setResults] = useState<{
    fuelCost: number;
    electricCost: number;
    fuelSavings: number;
    maintenanceSavings: number;
    totalSavings: number;
    roiMonths: number;
    co2Avoided: number;
    treesEquivalent: number;
    yearlyImpact: {
      fuelSavings: number;
      co2Avoided: number;
      treesEquivalent: number;
    };
  } | null>(null);

  const handleCalculate = () => {
    const monthlyKm = parseFloat(formData.monthlyKm) || 0;
    const fuelPrice = parseFloat(formData.fuelPrice) || 0;
    const fuelConsumption = parseFloat(formData.fuelConsumption) || 1;
    const electricRate = parseFloat(formData.electricRate) || 0;
    const combustionMaintenance = parseFloat(formData.combustionMaintenance) || 0;
    const electricMaintenance = parseFloat(formData.electricMaintenance) || 0;

    // Cálculos mensais
    const fuelCost = (monthlyKm / fuelConsumption) * fuelPrice;
    const electricCost = monthlyKm * electricRate;
    const fuelSavings = fuelCost - electricCost;
    const maintenanceSavings = combustionMaintenance - electricMaintenance;
    const totalSavings = fuelSavings + maintenanceSavings;
    
    // ROI assumindo custo médio de R$ 5.000 para um veículo elétrico
    const roiMonths = totalSavings > 0 ? Math.ceil(5000 / totalSavings) : 0;
    
    // CO2 evitado mensal (1 litro de combustível = 2.3 kg de CO2)
    const co2Avoided = (monthlyKm / fuelConsumption) * 2.3;
    
    // Equivalência em árvores (1 árvore adulta absorve 22 kg de CO2 por ano)
    const treesEquivalent = (co2Avoided * 12) / 22;

    // Impacto anual
    const yearlyImpact = {
      fuelSavings: fuelSavings * 12,
      co2Avoided: co2Avoided * 12,
      treesEquivalent: treesEquivalent
    };

    setResults({
      fuelCost,
      electricCost,
      fuelSavings,
      maintenanceSavings,
      totalSavings,
      roiMonths,
      co2Avoided,
      treesEquivalent,
      yearlyImpact
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <section id="calculadora" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Economize e <span className="text-gradient-green">Ajude o Planeta</span>
          </h2>
          <p className="text-xl text-gray-600">
            Calcule a economia real e o impacto ambiental do veículo elétrico
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Dados para Comparação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="monthlyKm">Quilometragem Mensal (km) *</Label>
                <Input
                  id="monthlyKm"
                  type="number"
                  value={formData.monthlyKm}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyKm: e.target.value }))}
                  placeholder="Ex: 1000"
                />
              </div>

              <div>
                <Label htmlFor="fuelPrice">Preço do Combustível (R$/litro)</Label>
                <Input
                  id="fuelPrice"
                  type="number"
                  step="0.01"
                  value={formData.fuelPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelPrice: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="fuelConsumption">Consumo do Veículo a Combustão (km/L)</Label>
                <Input
                  id="fuelConsumption"
                  type="number"
                  step="0.1"
                  value={formData.fuelConsumption}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelConsumption: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="electricRate">Custo por km do Veículo Elétrico (R$)</Label>
                <Input
                  id="electricRate"
                  type="number"
                  step="0.01"
                  value={formData.electricRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, electricRate: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Baseado no consumo médio de energia elétrica</p>
              </div>

              <div>
                <Label htmlFor="combustionMaintenance">Manutenção Veículo a Combustão (R$/mês)</Label>
                <Input
                  id="combustionMaintenance"
                  type="number"
                  value={formData.combustionMaintenance}
                  onChange={(e) => setFormData(prev => ({ ...prev, combustionMaintenance: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="electricMaintenance">Manutenção Veículo Elétrico (R$/mês)</Label>
                <Input
                  id="electricMaintenance"
                  type="number"
                  value={formData.electricMaintenance}
                  onChange={(e) => setFormData(prev => ({ ...prev, electricMaintenance: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleCalculate} 
                className="w-full bg-gradient-green hover:opacity-90 text-white"
                disabled={!formData.monthlyKm}
              >
                Calcular Economia e Impacto
              </Button>
            </CardContent>
          </Card>

          {/* Resultados */}
          <div className="space-y-4">
            {results ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <Fuel className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-red-700 mb-1">Custo Combustível</h3>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(results.fuelCost)}</p>
                      <p className="text-xs text-red-500">por mês</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <Leaf className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-green-700 mb-1">Custo Elétrico</h3>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(results.electricCost)}</p>
                      <p className="text-xs text-green-500">por mês</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                      <h3 className="font-semibold text-blue-700">Economia com Combustível</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(results.fuelSavings)}/mês</p>
                    <p className="text-blue-500 text-sm">Economia anual: {formatCurrency(results.fuelSavings * 12)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-6 w-6 text-purple-600" />
                      <h3 className="font-semibold text-purple-700">Economia com Manutenção</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(results.maintenanceSavings)}/mês</p>
                    <p className="text-purple-500 text-sm">Economia anual: {formatCurrency(results.maintenanceSavings * 12)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-green text-white">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Economia Total
                    </h3>
                    <p className="text-3xl font-bold">{formatCurrency(results.totalSavings)}/mês</p>
                    <p className="text-green-100 mt-2">
                      <strong>Economia anual: {formatCurrency(results.totalSavings * 12)}</strong>
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-orange-700">ROI Estimado</h4>
                      <p className="text-xl font-bold text-orange-600">{results.roiMonths} meses</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-teal-50 border-teal-200">
                    <CardContent className="p-4 text-center">
                      <Leaf className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-teal-700">CO₂ Evitado</h4>
                      <p className="text-xl font-bold text-teal-600">{results.co2Avoided.toFixed(1)} kg/mês</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Impacto Ambiental */}
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TreePine className="h-6 w-6 text-green-600" />
                      <h3 className="font-semibold text-green-700">Impacto Ambiental Anual</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg">
                        <p className="text-3xl font-bold text-green-600">{results.yearlyImpact.co2Avoided.toFixed(0)} kg</p>
                        <p className="text-sm text-gray-600">de CO₂ evitado por ano</p>
                      </div>
                      
                      <div className="text-center p-4 bg-white rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <TreePine className="h-6 w-6 text-green-600" />
                          <p className="text-3xl font-bold text-green-600">{results.treesEquivalent.toFixed(1)}</p>
                        </div>
                        <p className="text-sm text-gray-600">árvores adultas preservadas</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-green-100 rounded-lg">
                      <p className="text-center text-green-800 font-medium">
                        "Ao usar veículos elétricos, você evita a emissão de <strong>{results.yearlyImpact.co2Avoided.toFixed(0)} kg de CO₂</strong> por ano – 
                        equivalente ao trabalho de <strong>{results.treesEquivalent.toFixed(1)} árvores adultas!</strong>"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">🧮</div>
                  <h3 className="text-xl font-semibold text-gray-600">Calculadora Pronta</h3>
                  <p className="text-gray-500 mt-2">Preencha os dados ao lado para ver a economia e o impacto ambiental</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {results && (
          <div className="mt-12 text-center">
            <Card className="max-w-4xl mx-auto bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">💡 Resumo Completo dos Benefícios</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-600">Economia Mensal</p>
                    <p className="text-2xl font-bold">{formatCurrency(results.totalSavings)}</p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-blue-600">Retorno do Investimento</p>
                    <p className="text-2xl font-bold">{results.roiMonths} meses</p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <TreePine className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-600">Árvores Preservadas/Ano</p>
                    <p className="text-2xl font-bold">{results.treesEquivalent.toFixed(1)}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mt-6 text-sm">
                  *Cálculos baseados em valores médios de mercado e fórmulas científicas reconhecidas. 
                  Equivalência de árvores baseada na capacidade de absorção de 22kg de CO₂ por árvore adulta por ano.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default Calculator;
