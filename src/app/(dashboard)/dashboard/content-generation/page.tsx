
import { ContentGeneratorForm } from "@/components/dashboard/ContentGeneratorForm";

export default function ContentGenerationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Content Generation</h1>
        <p className="text-muted-foreground">
          Leverage AI to automatically create engaging blog posts, social media updates, or even recipe ideas based on your menu.
        </p>
      </div>
      <ContentGeneratorForm />
    </div>
  );
}
