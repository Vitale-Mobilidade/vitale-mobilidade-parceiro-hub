import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
const ResellerForm = () => {
  const {
    toast
  } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    state: '',
    storeType: '',
    interests: [] as string[],
    observations: ''
  });
  const estados = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const storeTypes = ['Loja física', 'Online', 'Híbrida', 'Outro'];
  const productInterests = ['Bike elétrica', 'Triciclo passeio', 'Triciclo carga', 'Motos elétricas', 'Autopropelidos'];
  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        interests: prev.interests.filter(i => i !== interest)
      }));
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Cadastro enviado com sucesso!",
      description: "Entraremos em contato em breve para apresentar as condições de parceria."
    });
    setFormData({
      name: '',
      email: '',
      city: '',
      state: '',
      storeType: '',
      interests: [],
      observations: ''
    });
  };
  return <section id="seja-revendedor" className="py-20 bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Seja um <span className="text-gradient-green">Revendedor Vitale</span>
            </h2>
            <p className="text-xl text-gray-600">Aprenda a vender mais veículos elétricos com alta margem de lucro.</p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Margem de até 50% de lucro para o lojista</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Pedido mínimo de apenas 3 unidades</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Estoque com pronta entrega no Brasil</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Atendimento especializado</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Veículos com e sem necessidade de CNH</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">Mix de produtos para todos os perfis</span>
              </div>
            </div>
          </div>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-green text-white rounded-t-lg">
              <CardTitle className="text-xl text-center">Cadastre-se como revendedor</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))} required />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input id="city" value={formData.city} onChange={e => setFormData(prev => ({
                    ...prev,
                    city: e.target.value
                  }))} required />
                  </div>

                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Select value={formData.state} onValueChange={value => setFormData(prev => ({
                    ...prev,
                    state: value
                  }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(estado => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="storeType">Tipo de loja *</Label>
                  <Select value={formData.storeType} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  storeType: value
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {storeTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Interesse em quais produtos? *</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {productInterests.map(interest => <div key={interest} className="flex items-center space-x-2">
                        <Checkbox id={interest} checked={formData.interests.includes(interest)} onCheckedChange={checked => handleInterestChange(interest, !!checked)} />
                        <Label htmlFor={interest} className="text-sm">{interest}</Label>
                      </div>)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="observations">Observações adicionais</Label>
                  <Textarea id="observations" value={formData.observations} onChange={e => setFormData(prev => ({
                  ...prev,
                  observations: e.target.value
                }))} placeholder="Conte-nos mais sobre sua operação" />
                </div>

                <Button type="submit" className="w-full bg-gradient-green hover:opacity-90 text-white text-lg py-3">
                  Quero me tornar um revendedor da Vitale
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Nossa equipe entrará em contato em até 24 horas para apresentar as condições de parceria.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>;
};
export default ResellerForm;