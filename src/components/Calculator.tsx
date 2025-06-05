
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
  } | null>(null);

  const handleCalculate = () => {
    const monthlyKm = parseFloat(formData.monthlyKm) || 0;
    const fuelPrice = parseFloat(formData.fuelPrice) || 0;
    const fuelConsumption = parseFloat(formData.fuelConsumption) || 1;
    const electricRate = parseFloat(formData.electricRate) || 0;
    const combustionMaintenance = parseFloat(formData.combustionMaintenance) || 0;
    const electricMaintenance = parseFloat(formData.electricMaintenance) || 0;

    // Cálculos
    const fuelCost = (monthlyKm / fuelConsumption) * fuelPrice;
    const electricCost = monthlyKm * electricRate;
    const fuelSavings = fuelCost - electricCost;
    const maintenanceSavings = combustionMaintenance - electricMaintenance;
    const totalSavings = fuelSavings + maintenanceSavings;
    
    // ROI assumindo custo médio de R$ 5.000 para um veículo elétrico
    const roiMonths = totalSavings > 0 ? Math.ceil(5000 / totalSavings) : 0;
    
    // CO2 evitado (1 litro de combustível = 2.3 kg de CO2)
    const co2Avoided = (monthlyKm / fuelConsumption) * 2.3;

    setResults({
      fuelCost,
      electricCost,
      fuelSavings,
      maintenanceSavings,
      totalSavings,
      roiMonths,
      co2Avoided
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
            Calculadora de <span className="text-gradient-green">Benefícios</span>
          </h2>
          <p className="text-xl text-gray-600">
            Compare os custos e vantagens do veículo elétrico vs. combustão
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Dados para Comparação</CardTitle>
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
                <Label htmlFor="electricRate">Tarifa Veículo Elétrico (R$ por km)</Label>
                <Input
                  id="electricRate"
                  type="number"
                  step="0.01"
                  value={formData.electricRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, electricRate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="combustionMaintenance">Custo Manutenção Combustão (R$/mês)</Label>
                <Input
                  id="combustionMaintenance"
                  type="number"
                  value={formData.combustionMaintenance}
                  onChange={(e) => setFormData(prev => ({ ...prev, combustionMaintenance: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="electricMaintenance">Custo Manutenção Elétrico (R$/mês)</Label>
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
                Calcular Benefícios
              </Button>
            </CardContent>
          </Card>

          {/* Resultados */}
          <div className="space-y-4">
            {results ? (
              <>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-red-700 mb-2">💰 Custo com Combustível</h3>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(results.fuelCost)}/mês</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-green-700 mb-2">⚡ Custo com Energia</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(results.electricCost)}/mês</p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-blue-700 mb-2">💸 Economia com Combustível</h3>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(results.fuelSavings)}/mês</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-purple-700 mb-2">🔧 Economia com Manutenção</h3>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(results.maintenanceSavings)}/mês</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-green text-white">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">💰 Economia Total Mensal</h3>
                    <p className="text-3xl font-bold">{formatCurrency(results.totalSavings)}</p>
                    <p className="text-green-100 mt-2">Economia anual: {formatCurrency(results.totalSavings * 12)}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold text-orange-700">⏱️ ROI Estimado</h4>
                      <p className="text-xl font-bold text-orange-600">{results.roiMonths} meses</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-teal-50 border-teal-200">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold text-teal-700">🌱 CO₂ Evitado</h4>
                      <p className="text-xl font-bold text-teal-600">{results.co2Avoided.toFixed(1)} kg/mês</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">🧮</div>
                  <h3 className="text-xl font-semibold text-gray-600">Calculadora Pronta</h3>
                  <p className="text-gray-500 mt-2">Preencha os dados ao lado para ver os resultados da comparação</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {results && (
          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">💡 Resumo dos Benefícios</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="font-semibold text-green-600">Economia Mensal Total</p>
                    <p className="text-lg font-bold">{formatCurrency(results.totalSavings)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">Retorno do Investimento</p>
                    <p className="text-lg font-bold">{results.roiMonths} meses</p>
                  </div>
                </div>
                <p className="text-gray-600 mt-4 text-sm">
                  *Cálculo baseado em valores médios de mercado. Resultados podem variar conforme uso e modelo do veículo.
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
