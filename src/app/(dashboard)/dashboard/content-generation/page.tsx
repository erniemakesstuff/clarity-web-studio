
import { ContentGeneratorForm } from "@/components/dashboard/ContentGeneratorForm";

export default function ContentGenerationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Marketing Assistant</h1>
        <p className="text-muted-foreground">
          Leverage AI to get assistance with creating engaging blog posts, social media updates, or recipe ideas based on your menu. You'll then manually post the content.
        </p>
      </div>
      <ContentGeneratorForm />
    </div>
  );
}
