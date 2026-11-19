import { ThemeSelect } from '@/components/theme-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import '../styles.css';

export function DesignSystem() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 bg-navigation p-6 text-navigation-foreground">
        <p>MCR · Muestra de desarrollo</p>
        <ThemeSelect />
      </header>
      <main className="mx-auto max-w-5xl space-y-8 p-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Tokens y estados</h1>
        <p className="text-muted-foreground">
          Referencia local de los componentes existentes. No forma parte del
          build de producción.
        </p>
        <Card>
          <CardContent className="space-y-6">
            <h2 className="text-xl font-semibold">Acciones</h2>
            <div className="flex flex-wrap gap-4">
              <Button>Acción principal</Button>
              <Button variant="secondary">Secundaria</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Discreta</Button>
              <Button variant="link">Enlace de ejemplo</Button>
              <Button variant="destructive">Eliminar ejemplo</Button>
              <Button disabled>Deshabilitado</Button>
              <Button disabled aria-busy="true">
                Guardando…
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Badge>Seleccionado</Badge>
              <Badge variant="secondary">Informativo</Badge>
              <Badge variant="destructive">Error</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-xl font-semibold">Campos y mensajes</h2>
            <div className="space-y-2">
              <Label htmlFor="sample-input">Campo normal</Label>
              <Input id="sample-input" placeholder="Escribe aquí" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample-invalid">Campo con error</Label>
              <Input
                id="sample-invalid"
                aria-invalid="true"
                aria-describedby="sample-error"
              />
              <p id="sample-error" className="text-destructive">
                Revisa este valor.
              </p>
            </div>
            <p className="text-success">✓ Operación completada</p>
            <p className="text-warning">Atención: revisa la información</p>
            <p className="text-info">Información disponible</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
