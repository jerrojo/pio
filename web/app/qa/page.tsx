import { notFound } from "next/navigation";
import { Pio } from "../../components/Pio";
import { PracticePreview } from "../../components/PracticePreview";
// Local-only visual harness. All variants return 404 in production.
export const dynamic = "force-dynamic";
export default async function QA({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  if (params.view === "app" || params.view === "practice")
    return (
      <>
        {params.scale === "200" && <style>{"html{font-size:200%;}"}</style>}
        {params.spacing === "wide" && (
          <style>
            {
              "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}p{margin-bottom:2em!important;}"
            }
          </style>
        )}
        {params.view === "app" ? <Pio /> : <PracticePreview />}
      </>
    );
  const cases = [
    { title: "Pío 320px", width: 320, src: "/" },
    { title: "Pío 390px", width: 390, src: "/" },
    { title: "Pío 768px", width: 768, src: "/" },
    { title: "Texto 200% a 320px", width: 320, src: "/qa?view=app&scale=200" },
    { title: "Frase larga 320px", width: 320, src: "/qa?view=practice" },
    {
      title: "Frase larga 200%",
      width: 390,
      src: "/qa?view=practice&scale=200",
    },
    {
      title: "Espaciado amplio",
      width: 320,
      src: "/qa?view=practice&spacing=wide",
    },
  ];
  return (
    <main
      style={{
        padding: 24,
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "start",
      }}
    >
      {cases.map((c) => (
        <section key={c.title}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>{c.title}</h2>
          <iframe
            title={c.title}
            src={c.src}
            width={c.width}
            height={1060}
            style={{
              border: "1px solid #718a87",
              display: "block",
              boxSizing: "content-box",
            }}
          />
        </section>
      ))}
    </main>
  );
}
