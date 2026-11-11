import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Top Compliance Ribbon */}
      <div className="border-b border-[#1C1F24] bg-[#0A0B0D] px-4 py-2 font-mono-tech text-xs text-[#8A9099] flex justify-between items-center max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-[#C8A24A] font-bold">● MADE IN PAKISTAN – SINCE 1953</span>
          <span>AS9100 REV D • ISO 9001:2015 • ISO 14001:2015</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Kohat Road, Peshawar, KPK</span>
          <a href="tel:+92912322907" className="text-[#C8A24A]">+92 (91) 2322907</a>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center border-b border-[#C8A24A]/40 px-6 py-20 max-w-[1440px] mx-auto">
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#14161A] border border-[#C8A24A] text-[#C8A24A] font-mono-tech text-xs tracking-widest uppercase">
            <span>ESTABLISHED 1953 • PESHAWAR, PAKISTAN</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-6xl uppercase tracking-tight text-white leading-tight">
            DAUDSONS ARMOURY <span className="text-[#C8A24A]">(PVT.) LTD.</span>
          </h1>
          <p className="text-lg text-[#8A9099] leading-relaxed">
            Manufacturers &amp; Exporters of Quality Firearms, Defense Equipment, Aerospace Components, and Precision Engineering Parts. Built on over two centuries of heritage in sporting arms and defense manufacturing.
          </p>
          <div className="flex flex-wrap gap-4 pt-4 font-mono-tech text-xs uppercase">
            <Link
              href="/products"
              className="px-8 py-4 bg-[#E4572E] text-white font-bold tracking-widest hover:bg-[#E4572E]/90 transition"
            >
              Explore Catalog →
            </Link>
            <Link
              href="/contact-us"
              className="px-8 py-4 bg-[#14161A] border border-[#C8A24A] text-[#C8A24A] font-bold tracking-widest hover:bg-[#C8A24A] hover:text-black transition"
            >
              Procurement RFQ
            </Link>
          </div>
        </div>
      </section>

      {/* Four Divisions */}
      <section className="py-20 px-6 max-w-[1440px] mx-auto border-b border-[#1C1F24]">
        <div className="mb-12">
          <span className="font-mono-tech text-xs uppercase tracking-widest text-[#C8A24A]">01 // DIVISIONS</span>
          <h2 className="font-display text-3xl font-bold uppercase mt-1">Four Sovereign Operating Divisions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: 'defense', title: 'Defense Division', desc: 'Heavy ordnance, aerial bomb bodies, mortar assemblies, artillery containers.' },
            { key: 'firearms', title: 'Firearms Division', desc: 'DSA Trushot 9mm pistols, 30 Bore sidearms, 12-GA pump & semi-auto shotguns.' },
            { key: 'aerospace', title: 'Aerospace Division', desc: 'AS9100 Rev D certified airframe hardware, flight-critical titanium brackets.' },
            { key: 'engineering', title: 'Precision Machining', desc: 'Multi-axis CNC milling, turning, deep-hole drilling, metallurgical heat treatment.' },
          ].map((div) => (
            <div key={div.key} className="p-6 bg-[#14161A] border border-[#1C1F24] hover:border-[#C8A24A] transition space-y-3">
              <h3 className="font-display text-xl font-bold uppercase text-white">{div.title}</h3>
              <p className="text-xs text-[#8A9099] leading-relaxed">{div.desc}</p>
              <Link href={`/products?division=${div.key}`} className="font-mono-tech text-xs text-[#C8A24A] inline-block pt-2">
                View Division &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
