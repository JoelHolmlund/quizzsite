import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Lightbulb, Users, Zap } from 'lucide-react'

export const metadata = {
  title: 'Om oss – TentaKung',
  description: 'Lär känna historien bakom TentaKung och grundaren Joel Holmlund.',
}

export default function OmOssPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <header className="border-b bg-white/60 dark:bg-gray-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="bg-violet-600 text-white p-1.5 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <span>TentaKung</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Logga in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">Kom igång gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-20 space-y-20">
        <section className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">Om oss</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            Vår Vision
          </h1>
          <p className="text-xl text-muted-foreground">
            Välkommen till Tentakung.com – skapat av studenter, för studenter.
          </p>
        </section>

        <section className="rounded-3xl border bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-64 shrink-0 w-full">
              <Image
                src="/joel-holmlund.png"
                alt="Joel Holmlund, grundare av TentaKung"
                width={400}
                height={400}
                className="w-full h-64 md:h-full object-cover"
                priority
              />
            </div>
            <div className="flex-1 p-8 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Joel Holmlund</h2>
                <p className="text-sm text-violet-600 font-medium">Grundare &amp; student</p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Jag som grundade denna plattform är själv student, och jag vet precis hur det känns när tentaperioden närmar sig.
                Stressen över oändliga PDF-filer, kompendier och föreläsningsanteckningar kan ibland kännas övermäktig.
                Jag insåg att det saknades ett modernt verktyg som faktiskt förstår hur vi studerar idag.
              </p>
            </div>
          </div>
          <div className="border-t bg-violet-50 dark:bg-violet-950/30 px-8 py-6">
            <blockquote className="text-gray-700 dark:text-gray-300 italic leading-relaxed text-base md:text-lg">
              &ldquo;Jag skapade Tentakung för att jag ville bygga det verktyg jag själv saknade: en plats där teknik och pedagogik möts
              för att göra plugget mindre ångestladdat och mer effektivt. Visionen är att ingen student ska behöva sitta ensam med
              sina anteckningar – tillsammans kan vi göra vägen till tentan både snabbare och roligare.&rdquo;
            </blockquote>
            <p className="mt-3 text-sm font-semibold text-violet-600">— Joel Holmlund</p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vad vi bygger</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Vårt mål är enkelt: att ge alla studenter tillgång till ett gratis och kraftfullt verktyg för att bemästra sina kurser.
            Genom att kombinera smart AI med beprovade inlärningsmetoder gör vi det möjligt att förvandla tungt studiematerial till
            interaktiva flashcards och quiz på bara några sekunder.
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kraften i gemenskapen</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Det som gör Tentakung unikt är att vi bygger det tillsammans. Vi tror på att dela med sig av kunskap.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="h-6 w-6 text-violet-600" />,
                title: 'Skapa smidigt',
                desc: 'Ladda upp dina anteckningar eller gamla tentor och låt verktyget sköta grovjobbet.',
              },
              {
                icon: <Lightbulb className="h-6 w-6 text-violet-600" />,
                title: 'Lär dig effektivt',
                desc: 'Använd aktiva inlärningsmetoder för att få kunskapen att fastna på riktigt.',
              },
              {
                icon: <Users className="h-6 w-6 text-violet-600" />,
                title: 'Hjälp andra',
                desc: 'Genom att publicera dina quiz i vårt bibliotek kan andra studenter ta del av din kunskap, samtidigt som du kan hitta färdiga set för just dina kurser.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center rounded-3xl bg-violet-600 text-white px-8 py-14 space-y-5 shadow-xl">
          <h2 className="text-3xl font-bold">Tillsammans blir vi alla Tentakungar.</h2>
          <p className="text-violet-100 text-lg max-w-md mx-auto">
            Gå med idag och börja plugga smartare – gratis.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 font-semibold px-8 mt-2">
              Kom igång nu
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="bg-violet-600 text-white p-1 rounded-md">
              <BookOpen className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">TentaKung</span>
          </div>
          <p>tentakung.com</p>
        </div>
      </footer>
    </div>
  )
}
