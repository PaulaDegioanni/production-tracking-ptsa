// src/app/production/cycles/page.tsx
import { getCiclos } from "@/lib/baserow";

export const dynamic = "force-dynamic"; // asegura que siempre se pida al backend

export default async function CyclesPage() {
  const ciclos = await getCiclos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">
          Ciclos de siembra
        </h1>
        <p className="text-sm text-slate-500">
          Resumen de ciclos por campo, cultivo y estado.
        </p>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Campo</th>
              <th className="px-3 py-2 text-left">Cultivo</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Kg totales stock</th>
              <th className="px-3 py-2 text-right">Kg en camión desde stock</th>
              <th className="px-3 py-2 text-left">Siembra</th>
              <th className="px-3 py-2 text-left">Est. cosecha</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.ID}</td>
                <td className="px-3 py-2">{c.Campo}</td>
                <td className="px-3 py-2">
                  {c.Cultivo?.value ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {c.Estado?.value ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {c["Kgs en Stock"] ?? 0}
                </td>
                <td className="px-3 py-2 text-right">
                  {c["Kgs Cami\u00f3n desde Stock"] ?? 0}
                </td>
                <td className="px-3 py-2">
                  {c["Fecha de siembra"] ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {c["Fecha estimada de cosecha"] ?? "-"}
                </td>
              </tr>
            ))}
            {ciclos.length === 0 && (
              <tr>
                <td
                  className="px-3 py-4 text-center text-slate-500"
                  colSpan={8}
                >
                  No hay ciclos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
