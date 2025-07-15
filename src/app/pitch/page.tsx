
"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from '@/components/layout/AppHeader';
import { Zap, BarChart, UploadCloud, Sparkles, CheckCircle, Phone, Mail } from "lucide-react";

// --- Data for Templating ---
interface PitchData {
  restaurantName: string;
  restaurantLocation: string;
  cuisineType: string;
  headline: string;
  subheadline: string;
}

const pitchDecks: Record<string, PitchData> = {
  "the-corner-bistro": {
    restaurantName: "The Corner Bistro",
    restaurantLocation: "Manchester",
    cuisineType: "Modern European",
    headline: "For The Corner Bistro in Manchester: Stop Worrying About Fines, Start Growing Your Modern European Restaurant.",
    subheadline: "Clarity Menu turns your paper menu into a smart digital version that handles allergen compliance, boosts upsells, and runs automated marketing, so you can focus on what you do best: crafting incredible food.",
  },
  "seaside-eats": {
    restaurantName: "Seaside Eats",
    restaurantLocation: "Brighton",
    cuisineType: "Seafood",
    headline: "Helping Seaside Eats Turn Their Busy Seafood Kitchen into a Digital Powerhouse.",
    subheadline: "Clarity Menu turns your paper menu into a smart digital version that handles allergen compliance, boosts upsells, and runs automated marketing, so you can focus on what you do best: serving the freshest seafood in Brighton.",
  }
};

const defaultPitchData: PitchData = {
  restaurantName: "Your Restaurant",
  restaurantLocation: "Your Town",
  cuisineType: "Restaurant",
  headline: "Stop Worrying About Fines, Start Growing Your Restaurant. Effortlessly.",
  subheadline: "Clarity Menu turns your paper menu into a smart digital version that handles allergen compliance, boosts upsells, and runs automated marketing, so you can focus on what you do best: cooking incredible food.",
};
// --- End Data ---


function FeatureCard({ icon, title, description, imageUrl, imageHint }: { icon: React.ReactNode; title: string; description: string; imageUrl: string; imageHint: string; }) {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border flex flex-col">
       <div className="relative w-full h-40 mb-4 rounded-md overflow-hidden">
         <Image src={imageUrl} alt={title} layout="fill" objectFit="cover" data-ai-hint={imageHint} />
      </div>
      <div className="mb-4">{icon}</div>
      <h3 className="text-2xl font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground flex-grow">{description}</p>
    </div>
  );
}

