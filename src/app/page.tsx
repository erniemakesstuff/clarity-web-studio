
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";
import Link from "next/link";
import Image from "next/image";
import { Zap, BarChart, UploadCloud, UtensilsCrossed, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-background to-secondary">
          <div className="container mx-auto px-6 text-center">
            <UtensilsCrossed className="mx-auto h-16 w-16 text-primary mb-6" />
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Welcome to Clarity Menu
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Transform your restaurant's menu into an interactive digital experience with AI-powered insights and marketing tools.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild>
                <Link href="/menu/JY2NyRbbjOosr7bDzQywJG7-BhQh29g-w6NQQoyr2k8/TESTMENU0">View Demo Menu</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/signin">Menu Portal</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-foreground mb-12">
              Features at a Glance
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Zap className="h-10 w-10 text-primary" />}
                title="Interactive Digital Menu"
                description="Engage customers with a beautiful, easy-to-navigate digital menu, accessible on any device."
              />
              <FeatureCard
                icon={<BarChart className="h-10 w-10 text-primary" />}
                title="AI Upsell Suggestions"
                description="Boost revenue with intelligent upsell recommendations tailored to customer choices."
              />
              <FeatureCard
                icon={<UploadCloud className="h-10 w-10 text-primary" />}
                title="Easy Menu Upload"
                description="Simply upload an image of your menu, and let our AI digitize it for you."
              />
              <FeatureCard
                icon={<Sparkles className="h-10 w-10 text-primary" />}
                title="WIP: AI Marketing Assistant"
                description="Get AI assistance drafting marketing content (e.g., blog posts, social media updates). This feature is currently in development."
              />
            </div>
          </div>
        </section>

        {/* How it works / Image section */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <Image
                src="https://placehold.co/600x400.png"
                alt="Clarity Menu Dashboard Preview"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                data-ai-hint="dashboard interface"
              />
            </div>
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Effortless Management, Powerful Results
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Our intuitive dashboard provides you with actionable insights into menu performance, upsell effectiveness, and customer preferences. Manage your digital menu, get help drafting marketing materials, and watch your restaurant grow.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center"><Zap size={20} className="text-primary mr-2"/> Track trending items and popular choices.</li>
                <li className="flex items-center"><BarChart size={20} className="text-primary mr-2"/> Monitor upsell conversion rates and optimize suggestions.</li>
                <li className="flex items-center"><Sparkles size={20} className="text-primary mr-2"/> Draft marketing content with AI assistance (WIP).</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t bg-background">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} Clarity Menu. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-2xl font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
