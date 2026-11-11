import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: `${params.slug.toUpperCase()} Specifications — Daudsons Armoury`,
    description: `Official technical data, proof-testing, and compliance specifications for ${params.slug}.`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  return (
    <main className="min-h-screen py-16 px-6 max-w-[1440px] mx-auto space-y-10">
      <div className="border-b border-[#C8A24A]/40 pb-6 flex items-center justify-between">
        <div>
          <span className="font-mono-tech text-xs uppercase tracking-widest text-[#C8A24A]">
            TECHNICAL DATASHEET // SYSTEM ARCHITECTURE
          </span>
          <h1 className="font-display text-4xl font-bold uppercase mt-1 text-white">
            {slug.replace(/-/g, ' ')}
          </h1>
        </div>
        <Link
          href="/products"
          className="font-mono-tech text-xs text-[#8A9099] hover:text-[#C8A24A] border border-[#1C1F24] px-4 py-2"
        >
          &larr; Back to Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 bg-[#14161A] border border-[#1C1F24] p-8 flex items-center justify-center min-h-[400px]">
          <span className="font-mono-tech text-xs text-[#8A9099]">
            Official Daudsons Aerospace CAD &amp; High-Resolution Render Pipeline
          </span>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 bg-[#14161A] border-l-4 border-[#E4572E] font-mono-tech text-xs space-y-1">
            <span className="text-[#E4572E] font-bold block">STATUTORY ACQUISITION NOTICE</span>
            <p className="text-[#8A9099]">
              Civilian acquisition strictly requires a valid NADRA / Provincial Arms License. Online shopping cart checkout is prohibited by statutory law.
            </p>
          </div>

          <div className="space-y-3 font-mono-tech text-xs">
            <h3 className="font-display text-lg font-bold text-white uppercase">Specifications Matrix</h3>
            <div className="border border-[#1C1F24] divide-y divide-[#1C1F24]">
              <div className="p-3 flex justify-between">
                <span className="text-[#8A9099]">Manufacturer:</span>
                <span className="text-white font-bold">DAUDSONS ARMOURY (PVT.) LTD.</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#8A9099]">Manufacturing Origin:</span>
                <span className="text-white">Peshawar, Khyber Pakhtunkhwa</span>
              </div>
              <div className="p-3 flex justify-between">
                <span className="text-[#8A9099]">Quality Certification:</span>
                <span className="text-[#C8A24A]">AS9100 Rev D &amp; ISO 9001:2015</span>
              </div>
            </div>
          </div>

          <Link
            href={`/contact-us?subject=RFQ+for+${encodeURIComponent(slug)}`}
            className="block text-center py-4 bg-[#E4572E] text-white font-mono-tech font-bold uppercase text-xs tracking-widest hover:bg-[#E4572E]/90 transition"
          >
            Submit Official Procurement RFQ &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