function PitchPageContent() {
  const searchParams = useSearchParams();
  const pitchId = searchParams.get('pitchId');

  const data = useMemo(() => {
    return (pitchId && pitchDecks[pitchId]) ? pitchDecks[pitchId] : defaultPitchData;
  }, [pitchId]);

  return (
     <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow">

        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-background via-secondary/50 to-secondary">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              {data.headline}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {data.subheadline}
            </p>
            <div className="flex justify-center items-center mb-10">
                <div className="w-full max-w-2xl aspect-video bg-gray-900 rounded-lg shadow-2xl flex items-center justify-center text-center text-white p-4">
                    <p className="text-lg">[Stunning 15-20s video showing a chef's journey from stress to success with Clarity Menu]</p>
                </div>
            </div>
            <Button size="lg" asChild className="text-lg px-10 py-6">
              <Link href="#demo">See How {data.restaurantName} Can Grow</Link>
            </Button>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-16 bg-background">
            <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold text-foreground mb-6">The Problem You Face Every Day (and How We Solve It)</h2>
                    <p className="text-lg text-muted-foreground mb-4">As a passionate {data.cuisineType.toLowerCase()} chef at {data.restaurantName}, you pour your heart into every dish, but the endless paperwork, the fear of fines, and the constant struggle to get more diners through the door can be overwhelming. You don't have a dedicated marketing team or IT support. You need a solution that just works.</p>
                    <p className="text-lg text-muted-foreground font-semibold">That's exactly why we built Clarity Menu. It's designed specifically for independent restaurants like yours, empowering you with the tools of large chains, without the complexity or cost.</p>
                </div>
                <div>
                     <Image src="https://placehold.co/600x400.png" alt="A distressed chef surrounded by paperwork" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="stressed chef" />
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 bg-secondary">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-foreground mb-12">Clarity Menu: Your All-in-One Growth Engine</h2>
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                <FeatureCard 
                    icon={<Zap className="h-10 w-10 text-primary" />} 
                    title="Turn Browsers into Buyers & Boost Your Average Spend." 
                    description="Imagine a menu that's always up-to-date, stunning on any device, and intelligently suggests additional items to your customers – increasing your revenue with every order. Our AI Upsell Suggestions learn from your sales data to recommend exactly what your customers are most likely to add."
                    imageUrl="https://placehold.co/600x400.png"
                    imageHint="digital menu"
                />
                <FeatureCard 
                    icon={<UploadCloud className="h-10 w-10 text-primary" />} 
                    title="Say Goodbye to Allergen Worries, Hello to Peace of Mind." 
                    description="No more manual data entry or sleepless nights worrying about allergen compliance. Just snap a photo of your existing menu, and our AI instantly digitizes it and tags all allergens in line with FSA guidance. You're protected, and your customers are safe."
                    imageUrl="https://placehold.co/600x400.png"
                    imageHint="allergen compliance"
                />
                <FeatureCard 
                    icon={<Sparkles className="h-10 w-10 text-primary" />} 
                    title="Your Personal Marketing Guru, 24/7." 
                    description="Struggling for content ideas? Our AI Marketing Assistant helps you draft compelling blog posts, social media updates, and promotions in minutes, bringing new diners to your door without you lifting a finger."
                    imageUrl="https://placehold.co/600x400.png"
                    imageHint="marketing content"
                />
                <FeatureCard 
                    icon={<BarChart className="h-10 w-10 text-primary" />} 
                    title="Understand Your Business, Make Smarter Decisions." 
                    description="Our intuitive dashboard gives you actionable insights into your menu's performance, what's selling, what's not, and how effective your upsells are. Manage everything from one place and watch your restaurant grow."
                    imageUrl="https://placehold.co/600x400.png"
                    imageHint="analytics dashboard"
                />
            </div>
          </div>
        </section>

        {/* Differentiators Section */}
        <section className="py-16 bg-background">
             <div className="container mx-auto px-6 text-center">
                 <h2 className="text-4xl font-bold text-foreground mb-12">What Makes Clarity Menu Truly Different?</h2>
                 <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="p-6 border rounded-lg">
                        <h3 className="text-2xl font-semibold mb-2">Built for {data.restaurantName}'s Success</h3>
                        <p className="text-muted-foreground">Specifically designed for independent {data.cuisineType.toLowerCase()} restaurants like yours, who need powerful tools without complex tech.</p>
                    </div>
                     <div className="p-6 border-2 border-primary rounded-lg shadow-lg">
                        <h3 className="text-2xl font-semibold mb-2">Zero Training, Pure Growth</h3>
                        <p className="text-muted-foreground">No complicated staff training. Just snap, upload, and watch your business grow. It's that simple.</p>
                    </div>
                     <div className="p-6 border rounded-lg">
                        <h3 className="text-2xl font-semibold mb-2">The Power of All-in-One</h3>
                        <p className="text-muted-foreground">The only solution that truly combines allergen compliance + upselling + marketing in one seamless workflow.</p>
                    </div>
                 </div>
             </div>
        </section>

         {/* Demo Section */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-foreground mb-12">See Clarity Menu in Action: A Sneak Peek</h2>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="space-y-4">
                 <h3 className="text-xl font-semibold">The Customer Experience</h3>
                 <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-white"><p>[Video 1: Customer View]</p></div>
              </div>
               <div className="space-y-4">
                 <h3 className="text-xl font-semibold">Behind the Scenes: Menu & Allergen Magic</h3>
                 <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-white"><p>[Video 2: Upload & Tagging]</p></div>
              </div>
              <div className="space-y-4">
                 <h3 className="text-xl font-semibold">Dashboard Insights</h3>
                 <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-white"><p>[Video 3: Analytics]</p></div>
              </div>
            </div>
          </div>
        </section>
        
         {/* Early Adopter Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Ready to Be a Trailblazer?</h2>
              <p className="text-lg text-muted-foreground mb-4">We're launching something truly special, and we're looking for forward-thinking restaurants like {data.restaurantName} to be among our first partners in {data.restaurantLocation}. Our core product is live and robust, and by joining us now, you'll get:</p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-primary flex-shrink-0" /> <div><strong>Early Influence:</strong> A direct say in future features.</div></li>
                <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-primary flex-shrink-0" /> <div><strong>Pioneer Advantage:</strong> Be among the first in {data.restaurantLocation}.</div></li>
                <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-primary flex-shrink-0" /> <div><strong>Dedicated Support:</strong> Personalized attention as we grow together.</div></li>
              </ul>
            </div>
            <div>
              <Image src="https://placehold.co/600x400.png" alt="Two people shaking hands over a business deal" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="business partnership" />
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section id="demo" className="py-20 bg-secondary">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">Ready for {data.restaurantName} to Grow, Protect Your Business, and Simplify Your Life?</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
              <Button size="lg" className="text-lg px-8 py-6">Book Your Personalized Demo</Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">Watch a Quick Overview Video</Button>
            </div>
          </div>
        </section>

      </main>
      <footer className="py-8 border-t bg-background">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <div className="flex justify-center items-center gap-6 mb-4">
              <Link href="mailto:contact@claritymenu.com" className="flex items-center gap-2 hover:text-primary"><Mail className="h-5 w-5"/> contact@claritymenu.com</Link>
              <Link href="tel:+440123456789" className="flex items-center gap-2 hover:text-primary"><Phone className="h-5 w-5"/> 0123 456 789</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Clarity Menu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Suspense boundary is good practice when using useSearchParams
export default function PitchPage() {
    return (
        <Suspense fallback={<div>Loading Pitch...</div>}>
            <PitchPageContent />
        </Suspense>
    )
}

    